import { errAsync, okAsync } from 'neverthrow';
import { TransactionFulfillmentService } from './transaction-fulfillment.service';
import { DomainError, DomainErrorCode } from '../../domain/errors/domain-error';
import { DeliveryStatusEnum } from '../../domain/resources/delivery-status.enum';
import { TransactionStatusEnum } from '../../domain/resources/transaction-status.enum';
import { aDelivery, aProduct, aTransaction } from '../../test-support/builders';

describe('TransactionFulfillmentService', () => {
  let transactionRepository: any;
  let productRepository: any;
  let deliveryRepository: any;
  let service: TransactionFulfillmentService;

  beforeEach(() => {
    transactionRepository = {
      updateStatus: jest
        .fn()
        .mockReturnValue(okAsync(aTransaction(TransactionStatusEnum.APPROVED))),
    };
    productRepository = {
      decrementStock: jest.fn().mockReturnValue(okAsync(aProduct(9))),
    };
    deliveryRepository = {
      updateStatus: jest.fn().mockReturnValue(okAsync(aDelivery())),
    };

    service = new TransactionFulfillmentService(
      transactionRepository,
      productRepository,
      deliveryRepository,
    );
  });

  const outcome = (status: TransactionStatusEnum) => ({
    status,
    gatewayTransactionId: 'gw-1',
    statusMessage: null,
  });

  it('decrements stock and assigns the delivery when the charge is approved', async () => {
    const result = await service.apply(
      aTransaction(),
      outcome(TransactionStatusEnum.APPROVED),
    );

    expect(result.isOk()).toBe(true);
    expect(productRepository.decrementStock).toHaveBeenCalledWith('prod-1', 1);
    expect(deliveryRepository.updateStatus).toHaveBeenCalledWith(
      'tx-1',
      DeliveryStatusEnum.ASSIGNED,
    );
  });

  it('leaves stock and delivery untouched when the charge is declined', async () => {
    transactionRepository.updateStatus.mockReturnValue(
      okAsync(aTransaction(TransactionStatusEnum.DECLINED)),
    );

    const result = await service.apply(
      aTransaction(),
      outcome(TransactionStatusEnum.DECLINED),
    );

    expect(result.isOk()).toBe(true);
    expect(productRepository.decrementStock).not.toHaveBeenCalled();
    expect(deliveryRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('records the gateway identifier on the transaction', async () => {
    await service.apply(aTransaction(), outcome(TransactionStatusEnum.APPROVED));

    expect(transactionRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 'tx-1', wompiTransactionId: 'gw-1' }),
    );
  });

  it('fails when the stock can no longer cover the order', async () => {
    productRepository.decrementStock.mockReturnValue(
      errAsync(DomainError.insufficientStock(0, 1)),
    );

    const result = await service.apply(
      aTransaction(),
      outcome(TransactionStatusEnum.APPROVED),
    );

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.INSUFFICIENT_STOCK);
  });
});
