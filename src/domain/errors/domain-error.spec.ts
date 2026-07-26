import { DomainError, DomainErrorCode } from './domain-error';

describe('DomainError', () => {
  it('builds a product not found error carrying the id', () => {
    const error = DomainError.productNotFound('prod-1');

    expect(error.code).toBe(DomainErrorCode.PRODUCT_NOT_FOUND);
    expect(error.message).toContain('prod-1');
    expect(error.details).toEqual({ productId: 'prod-1' });
  });

  it('builds a transaction not found error', () => {
    expect(DomainError.transactionNotFound('tx-1').code).toBe(
      DomainErrorCode.TRANSACTION_NOT_FOUND,
    );
  });

  it('reports available and requested units on insufficient stock', () => {
    const error = DomainError.insufficientStock(2, 5);

    expect(error.code).toBe(DomainErrorCode.INSUFFICIENT_STOCK);
    expect(error.details).toEqual({ available: 2, requested: 5 });
  });

  it('builds an invalid quantity error', () => {
    expect(DomainError.invalidQuantity(0).code).toBe(DomainErrorCode.INVALID_QUANTITY);
  });

  it('builds an invalid card error with the given reason', () => {
    expect(DomainError.invalidCard('bad luhn').message).toBe('bad luhn');
  });

  it('builds an already finalized error', () => {
    const error = DomainError.transactionAlreadyFinalized('APPROVED');

    expect(error.code).toBe(DomainErrorCode.TRANSACTION_ALREADY_FINALIZED);
    expect(error.details).toEqual({ status: 'APPROVED' });
  });

  it('builds an invalid webhook signature error without leaking details', () => {
    const error = DomainError.invalidWebhookSignature();

    expect(error.code).toBe(DomainErrorCode.INVALID_WEBHOOK_SIGNATURE);
    expect(error.details).toBeUndefined();
  });

  it('builds gateway and persistence errors', () => {
    expect(DomainError.gateway('down', { httpStatus: 503 }).details).toEqual({
      httpStatus: 503,
    });
    expect(DomainError.persistence('closed').code).toBe(
      DomainErrorCode.PERSISTENCE_ERROR,
    );
  });
});
