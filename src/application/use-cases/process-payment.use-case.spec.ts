import { errAsync, okAsync } from 'neverthrow';
import { ProcessPaymentUseCase } from './process-payment.use-case';
import { DomainError, DomainErrorCode } from '../../domain/errors/domain-error';
import { TransactionStatusEnum } from '../../domain/resources/transaction-status.enum';
import type { TransactionFulfillmentService } from '../services/transaction-fulfillment.service';
import { aCard, aCustomer, aTransaction } from '../../test-support/builders';
import {
  mockCustomerRepository,
  mockFulfillmentService,
  mockPaymentGateway,
  mockTransactionRepository,
} from '../../test-support/mocks';

describe('ProcessPaymentUseCase', () => {
  let transactionRepository: ReturnType<typeof mockTransactionRepository>;
  let customerRepository: ReturnType<typeof mockCustomerRepository>;
  let paymentGateway: ReturnType<typeof mockPaymentGateway>;
  let fulfillment: ReturnType<typeof mockFulfillmentService>;
  let useCase: ProcessPaymentUseCase;

  beforeEach(() => {
    transactionRepository = mockTransactionRepository();
    transactionRepository.findById.mockReturnValue(okAsync(aTransaction()));

    customerRepository = mockCustomerRepository();
    customerRepository.findById.mockReturnValue(okAsync(aCustomer()));

    paymentGateway = mockPaymentGateway();
    paymentGateway.charge.mockReturnValue(
      okAsync({
        gatewayTransactionId: 'gw-1',
        status: TransactionStatusEnum.APPROVED,
        statusMessage: null,
      }),
    );

    fulfillment = mockFulfillmentService();
    fulfillment.apply.mockReturnValue(
      okAsync(aTransaction(TransactionStatusEnum.APPROVED)),
    );

    useCase = new ProcessPaymentUseCase(
      transactionRepository,
      customerRepository,
      paymentGateway,
      fulfillment as unknown as TransactionFulfillmentService,
    );
  });

  const input = () => ({
    transactionId: 'tx-1',
    card: aCard(),
    installments: 1,
  });

  it('charges the gateway and applies the outcome', async () => {
    const result = await useCase.execute(input());

    expect(result._unsafeUnwrap().status).toBe(TransactionStatusEnum.APPROVED);
    expect(paymentGateway.charge).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'TX-REF',
        amountInCents: 270_000,
        customerEmail: 'jane@example.com',
        installments: 1,
      }),
    );
  });

  it('fails when the transaction does not exist', async () => {
    transactionRepository.findById.mockReturnValue(okAsync(null));

    const result = await useCase.execute(input());

    expect(result._unsafeUnwrapErr().code).toBe(
      DomainErrorCode.TRANSACTION_NOT_FOUND,
    );
    expect(paymentGateway.charge).not.toHaveBeenCalled();
  });

  it('refuses to charge a transaction that is already final', async () => {
    transactionRepository.findById.mockReturnValue(
      okAsync(aTransaction(TransactionStatusEnum.APPROVED)),
    );

    const result = await useCase.execute(input());

    expect(result._unsafeUnwrapErr().code).toBe(
      DomainErrorCode.TRANSACTION_ALREADY_FINALIZED,
    );
  });

  it('fails when the customer attached to the transaction is missing', async () => {
    customerRepository.findById.mockReturnValue(okAsync(null));

    const result = await useCase.execute(input());

    expect(result._unsafeUnwrapErr().code).toBe(
      DomainErrorCode.PERSISTENCE_ERROR,
    );
  });

  it('marks the transaction as ERROR when the gateway is unreachable', async () => {
    paymentGateway.charge.mockReturnValue(
      errAsync(DomainError.gateway('timeout')),
    );
    fulfillment.apply.mockReturnValue(
      okAsync(aTransaction(TransactionStatusEnum.ERROR)),
    );

    const result = await useCase.execute(input());

    expect(result.isOk()).toBe(true);
    expect(fulfillment.apply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: TransactionStatusEnum.ERROR,
        gatewayTransactionId: null,
        statusMessage: 'timeout',
      }),
    );
  });

  it('passes a declined outcome through without special casing', async () => {
    paymentGateway.charge.mockReturnValue(
      okAsync({
        gatewayTransactionId: 'gw-2',
        status: TransactionStatusEnum.DECLINED,
        statusMessage: 'Insufficient funds',
      }),
    );
    fulfillment.apply.mockReturnValue(
      okAsync(aTransaction(TransactionStatusEnum.DECLINED)),
    );

    const result = await useCase.execute(input());

    expect(result._unsafeUnwrap().status).toBe(TransactionStatusEnum.DECLINED);
  });
});
