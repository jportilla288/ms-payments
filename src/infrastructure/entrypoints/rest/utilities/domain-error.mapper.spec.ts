import { HttpStatus } from '@nestjs/common';
import { toHttpStatus } from './domain-error.mapper';
import { DomainError } from '../../../../domain/errors/domain-error';

describe('toHttpStatus', () => {
  it.each([
    [DomainError.productNotFound('p'), HttpStatus.NOT_FOUND],
    [DomainError.transactionNotFound('t'), HttpStatus.NOT_FOUND],
    [DomainError.insufficientStock(0, 1), HttpStatus.CONFLICT],
    [DomainError.transactionAlreadyFinalized('APPROVED'), HttpStatus.CONFLICT],
    [DomainError.invalidCard('bad'), HttpStatus.UNPROCESSABLE_ENTITY],
    [DomainError.invalidQuantity(0), HttpStatus.UNPROCESSABLE_ENTITY],
    [DomainError.invalidWebhookSignature(), HttpStatus.UNAUTHORIZED],
    [DomainError.gateway('down'), HttpStatus.BAD_GATEWAY],
    [DomainError.persistence('down'), HttpStatus.INTERNAL_SERVER_ERROR],
  ])('maps %o to its HTTP status', (error, expected) => {
    expect(toHttpStatus(error)).toBe(expected);
  });

  it('falls back to 500 for a code that has no explicit mapping', () => {
    expect(toHttpStatus({ code: 'SOMETHING_NEW' } as never)).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });
});
