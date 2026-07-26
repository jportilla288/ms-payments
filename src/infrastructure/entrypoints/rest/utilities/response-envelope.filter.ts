import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorDto, buildErrorEnvelope } from '../dtos/api-response.dto';

const UNEXPECTED_ERROR_CODE = 'INTERNAL_ERROR';
const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR';

interface DomainExceptionBody {
  code?: string;
  message?: string | string[];
  details?: Record<string, unknown> | null;
}

/**
 * Turns any thrown exception into the standard envelope, so clients never see
 * two different error shapes.
 */
@Catch()
export class ResponseEnvelopeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ResponseEnvelopeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error('Unhandled exception', exception as Error);
    }

    response.status(status).json(buildErrorEnvelope(this.toApiErrors(exception)));
  }

  private toApiErrors(exception: unknown): ApiErrorDto[] {
    if (!(exception instanceof HttpException)) {
      return [
        {
          code: UNEXPECTED_ERROR_CODE,
          message: 'An unexpected error occurred.',
          details: null,
        },
      ];
    }

    const body = exception.getResponse();

    if (typeof body === 'string') {
      return [{ code: UNEXPECTED_ERROR_CODE, message: body, details: null }];
    }

    const { code, message, details } = body as DomainExceptionBody;

    // ValidationPipe reports one entry per invalid field.
    if (Array.isArray(message)) {
      return message.map((entry) => ({
        code: VALIDATION_ERROR_CODE,
        message: entry,
        details: null,
      }));
    }

    return [
      {
        code: code ?? VALIDATION_ERROR_CODE,
        message: message ?? exception.message,
        details: details ?? null,
      },
    ];
  }
}
