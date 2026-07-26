import { Injectable } from '@nestjs/common';

/**
 * Reads gateway credentials from the environment.
 *
 * The private and integrity keys are server-side only and must never be
 * exposed to the SPA or committed to the repository.
 */
@Injectable()
export class PaymentGatewayConfig {
  readonly baseUrl = process.env.PAYMENT_API_URL ?? '';
  readonly publicKey = process.env.PAYMENT_PUBLIC_KEY ?? '';
  readonly privateKey = process.env.PAYMENT_PRIVATE_KEY ?? '';
  readonly integrityKey = process.env.PAYMENT_INTEGRITY_KEY ?? '';
  readonly requestTimeoutMs = Number(process.env.PAYMENT_TIMEOUT_MS ?? 15000);
  readonly pollIntervalMs = Number(process.env.PAYMENT_POLL_INTERVAL_MS ?? 1500);
  readonly maxPollAttempts = Number(process.env.PAYMENT_MAX_POLL_ATTEMPTS ?? 8);
}
