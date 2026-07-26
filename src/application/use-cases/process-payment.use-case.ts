import { Inject, Injectable, Logger } from '@nestjs/common';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { Transaction } from '../../domain/models/transaction.model';
import { TransactionStatusEnum } from '../../domain/resources/transaction-status.enum';
import { CUSTOMER_REPOSITORY_PORT } from '../ports/customer-repository.port';
import type { CustomerRepositoryPort } from '../ports/customer-repository.port';
import { PAYMENT_GATEWAY_PORT } from '../ports/payment-gateway.port';
import type {
  CardDetails,
  PaymentGatewayPort,
} from '../ports/payment-gateway.port';
import { TRANSACTION_REPOSITORY_PORT } from '../ports/transaction-repository.port';
import type { TransactionRepositoryPort } from '../ports/transaction-repository.port';
import {
  GatewayOutcome,
  TransactionFulfillmentService,
} from '../services/transaction-fulfillment.service';

export interface ProcessPaymentInput {
  readonly transactionId: string;
  readonly card: CardDetails;
  readonly installments: number;
}

/**
 * Steps 5.2 and 5.3 of the business process.
 *
 * Charges the gateway and hands the outcome to the fulfillment service, which
 * assigns the delivery and decrements stock when the charge is approved.
 * Written as a Railway Oriented pipeline: no exceptions, only tracks.
 */
@Injectable()
export class ProcessPaymentUseCase {
  private readonly logger = new Logger(ProcessPaymentUseCase.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(CUSTOMER_REPOSITORY_PORT)
    private readonly customerRepository: CustomerRepositoryPort,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly fulfillment: TransactionFulfillmentService,
  ) {}

  execute(input: ProcessPaymentInput): ResultAsync<Transaction, DomainError> {
    return this.loadPendingTransaction(input.transactionId)
      .andThen((transaction) =>
        this.charge(transaction, input).map((outcome) => ({
          transaction,
          outcome,
        })),
      )
      .andThen(({ transaction, outcome }) =>
        this.fulfillment.apply(transaction, outcome),
      );
  }

  private loadPendingTransaction(
    transactionId: string,
  ): ResultAsync<Transaction, DomainError> {
    return this.transactionRepository
      .findById(transactionId)
      .andThen((transaction) => {
        if (transaction === null) {
          return errAsync(DomainError.transactionNotFound(transactionId));
        }
        if (transaction.isFinalized()) {
          return errAsync(
            DomainError.transactionAlreadyFinalized(transaction.status),
          );
        }
        return okAsync(transaction);
      });
  }

  private charge(
    transaction: Transaction,
    input: ProcessPaymentInput,
  ): ResultAsync<GatewayOutcome, DomainError> {
    return this.customerRepository
      .findById(transaction.customerId)
      .andThen((customer) =>
        customer === null
          ? errAsync(
              DomainError.persistence(
                'Customer attached to the transaction is missing.',
              ),
            )
          : okAsync(customer.email),
      )
      .andThen((customerEmail) =>
        this.paymentGateway
          .charge({
            reference: transaction.reference,
            amountInCents: transaction.amounts.amountInCents,
            customerEmail,
            installments: input.installments,
            card: input.card,
          })
          .map<GatewayOutcome>((result) => ({
            status: result.status,
            gatewayTransactionId: result.gatewayTransactionId,
            statusMessage: result.statusMessage,
          }))
          .orElse((error) => {
            // A gateway outage must not leave the transaction stuck in PENDING.
            this.logger.error(
              `Gateway failure for ${transaction.reference}: ${error.message}`,
            );
            return okAsync<GatewayOutcome, DomainError>({
              status: TransactionStatusEnum.ERROR,
              gatewayTransactionId: null,
              statusMessage: error.message,
            });
          }),
      );
  }
}
