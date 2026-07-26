import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import {
  AmountBreakdown,
  Transaction,
} from '../../domain/models/transaction.model';
import { CardBrandEnum } from '../../domain/resources/card-brand.enum';
import { TransactionStatusEnum } from '../../domain/resources/transaction-status.enum';

export const TRANSACTION_REPOSITORY_PORT = Symbol(
  'TRANSACTION_REPOSITORY_PORT',
);

export interface CreateTransactionCommand {
  readonly reference: string;
  readonly paymentDescription: string;
  readonly quantity: number;
  readonly amounts: AmountBreakdown;
  readonly customerId: string;
  readonly productId: string;
  readonly cardBrand: CardBrandEnum;
  readonly cardLastFour: string;
}

export interface UpdateTransactionStatusCommand {
  readonly transactionId: string;
  readonly status: TransactionStatusEnum;
  readonly wompiTransactionId?: string | null;
  readonly statusMessage?: string | null;
}

export interface TransactionRepositoryPort {
  create(
    command: CreateTransactionCommand,
  ): ResultAsync<Transaction, DomainError>;
  findById(transactionId: string): ResultAsync<Transaction | null, DomainError>;
  findByReference(
    reference: string,
  ): ResultAsync<Transaction | null, DomainError>;
  updateStatus(
    command: UpdateTransactionStatusCommand,
  ): ResultAsync<Transaction, DomainError>;
}
