import { createHash } from 'node:crypto';
import { WebhookSignatureService } from './webhook-signature.service';

const SECRET = 'test_events_secret';
const PROPERTIES = [
  'transaction.id',
  'transaction.status',
  'transaction.amount_in_cents',
];
const TIMESTAMP = 1530291411;

const buildData = () => ({
  transaction: {
    id: '01-1532941443-49201',
    status: 'APPROVED',
    amount_in_cents: 4490000,
  },
});

const validChecksum = (): string =>
  createHash('sha256')
    .update(`01-1532941443-49201APPROVED4490000${TIMESTAMP}${SECRET}`)
    .digest('hex');

describe('WebhookSignatureService', () => {
  describe('resolveProperty', () => {
    it('reads a nested path', () => {
      expect(
        WebhookSignatureService.resolveProperty(
          buildData(),
          'transaction.status',
        ),
      ).toBe('APPROVED');
    });

    it('stringifies numeric values', () => {
      expect(
        WebhookSignatureService.resolveProperty(
          buildData(),
          'transaction.amount_in_cents',
        ),
      ).toBe('4490000');
    });

    it('returns an empty string for a missing path', () => {
      expect(
        WebhookSignatureService.resolveProperty(
          buildData(),
          'transaction.nope',
        ),
      ).toBe('');
    });

    it('returns an empty string when the payload is not an object', () => {
      expect(
        WebhookSignatureService.resolveProperty(null, 'transaction.id'),
      ).toBe('');
    });
  });

  describe('buildChecksum', () => {
    it('matches the provider algorithm', () => {
      expect(
        WebhookSignatureService.buildChecksum(
          buildData(),
          PROPERTIES,
          TIMESTAMP,
          SECRET,
        ),
      ).toBe(validChecksum());
    });
  });

  describe('isValid', () => {
    it('accepts a correct checksum', () => {
      expect(
        WebhookSignatureService.isValid(
          buildData(),
          PROPERTIES,
          TIMESTAMP,
          SECRET,
          validChecksum(),
        ),
      ).toBe(true);
    });

    it('accepts an uppercase checksum', () => {
      expect(
        WebhookSignatureService.isValid(
          buildData(),
          PROPERTIES,
          TIMESTAMP,
          SECRET,
          validChecksum().toUpperCase(),
        ),
      ).toBe(true);
    });

    it('rejects a tampered amount', () => {
      const tampered = buildData();
      tampered.transaction.amount_in_cents = 1;

      expect(
        WebhookSignatureService.isValid(
          tampered,
          PROPERTIES,
          TIMESTAMP,
          SECRET,
          validChecksum(),
        ),
      ).toBe(false);
    });

    it('rejects a checksum signed with another secret', () => {
      const foreign = createHash('sha256')
        .update(`01-1532941443-49201APPROVED4490000${TIMESTAMP}other_secret`)
        .digest('hex');

      expect(
        WebhookSignatureService.isValid(
          buildData(),
          PROPERTIES,
          TIMESTAMP,
          SECRET,
          foreign,
        ),
      ).toBe(false);
    });

    it('rejects a checksum of a different length', () => {
      expect(
        WebhookSignatureService.isValid(
          buildData(),
          PROPERTIES,
          TIMESTAMP,
          SECRET,
          'abc',
        ),
      ).toBe(false);
    });
  });
});
