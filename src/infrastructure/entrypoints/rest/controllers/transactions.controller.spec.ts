import { HttpException } from '@nestjs/common';
import { errAsync, okAsync } from 'neverthrow';
import { TransactionsController } from './transactions.controller';
import { DomainError } from '../../../../domain/errors/domain-error';
import { TransactionStatusEnum } from '../../../../domain/resources/transaction-status.enum';
import { aCard, aDelivery, aProduct, aTransaction } from '../../../../test-support/builders';

describe('TransactionsController', () => {
  const createTransaction = { execute: jest.fn() };
  const processPayment = { execute: jest.fn() };
  const getTransaction = { execute: jest.fn() };
  const controller = new TransactionsController(
    createTransaction as never,
    processPayment as never,
    getTransaction as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns the transaction and its delivery on creation', async () => {
    createTransaction.execute.mockReturnValue(
      okAsync({
        transaction: aTransaction(),
        delivery: aDelivery(),
        product: aProduct(),
      }),
    );

    const response = await controller.create({ productId: 'prod-1' } as never);

    expect(response.transaction.transactionId).toBe('tx-1');
    expect(response.transaction.cardLastFour).toBe('4242');
    expect(response.delivery.city).toBe('Bucaramanga');
  });

  it('never exposes the customer identifier in the response', async () => {
    createTransaction.execute.mockReturnValue(
      okAsync({
        transaction: aTransaction(),
        delivery: aDelivery(),
        product: aProduct(),
      }),
    );

    const response = await controller.create({ productId: 'prod-1' } as never);

    expect(response.transaction).not.toHaveProperty('customerId');
  });

  it('returns the final status after paying', async () => {
    processPayment.execute.mockReturnValue(
      okAsync(aTransaction(TransactionStatusEnum.APPROVED)),
    );

    const response = await controller.pay('tx-1', {
      card: aCard(),
      installments: 1,
    } as never);

    expect(response.status).toBe(TransactionStatusEnum.APPROVED);
  });

  it('reads a transaction by id', async () => {
    getTransaction.execute.mockReturnValue(okAsync(aTransaction()));

    expect((await controller.findOne('tx-1')).reference).toBe('TX-REF');
  });

  it('surfaces a conflict when the transaction is already final', async () => {
    processPayment.execute.mockReturnValue(
      errAsync(DomainError.transactionAlreadyFinalized('APPROVED')),
    );

    await expect(
      controller.pay('tx-1', { card: aCard(), installments: 1 } as never),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
