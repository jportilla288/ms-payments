import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiResponseDto } from '../dtos/api-response.dto';
import { of } from 'rxjs';
import {
  buildErrorEnvelope,
  buildSuccessEnvelope,
} from '../dtos/api-response.dto';
import { ResponseEnvelopeExceptionFilter } from './response-envelope.filter';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

describe('response envelope', () => {
  describe('buildSuccessEnvelope', () => {
    it('counts the items of an array payload', () => {
      const envelope = buildSuccessEnvelope([{ id: 1 }, { id: 2 }]);

      expect(envelope.totalItemsReturned).toBe(2);
      expect(envelope.totalItemsInDataBase).toBe(2);
      expect(envelope.isSuccess).toBe(true);
      expect(envelope.hasErrors).toBe(false);
      expect(envelope.errors).toEqual([]);
    });

    it('counts a single object as one item', () => {
      expect(buildSuccessEnvelope({ id: 1 }).totalItemsReturned).toBe(1);
    });

    it('counts an empty payload as zero items', () => {
      expect(buildSuccessEnvelope(null).totalItemsReturned).toBe(0);
    });
  });

  describe('buildErrorEnvelope', () => {
    it('flags the response as failed', () => {
      const envelope = buildErrorEnvelope([
        { code: 'X', message: 'boom', details: null },
      ]);

      expect(envelope.result).toBeNull();
      expect(envelope.isSuccess).toBe(false);
      expect(envelope.hasErrors).toBe(true);
      expect(envelope.errors).toHaveLength(1);
    });
  });

  describe('ResponseEnvelopeInterceptor', () => {
    it('wraps the controller payload', (done) => {
      const interceptor = new ResponseEnvelopeInterceptor();
      const next = { handle: () => of([{ id: 1 }]) };

      interceptor.intercept({} as never, next).subscribe((envelope) => {
        expect(envelope.isSuccess).toBe(true);
        expect(envelope.totalItemsReturned).toBe(1);
        done();
      });
    });
  });

  describe('ResponseEnvelopeExceptionFilter', () => {
    const envelopeOf = (json: jest.Mock): ApiResponseDto<null> =>
      (json.mock.calls as unknown[][])[0][0] as ApiResponseDto<null>;

    const buildHost = () => {
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const host = {
        switchToHttp: () => ({ getResponse: () => ({ status }) }),
      };
      return { host, status, json };
    };

    it('maps a domain exception to the envelope', () => {
      const { host, status, json } = buildHost();

      new ResponseEnvelopeExceptionFilter().catch(
        new HttpException(
          {
            code: 'PRODUCT_NOT_FOUND',
            message: 'missing',
            details: { id: '1' },
          },
          HttpStatus.NOT_FOUND,
        ),
        host as never,
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuccess: false,
          hasErrors: true,
          errors: [
            {
              code: 'PRODUCT_NOT_FOUND',
              message: 'missing',
              details: { id: '1' },
            },
          ],
        }),
      );
    });

    it('expands validation errors into one entry per field', () => {
      const { host, json } = buildHost();

      new ResponseEnvelopeExceptionFilter().catch(
        new HttpException(
          { message: ['email must be an email', 'quantity must be positive'] },
          HttpStatus.BAD_REQUEST,
        ),
        host as never,
      );

      expect(envelopeOf(json).errors).toHaveLength(2);
      expect(envelopeOf(json).errors[0].code).toBe('VALIDATION_ERROR');
    });

    it('handles an exception whose body is a plain string', () => {
      const { host, json } = buildHost();

      new ResponseEnvelopeExceptionFilter().catch(
        new HttpException('Forbidden resource', HttpStatus.FORBIDDEN),
        host as never,
      );

      expect(envelopeOf(json).errors[0]).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Forbidden resource',
        details: null,
      });
    });

    it('falls back to the exception message when the body has no message', () => {
      const { host, json } = buildHost();

      new ResponseEnvelopeExceptionFilter().catch(
        new HttpException({ code: 'X' }, HttpStatus.BAD_REQUEST),
        host as never,
      );

      expect(envelopeOf(json).errors[0].code).toBe('X');
    });

    it('hides the detail of unexpected exceptions', () => {
      const { host, status, json } = buildHost();

      new ResponseEnvelopeExceptionFilter().catch(
        new Error('secret'),
        host as never,
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(envelopeOf(json).errors[0].code).toBe('INTERNAL_ERROR');
      expect(envelopeOf(json).errors[0].message).not.toContain('secret');
    });
  });
});
