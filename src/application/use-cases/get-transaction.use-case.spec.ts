import { okAsync } from 'neverthrow';
import { GetTransactionUseCase } from './get-transaction.use-case';
import { DomainErrorCode } from '../../domain/errors/domain-error';
import { aTransaction } from '../../test-support/builders';

describe('GetTransactionUseCase', () => {
  it('returns the transaction when it exists', async () => {
    const repository = { findById: jest.fn().mockReturnValue(okAsync(aTransaction())) };

    const result = await new GetTransactionUseCase(repository as never).execute('tx-1');

    expect(result._unsafeUnwrap().transactionId).toBe('tx-1');
  });

  it('fails when the transaction does not exist', async () => {
    const repository = { findById: jest.fn().mockReturnValue(okAsync(null)) };

    const result = await new GetTransactionUseCase(repository as never).execute('nope');

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.TRANSACTION_NOT_FOUND);
  });
});
