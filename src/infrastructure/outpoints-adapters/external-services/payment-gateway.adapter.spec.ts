import { WompiPaymentGatewayAdapter } from './payment-gateway.adapter';
import { PaymentGatewayConfig } from './payment-gateway.config';
import { DomainErrorCode } from '../../../domain/errors/domain-error';
import { TransactionStatusEnum } from '../../../domain/resources/transaction-status.enum';
import { aCard } from '../../../test-support/builders';

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  text: () => Promise.resolve(JSON.stringify(body)),
});

const acceptance = {
  data: { presigned_acceptance: { acceptance_token: 'acc-token' } },
};
const cardToken = { data: { id: 'tok_test_1' } };
const approved = { data: { id: 'gw-1', status: 'APPROVED', status_message: null } };

describe('WompiPaymentGatewayAdapter', () => {
  let config: PaymentGatewayConfig;
  let adapter: WompiPaymentGatewayAdapter;
  let fetchMock: jest.Mock;

  const command = {
    reference: 'TX-REF',
    amountInCents: 270_000,
    customerEmail: 'jane@example.com',
    installments: 1,
    card: aCard(),
  };

  beforeEach(() => {
    config = {
      baseUrl: 'https://gateway.test/v1',
      publicKey: 'pub_test_key',
      privateKey: 'prv_test_key',
      integrityKey: 'integrity_secret',
      requestTimeoutMs: 5000,
      pollIntervalMs: 1,
      maxPollAttempts: 3,
    } as PaymentGatewayConfig;

    fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    adapter = new WompiPaymentGatewayAdapter(config);
  });

  afterEach(() => jest.restoreAllMocks());

  it('completes the handshake and returns the final status', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(acceptance))
      .mockResolvedValueOnce(jsonResponse(cardToken))
      .mockResolvedValueOnce(jsonResponse(approved));

    const result = await adapter.charge(command);

    expect(result._unsafeUnwrap()).toEqual({
      gatewayTransactionId: 'gw-1',
      status: TransactionStatusEnum.APPROVED,
      statusMessage: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('signs the transaction with the integrity secret', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(acceptance))
      .mockResolvedValueOnce(jsonResponse(cardToken))
      .mockResolvedValueOnce(jsonResponse(approved));

    await adapter.charge(command);

    const body = JSON.parse(fetchMock.mock.calls[2][1].body);

    expect(body.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(body.reference).toBe('TX-REF');
    expect(body.amount_in_cents).toBe(270_000);
    expect(body.payment_method).toEqual({
      type: 'CARD',
      token: 'tok_test_1',
      installments: 1,
    });
  });

  it('sends the raw card only to the tokenisation endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(acceptance))
      .mockResolvedValueOnce(jsonResponse(cardToken))
      .mockResolvedValueOnce(jsonResponse(approved));

    await adapter.charge(command);

    expect(fetchMock.mock.calls[1][0]).toContain('/tokens/cards');
    expect(fetchMock.mock.calls[2][1].body).not.toContain('4242424242424242');
  });

  it('polls while the transaction stays pending', async () => {
    const pending = { data: { id: 'gw-1', status: 'PENDING', status_message: null } };

    fetchMock
      .mockResolvedValueOnce(jsonResponse(acceptance))
      .mockResolvedValueOnce(jsonResponse(cardToken))
      .mockResolvedValueOnce(jsonResponse(pending))
      .mockResolvedValueOnce(jsonResponse(pending))
      .mockResolvedValueOnce(jsonResponse(approved));

    const result = await adapter.charge(command);

    expect(result._unsafeUnwrap().status).toBe(TransactionStatusEnum.APPROVED);
  });

  it('gives up polling after the configured attempts', async () => {
    const pending = { data: { id: 'gw-1', status: 'PENDING', status_message: null } };

    fetchMock
      .mockResolvedValueOnce(jsonResponse(acceptance))
      .mockResolvedValueOnce(jsonResponse(cardToken))
      .mockResolvedValue(jsonResponse(pending));

    const result = await adapter.charge(command);

    expect(result._unsafeUnwrap().status).toBe(TransactionStatusEnum.PENDING);
  });

  it('maps an unknown gateway status to ERROR', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(acceptance))
      .mockResolvedValueOnce(jsonResponse(cardToken))
      .mockResolvedValueOnce(
        jsonResponse({ data: { id: 'gw-1', status: 'WEIRD', status_message: 'x' } }),
      );

    const result = await adapter.charge(command);

    expect(result._unsafeUnwrap().status).toBe(TransactionStatusEnum.ERROR);
  });

  it('fails when the gateway answers with an HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, false, 401));

    const result = await adapter.charge(command);

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.GATEWAY_ERROR);
    expect(result._unsafeUnwrapErr().details).toEqual({ httpStatus: 401 });
  });

  it('fails when the network is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await adapter.charge(command);

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.GATEWAY_ERROR);
  });

  it('fails when the gateway returns malformed JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html>oops</html>'),
    });

    const result = await adapter.charge(command);

    expect(result._unsafeUnwrapErr().message).toContain('malformed JSON');
  });

  it('reads a transaction status with the private key', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(approved));

    const result = await adapter.getTransactionStatus('gw-1');

    expect(result._unsafeUnwrap().gatewayTransactionId).toBe('gw-1');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      'Bearer prv_test_key',
    );
  });
});
