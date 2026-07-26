import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { TransactionStatusEnum } from '../../domain/resources/transaction-status.enum';

export const PAYMENT_GATEWAY_PORT = Symbol('PAYMENT_GATEWAY_PORT');

export interface CardDetails {
  readonly number: string;
  readonly cvc: string;
  readonly expMonth: string;
  readonly expYear: string;
  readonly cardHolder: string;
}

export interface ChargeCommand {
  readonly reference: string;
  readonly amountInCents: number;
  readonly customerEmail: string;
  readonly installments: number;
  readonly card: CardDetails;
}

export interface ChargeResult {
  readonly gatewayTransactionId: string;
  readonly status: TransactionStatusEnum;
  readonly statusMessage: string | null;
}

/**
 * Outbound port for the payment provider.
 *
 * The domain knows nothing about Wompi; swapping providers only requires a new
 * adapter implementing this interface.
 */
export interface PaymentGatewayPort {
  charge(command: ChargeCommand): ResultAsync<ChargeResult, DomainError>;
  getTransactionStatus(gatewayTransactionId: string): ResultAsync<ChargeResult, DomainError>;
}
