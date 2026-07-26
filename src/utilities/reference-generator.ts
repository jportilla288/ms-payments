import { randomUUID } from 'node:crypto';

/**
 * Builds the idempotent reference sent to the payment gateway.
 * Prefixed so references are recognisable in the provider dashboard.
 */
export const generateTransactionReference = (): string =>
  `TX-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
