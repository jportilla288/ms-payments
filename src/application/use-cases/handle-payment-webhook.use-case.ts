import { Inject, Injectable, Logger } from '@nestjs/common';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { Transaction } from '../../domain/models/transaction.model';
import { TransactionStatusEnum } from '../../domain/resources/transaction-status.enum';
import { WebhookSignatureService } from '../../domain/services/webhook-signature.service';
import { TRANSACTION_REPOSITORY_PORT } from '../ports/transaction-repository.port';
import type { TransactionRepositoryPort } from '../ports/transaction-repository.port';
import { WEBHOOK_SECRET } from '../ports/webhook-secret.port';
import { TransactionFulfillmentService } from '../services/transaction-fulfillment.service';

export interface PaymentWebhookEvent {
  readonly event?: string;
  readonly data?: {
    readonly transaction?: {
      readonly id?: string;
      readonly reference?: string;
      readonly status?: string;
      readonly status_message?: string | null;
    };
  };
  readonly signature?: {
    readonly properties?: string[];
    readonly checksum?: string;
  };
  readonly timestamp?: number | string;
}

const KNOWN_STATUSES = new Set<string>(Object.values(TransactionStatusEnum));

/**
 * Asynchronous counterpart of ProcessPaymentUseCase.
 *
 * The gateway calls this when a transaction changes state. The signature is
 * verified before anything is persisted, and events for transactions that are
 * already final are acknowledged without being reapplied (idempotency).
 */
@Injectable()
export class HandlePaymentWebhookUseCase {
  private readonly logger = new Logger(HandlePaymentWebhookUseCase.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY_PORT)
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly fulfillment: TransactionFulfillmentService,
    @Inject(WEBHOOK_SECRET)
    private readonly eventsSecret: string,
  ) {}

  execute(
    event: PaymentWebhookEvent,
  ): ResultAsync<Transaction | null, DomainError> {
    return this.verifySignature(event)
      .andThen(() => this.loadTransaction(event))
      .andThen((transaction) => {
        if (transaction === null || transaction.isFinalized()) {
          // Nothing to do, but the event must still be acknowledged with 200
          // so the gateway stops retrying.
          return okAsync(transaction);
        }

        return this.fulfillment.apply(transaction, {
          status: this.mapStatus(event.data?.transaction?.status),
          gatewayTransactionId: event.data?.transaction?.id ?? null,
          statusMessage: event.data?.transaction?.status_message ?? null,
        });
      });
  }

  private verifySignature(
    event: PaymentWebhookEvent,
  ): ResultAsync<true, DomainError> {
    const properties = event.signature?.properties;
    const checksum = event.signature?.checksum;
    const timestamp = event.timestamp;

    if (!properties?.length || !checksum || timestamp === undefined) {
      return errAsync(DomainError.invalidWebhookSignature());
    }

    const isValid = WebhookSignatureService.isValid(
      event.data,
      properties,
      timestamp,
      this.eventsSecret,
      checksum,
    );

    if (!isValid) {
      this.logger.warn('Rejected a webhook with an invalid signature.');
      return errAsync(DomainError.invalidWebhookSignature());
    }

    return okAsync(true as const);
  }

  private loadTransaction(
    event: PaymentWebhookEvent,
  ): ResultAsync<Transaction | null, DomainError> {
    const reference = event.data?.transaction?.reference;

    if (!reference) {
      return okAsync(null);
    }

    return this.transactionRepository.findByReference(reference);
  }

  private mapStatus(rawStatus: string | undefined): TransactionStatusEnum {
    return rawStatus !== undefined && KNOWN_STATUSES.has(rawStatus)
      ? (rawStatus as TransactionStatusEnum)
      : TransactionStatusEnum.ERROR;
  }
}
