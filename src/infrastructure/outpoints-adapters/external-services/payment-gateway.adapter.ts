import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import {
  CardDetails,
  ChargeCommand,
  ChargeResult,
  PaymentGatewayPort,
} from '../../../application/ports/payment-gateway.port';
import { DomainError } from '../../../domain/errors/domain-error';
import { CURRENCY } from '../../../domain/resources/fees.constants';
import { TransactionStatusEnum } from '../../../domain/resources/transaction-status.enum';
import { PaymentGatewayConfig } from './payment-gateway.config';

interface AcceptanceTokenResponse {
  data: { presigned_acceptance: { acceptance_token: string } };
}

interface CardTokenResponse {
  data: { id: string };
}

interface GatewayTransactionResponse {
  data: { id: string; status: string; status_message?: string | null };
}

const KNOWN_STATUSES = new Set<string>(Object.values(TransactionStatusEnum));

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Outbound adapter for the card payment provider.
 *
 * Implements the full sandbox handshake: acceptance token, card tokenisation,
 * signed transaction creation and status polling. Raw card data lives only in
 * memory for the duration of the tokenisation call and is never persisted.
 */
@Injectable()
export class WompiPaymentGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(WompiPaymentGatewayAdapter.name);

  constructor(private readonly config: PaymentGatewayConfig) {}

  charge(command: ChargeCommand): ResultAsync<ChargeResult, DomainError> {
    return this.fetchAcceptanceToken()
      .andThen((acceptanceToken) =>
        this.tokenizeCard(command.card).map((cardToken) => ({
          acceptanceToken,
          cardToken,
        })),
      )
      .andThen(({ acceptanceToken, cardToken }) =>
        this.createTransaction(command, acceptanceToken, cardToken),
      )
      .andThen((result) =>
        result.status === TransactionStatusEnum.PENDING
          ? this.pollUntilFinal(result.gatewayTransactionId)
          : okAsync(result),
      );
  }

  getTransactionStatus(
    gatewayTransactionId: string,
  ): ResultAsync<ChargeResult, DomainError> {
    return this.request<GatewayTransactionResponse>(
      `/transactions/${gatewayTransactionId}`,
      { method: 'GET', headers: this.privateHeaders() },
      'Unable to read transaction status',
    ).map((response) => this.toChargeResult(response));
  }

  private fetchAcceptanceToken(): ResultAsync<string, DomainError> {
    return this.request<AcceptanceTokenResponse>(
      `/merchants/${this.config.publicKey}`,
      { method: 'GET' },
      'Unable to obtain the acceptance token',
    ).map((response) => response.data.presigned_acceptance.acceptance_token);
  }

  private tokenizeCard(card: CardDetails): ResultAsync<string, DomainError> {
    return this.request<CardTokenResponse>(
      '/tokens/cards',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.publicKey}`,
        },
        body: JSON.stringify({
          number: card.number,
          cvc: card.cvc,
          exp_month: card.expMonth,
          exp_year: card.expYear,
          card_holder: card.cardHolder,
        }),
      },
      'Unable to tokenize the card',
    ).map((response) => response.data.id);
  }

  private createTransaction(
    command: ChargeCommand,
    acceptanceToken: string,
    cardToken: string,
  ): ResultAsync<ChargeResult, DomainError> {
    return this.request<GatewayTransactionResponse>(
      '/transactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.privateKey}`,
        },
        body: JSON.stringify({
          acceptance_token: acceptanceToken,
          amount_in_cents: command.amountInCents,
          currency: CURRENCY,
          customer_email: command.customerEmail,
          reference: command.reference,
          signature: this.buildIntegritySignature(
            command.reference,
            command.amountInCents,
          ),
          payment_method: {
            type: 'CARD',
            token: cardToken,
            installments: command.installments,
          },
        }),
      },
      'Unable to create the gateway transaction',
    ).map((response) => this.toChargeResult(response));
  }

  /** SHA-256 of reference + amount + currency + integrity secret. */
  private buildIntegritySignature(
    reference: string,
    amountInCents: number,
  ): string {
    return createHash('sha256')
      .update(
        `${reference}${amountInCents}${CURRENCY}${this.config.integrityKey}`,
      )
      .digest('hex');
  }

  private pollUntilFinal(
    gatewayTransactionId: string,
    attempt = 1,
  ): ResultAsync<ChargeResult, DomainError> {
    return ResultAsync.fromPromise(delay(this.config.pollIntervalMs), () =>
      DomainError.gateway('Polling was interrupted.'),
    )
      .andThen(() => this.getTransactionStatus(gatewayTransactionId))
      .andThen((result) => {
        if (result.status !== TransactionStatusEnum.PENDING) {
          return okAsync(result);
        }
        if (attempt >= this.config.maxPollAttempts) {
          this.logger.warn(
            `Transaction ${gatewayTransactionId} still pending after ${attempt} attempts.`,
          );
          return okAsync(result);
        }
        return this.pollUntilFinal(gatewayTransactionId, attempt + 1);
      });
  }

  private toChargeResult(response: GatewayTransactionResponse): ChargeResult {
    const rawStatus = response.data.status;

    return {
      gatewayTransactionId: response.data.id,
      status: KNOWN_STATUSES.has(rawStatus)
        ? (rawStatus as TransactionStatusEnum)
        : TransactionStatusEnum.ERROR,
      statusMessage: response.data.status_message ?? null,
    };
  }

  private privateHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.config.privateKey}` };
  }

  private request<T>(
    path: string,
    init: RequestInit,
    context: string,
  ): ResultAsync<T, DomainError> {
    const url = `${this.config.baseUrl}${path}`;

    return ResultAsync.fromPromise(
      fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      }),
      (cause) => DomainError.gateway(`${context}: ${(cause as Error).message}`),
    ).andThen((response) =>
      ResultAsync.fromPromise(response.text(), () =>
        DomainError.gateway(`${context}: response body could not be read.`),
      ).andThen((body) => {
        if (!response.ok) {
          this.logger.error(`${context} (HTTP ${response.status}): ${body}`);
          return errAsync(
            DomainError.gateway(`${context}.`, { httpStatus: response.status }),
          );
        }
        try {
          return okAsync(JSON.parse(body) as T);
        } catch {
          return errAsync(
            DomainError.gateway(`${context}: malformed JSON response.`),
          );
        }
      }),
    );
  }
}
