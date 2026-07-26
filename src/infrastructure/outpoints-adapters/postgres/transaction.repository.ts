import { Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import {
  CreateTransactionCommand,
  TransactionRepositoryPort,
  UpdateTransactionStatusCommand,
} from '../../../application/ports/transaction-repository.port';
import { DomainError } from '../../../domain/errors/domain-error';
import { Transaction } from '../../../domain/models/transaction.model';
import { TransactionStatusEnum } from '../../../domain/resources/transaction-status.enum';
import { PrismaService } from './prisma.service';
import { fromPrisma } from './persistence.helper';
import { toTransactionModel } from './prisma.mappers';

@Injectable()
export class PostgresTransactionRepository implements TransactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  create(
    command: CreateTransactionCommand,
  ): ResultAsync<Transaction, DomainError> {
    return fromPrisma(
      this.prisma.transaction.create({
        data: {
          reference: command.reference,
          paymentDescription: command.paymentDescription,
          status: TransactionStatusEnum.PENDING,
          quantity: command.quantity,
          productAmountInCents: command.amounts.productAmountInCents,
          baseFeeInCents: command.amounts.baseFeeInCents,
          deliveryFeeInCents: command.amounts.deliveryFeeInCents,
          amountInCents: command.amounts.amountInCents,
          cardBrand: command.cardBrand,
          cardLastFour: command.cardLastFour,
          customerId: command.customerId,
          productId: command.productId,
        },
      }),
      'Unable to create transaction',
    ).map(toTransactionModel);
  }

  findById(
    transactionId: string,
  ): ResultAsync<Transaction | null, DomainError> {
    return fromPrisma(
      this.prisma.transaction.findUnique({ where: { transactionId } }),
      'Unable to load transaction',
    ).map((row) => (row === null ? null : toTransactionModel(row)));
  }

  findByReference(
    reference: string,
  ): ResultAsync<Transaction | null, DomainError> {
    return fromPrisma(
      this.prisma.transaction.findUnique({ where: { reference } }),
      'Unable to load transaction by reference',
    ).map((row) => (row === null ? null : toTransactionModel(row)));
  }

  updateStatus(
    command: UpdateTransactionStatusCommand,
  ): ResultAsync<Transaction, DomainError> {
    return fromPrisma(
      this.prisma.transaction.update({
        where: { transactionId: command.transactionId },
        data: {
          status: command.status,
          wompiTransactionId: command.wompiTransactionId ?? undefined,
          statusMessage: command.statusMessage ?? undefined,
        },
      }),
      'Unable to update transaction status',
    ).map(toTransactionModel);
  }
}
