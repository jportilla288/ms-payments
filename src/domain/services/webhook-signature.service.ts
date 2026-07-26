import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Verifies the checksum the gateway attaches to every event.
 *
 * The provider concatenates the values of the properties listed in
 * `signature.properties`, then the event timestamp, then the events secret,
 * and hashes the result with SHA-256.
 */
export class WebhookSignatureService {
  /** Reads a dotted path such as `transaction.amount_in_cents`. */
  static resolveProperty(payload: unknown, path: string): string {
    const value = path
      .split('.')
      .reduce<unknown>(
        (current, key) =>
          current !== null && typeof current === 'object'
            ? (current as Record<string, unknown>)[key]
            : undefined,
        payload,
      );

    switch (typeof value) {
      case 'string':
        return value;
      case 'number':
      case 'boolean':
      case 'bigint':
        return value.toString();
      default:
        // Objects and nullish values never take part in the signature.
        return '';
    }
  }

  static buildChecksum(
    data: unknown,
    properties: readonly string[],
    timestamp: number | string,
    secret: string,
  ): string {
    const concatenated = properties
      .map((property) =>
        WebhookSignatureService.resolveProperty(data, property),
      )
      .join('');

    return createHash('sha256')
      .update(`${concatenated}${timestamp}${secret}`)
      .digest('hex');
  }

  /** Constant-time comparison to avoid leaking information through timing. */
  static isValid(
    data: unknown,
    properties: readonly string[],
    timestamp: number | string,
    secret: string,
    receivedChecksum: string,
  ): boolean {
    const expected = WebhookSignatureService.buildChecksum(
      data,
      properties,
      timestamp,
      secret,
    );

    if (expected.length !== receivedChecksum.length) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(receivedChecksum.toLowerCase(), 'utf8'),
    );
  }
}
