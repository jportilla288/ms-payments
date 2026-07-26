import { Inject, Injectable } from '@nestjs/common';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { Transaction } from '../../domain/models/transaction.model';
import { TRANSACTION_REPOSITORY_PORT } from '../ports/transaction-repository.port';
import type { TransactionRepositoryPort } from '../ports/transaction-repository.port';

@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
  ) {}

  execute(transactionId: string): ResultAsync<Transaction, DomainError> {
    return this.transactionRepository
      .findById(transactionId)
      .andThen((transaction) =>
        transaction === null
          ? errAsync(DomainError.transactionNotFound(transactionId))
          : okAsync(transaction),
      );
  }
}
