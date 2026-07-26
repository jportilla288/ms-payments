import { createHash } from 'node:crypto';
import { okAsync } from 'neverthrow';
import {
  HandlePaymentWebhookUseCase,
  PaymentWebhookEvent,
} from './handle-payment-webhook.use-case';
import { DomainErrorCode } from '../../domain/errors/domain-error';
import { Transaction } from '../../domain/models/transaction.model';
import { TransactionStatusEnum } from '../../domain/resources/transaction-status.enum';
import type { TransactionFulfillmentService } from '../services/transaction-fulfillment.service';
import {
  mockFulfillmentService,
  mockTransactionRepository,
} from '../../test-support/mocks';

const SECRET = 'events_secret';
const TIMESTAMP = 1700000000;

const buildTransaction = (status: TransactionStatusEnum): Transaction =>
  new Transaction(
    'tx-1',
    'TX-REF',
    'Shoes x1',
    status,
    new Date(),
    1,
    {
      productAmountInCents: 100_000,
      baseFeeInCents: 50_000,
      deliveryFeeInCents: 120_000,
      amountInCents: 270_000,
    },
    'cus-1',
    'prod-1',
  );

const buildEvent = (
  overrides: { status?: string; checksum?: string } = {},
): PaymentWebhookEvent => {
  const status = overrides.status ?? 'APPROVED';
  const data = {
    transaction: {
      id: 'gw-1',
      reference: 'TX-REF',
      status,
      status_message: null,
    },
  };
  const properties = ['transaction.id', 'transaction.status'];
  const checksum =
    overrides.checksum ??
    createHash('sha256')
      .update(`gw-1${status}${TIMESTAMP}${SECRET}`)
      .digest('hex');

  return {
    event: 'transaction.updated',
    data,
    signature: { properties, checksum },
    timestamp: TIMESTAMP,
  };
};

describe('HandlePaymentWebhookUseCase', () => {
  let transactionRepository: ReturnType<typeof mockTransactionRepository>;
  let fulfillment: ReturnType<typeof mockFulfillmentService>;
  let useCase: HandlePaymentWebhookUseCase;

  beforeEach(() => {
    transactionRepository = mockTransactionRepository();
    transactionRepository.findByReference.mockReturnValue(
      okAsync(buildTransaction(TransactionStatusEnum.PENDING)),
    );

    fulfillment = mockFulfillmentService();
    fulfillment.apply.mockReturnValue(
      okAsync(buildTransaction(TransactionStatusEnum.APPROVED)),
    );

    useCase = new HandlePaymentWebhookUseCase(
      transactionRepository,
      fulfillment as unknown as TransactionFulfillmentService,
      SECRET,
    );
  });

  it('applies the outcome when the signature is valid', async () => {
    const result = await useCase.execute(buildEvent());

    expect(result.isOk()).toBe(true);
    expect(fulfillment.apply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: TransactionStatusEnum.APPROVED,
        gatewayTransactionId: 'gw-1',
      }),
    );
  });

  it('rejects an event with a forged checksum', async () => {
    const result = await useCase.execute(
      buildEvent({ checksum: 'a'.repeat(64) }),
    );

    expect(result._unsafeUnwrapErr().code).toBe(
      DomainErrorCode.INVALID_WEBHOOK_SIGNATURE,
    );
    expect(fulfillment.apply).not.toHaveBeenCalled();
  });

  it('rejects an event without a signature block', async () => {
    const result = await useCase.execute({ event: 'transaction.updated' });

    expect(result._unsafeUnwrapErr().code).toBe(
      DomainErrorCode.INVALID_WEBHOOK_SIGNATURE,
    );
  });

  it('acknowledges an event for an unknown transaction without side effects', async () => {
    transactionRepository.findByReference.mockReturnValue(okAsync(null));

    const result = await useCase.execute(buildEvent());

    expect(result.isOk()).toBe(true);
    expect(fulfillment.apply).not.toHaveBeenCalled();
  });

  it('is idempotent for transactions that are already final', async () => {
    transactionRepository.findByReference.mockReturnValue(
      okAsync(buildTransaction(TransactionStatusEnum.APPROVED)),
    );

    const result = await useCase.execute(buildEvent());

    expect(result.isOk()).toBe(true);
    expect(fulfillment.apply).not.toHaveBeenCalled();
  });

  it('falls back to ERROR when the gateway reports an unknown status', async () => {
    await useCase.execute(buildEvent({ status: 'WEIRD' }));

    expect(fulfillment.apply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: TransactionStatusEnum.ERROR }),
    );
  });
});
