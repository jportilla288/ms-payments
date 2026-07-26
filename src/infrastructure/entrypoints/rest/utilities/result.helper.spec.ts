import { HttpException, HttpStatus } from '@nestjs/common';
import { errAsync, okAsync } from 'neverthrow';
import { unwrapOrThrow } from './result.helper';
import { DomainError } from '../../../../domain/errors/domain-error';

describe('unwrapOrThrow', () => {
  it('returns the value on the success track', async () => {
    await expect(unwrapOrThrow(okAsync({ id: 1 }))).resolves.toEqual({ id: 1 });
  });

  it('throws an HttpException carrying the domain code', async () => {
    expect.assertions(3);

    try {
      await unwrapOrThrow(errAsync(DomainError.productNotFound('prod-1')));
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({ code: 'PRODUCT_NOT_FOUND' }),
      );
    }
  });

  it('normalises a missing details field to null', async () => {
    expect.assertions(1);

    try {
      await unwrapOrThrow(errAsync(DomainError.invalidWebhookSignature()));
    } catch (error) {
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({ details: null }),
      );
    }
  });
});
