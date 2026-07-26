/**
 * Every failure the domain can produce.
 *
 * Use cases return these on the failure track of the Railway Oriented
 * Programming flow. The REST layer is the only place that knows how to turn
 * a DomainError into an HTTP status code.
 */
export enum DomainErrorCode {
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_CARD = 'INVALID_CARD',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  TRANSACTION_ALREADY_FINALIZED = 'TRANSACTION_ALREADY_FINALIZED',
  INVALID_WEBHOOK_SIGNATURE = 'INVALID_WEBHOOK_SIGNATURE',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  PERSISTENCE_ERROR = 'PERSISTENCE_ERROR',
}

export class DomainError {
  private constructor(
    public readonly code: DomainErrorCode,
    public readonly message: string,
    public readonly details?: Readonly<Record<string, unknown>>,
  ) {}

  static productNotFound(productId: string): DomainError {
    return new DomainError(
      DomainErrorCode.PRODUCT_NOT_FOUND,
      `Product ${productId} does not exist.`,
      { productId },
    );
  }

  static transactionNotFound(transactionId: string): DomainError {
    return new DomainError(
      DomainErrorCode.TRANSACTION_NOT_FOUND,
      `Transaction ${transactionId} does not exist.`,
      { transactionId },
    );
  }

  static insufficientStock(available: number, requested: number): DomainError {
    return new DomainError(
      DomainErrorCode.INSUFFICIENT_STOCK,
      `Requested ${requested} units but only ${available} are available.`,
      { available, requested },
    );
  }

  static invalidQuantity(quantity: number): DomainError {
    return new DomainError(
      DomainErrorCode.INVALID_QUANTITY,
      `Quantity must be a positive integer, received ${quantity}.`,
      { quantity },
    );
  }

  static invalidCard(reason: string): DomainError {
    return new DomainError(DomainErrorCode.INVALID_CARD, reason);
  }

  static transactionAlreadyFinalized(status: string): DomainError {
    return new DomainError(
      DomainErrorCode.TRANSACTION_ALREADY_FINALIZED,
      `Transaction is already in a final state (${status}).`,
      { status },
    );
  }

  static invalidWebhookSignature(): DomainError {
    return new DomainError(
      DomainErrorCode.INVALID_WEBHOOK_SIGNATURE,
      'The event signature could not be verified.',
    );
  }

  static gateway(
    message: string,
    details?: Record<string, unknown>,
  ): DomainError {
    return new DomainError(DomainErrorCode.GATEWAY_ERROR, message, details);
  }

  static persistence(message: string): DomainError {
    return new DomainError(DomainErrorCode.PERSISTENCE_ERROR, message);
  }
}
