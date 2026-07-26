import { PaymentGatewayConfig } from './payment-gateway.config';

describe('PaymentGatewayConfig', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('reads every value from the environment', () => {
    process.env.PAYMENT_API_URL = 'https://gateway.test/v1';
    process.env.PAYMENT_PUBLIC_KEY = 'pub';
    process.env.PAYMENT_PRIVATE_KEY = 'prv';
    process.env.PAYMENT_INTEGRITY_KEY = 'integrity';
    process.env.PAYMENT_TIMEOUT_MS = '9000';
    process.env.PAYMENT_POLL_INTERVAL_MS = '250';
    process.env.PAYMENT_MAX_POLL_ATTEMPTS = '4';

    const config = new PaymentGatewayConfig();

    expect(config.baseUrl).toBe('https://gateway.test/v1');
    expect(config.publicKey).toBe('pub');
    expect(config.privateKey).toBe('prv');
    expect(config.integrityKey).toBe('integrity');
    expect(config.requestTimeoutMs).toBe(9000);
    expect(config.pollIntervalMs).toBe(250);
    expect(config.maxPollAttempts).toBe(4);
  });

  it('falls back to empty credentials and sane timeouts when unset', () => {
    delete process.env.PAYMENT_API_URL;
    delete process.env.PAYMENT_PUBLIC_KEY;
    delete process.env.PAYMENT_PRIVATE_KEY;
    delete process.env.PAYMENT_INTEGRITY_KEY;
    delete process.env.PAYMENT_TIMEOUT_MS;
    delete process.env.PAYMENT_POLL_INTERVAL_MS;
    delete process.env.PAYMENT_MAX_POLL_ATTEMPTS;

    const config = new PaymentGatewayConfig();

    expect(config.baseUrl).toBe('');
    expect(config.publicKey).toBe('');
    expect(config.requestTimeoutMs).toBe(15000);
    expect(config.pollIntervalMs).toBe(1500);
    expect(config.maxPollAttempts).toBe(8);
  });
});
