import { Inject, Injectable } from '@nestjs/common';
import { ResultAsync, okAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { Transaction } from '../../domain/models/transaction.model';
import { DeliveryStatusEnum } from '../../domain/resources/delivery-status.enum';
import { TransactionStatusEnum } from '../../domain/resources/transaction-status.enum';
import { DELIVERY_REPOSITORY_PORT } from '../ports/delivery-repository.port';
import type { DeliveryRepositoryPort } from '../ports/delivery-repository.port';
import { PRODUCT_REPOSITORY_PORT } from '../ports/product-repository.port';
import type { ProductRepositoryPort } from '../ports/product-repository.port';
import { TRANSACTION_REPOSITORY_PORT } from '../ports/transaction-repository.port';
import type { TransactionRepositoryPort } from '../ports/transaction-repository.port';

export interface GatewayOutcome {
  readonly status: TransactionStatusEnum;
  readonly gatewayTransactionId: string | null;
  readonly statusMessage: string | null;
}

/**
 * Applies a gateway outcome to a transaction.
 *
 * Shared by the synchronous payment flow and by the asynchronous webhook, so
 * the "assign delivery + decrement stock" rule lives in exactly one place.
 */
@Injectable()
export class TransactionFulfillmentService {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
    @Inject(DELIVERY_REPOSITORY_PORT)
    private readonly deliveryRepository: DeliveryRepositoryPort,
  ) {}

  apply(
    transaction: Transaction,
    outcome: GatewayOutcome,
  ): ResultAsync<Transaction, DomainError> {
    return this.transactionRepository
      .updateStatus({
        transactionId: transaction.transactionId,
        status: outcome.status,
        wompiTransactionId: outcome.gatewayTransactionId,
        statusMessage: outcome.statusMessage,
      })
      .andThen((updated) =>
        updated.wasApproved()
          ? this.fulfill(transaction).map(() => updated)
          : okAsync(updated),
      );
  }

  /** Steps 5.3.2 and 5.3.3: assign the product and update the stock. */
  private fulfill(transaction: Transaction): ResultAsync<unknown, DomainError> {
    return this.productRepository
      .decrementStock(transaction.productId, transaction.quantity)
      .andThen(() =>
        this.deliveryRepository.updateStatus(
          transaction.transactionId,
          DeliveryStatusEnum.ASSIGNED,
        ),
      );
  }
}
