import { errAsync, okAsync } from 'neverthrow';
import { CreateTransactionUseCase, CreateTransactionInput } from './create-transaction.use-case';
import { DomainError, DomainErrorCode } from '../../domain/errors/domain-error';
import { Customer } from '../../domain/models/customer.model';
import { Delivery } from '../../domain/models/delivery.model';
import { Product } from '../../domain/models/product.model';
import { Transaction } from '../../domain/models/transaction.model';
import { CardBrandEnum } from '../../domain/resources/card-brand.enum';
import { DeliveryStatusEnum } from '../../domain/resources/delivery-status.enum';
import { DocumentTypeEnum } from '../../domain/resources/document-type.enum';
import { TransactionStatusEnum } from '../../domain/resources/transaction-status.enum';

const product = new Product('prod-1', 'Shoes', 'Nice shoes', 100_000, 10, null);
const customer = new Customer(
  'cus-1',
  'jane@example.com',
  'Jane Doe',
  '1098765432',
  DocumentTypeEnum.CC,
  '3001234567',
);
const transaction = new Transaction(
  'tx-1',
  'TX-REF',
  'Shoes x1',
  TransactionStatusEnum.PENDING,
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
  null,
  null,
  CardBrandEnum.VISA,
  '4242',
);
const delivery = new Delivery(
  'del-1',
  'tx-1',
  'cus-1',
  'Jane Doe',
  'Calle 100',
  'Bucaramanga',
  'Santander',
  'CO',
  '3001234567',
  DeliveryStatusEnum.PENDING,
);

const buildInput = (overrides: Partial<CreateTransactionInput> = {}): CreateTransactionInput => ({
  productId: 'prod-1',
  quantity: 1,
  customer: {
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    document: '1098765432',
    documentType: DocumentTypeEnum.CC,
    phoneNumber: '3001234567',
  },
  delivery: {
    recipientName: 'Jane Doe',
    address: 'Calle 100',
    city: 'Bucaramanga',
    region: 'Santander',
    country: 'CO',
    phoneNumber: '3001234567',
  },
  cardNumber: '4242424242424242',
  ...overrides,
});

describe('CreateTransactionUseCase', () => {
  let productRepository: any;
  let customerRepository: any;
  let transactionRepository: any;
  let deliveryRepository: any;
  let useCase: CreateTransactionUseCase;

  beforeEach(() => {
    productRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockReturnValue(okAsync(product)),
      decrementStock: jest.fn(),
    };
    customerRepository = {
      upsertByEmail: jest.fn().mockReturnValue(okAsync(customer)),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };
    transactionRepository = {
      create: jest.fn().mockReturnValue(okAsync(transaction)),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    deliveryRepository = {
      create: jest.fn().mockReturnValue(okAsync(delivery)),
      findByTransactionId: jest.fn(),
      updateStatus: jest.fn(),
    };

    useCase = new CreateTransactionUseCase(
      productRepository,
      customerRepository,
      transactionRepository,
      deliveryRepository,
    );
  });

  it('creates a pending transaction together with its delivery', async () => {
    const result = await useCase.execute(buildInput());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().transaction.transactionId).toBe('tx-1');
    expect(result._unsafeUnwrap().delivery.id).toBe('del-1');
    expect(transactionRepository.create).toHaveBeenCalledTimes(1);
  });

  it('derives the card brand and last four digits without storing the full number', async () => {
    await useCase.execute(buildInput());

    expect(transactionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ cardBrand: CardBrandEnum.VISA, cardLastFour: '4242' }),
    );
  });

  it('fails when the quantity is not a positive integer', async () => {
    const result = await useCase.execute(buildInput({ quantity: 0 }));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.INVALID_QUANTITY);
    expect(productRepository.findById).not.toHaveBeenCalled();
  });

  it('fails when the card number does not pass the Luhn checksum', async () => {
    const result = await useCase.execute(buildInput({ cardNumber: '4242424242424241' }));

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.INVALID_CARD);
  });

  it('fails when the product does not exist', async () => {
    productRepository.findById.mockReturnValue(okAsync(null));

    const result = await useCase.execute(buildInput());

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.PRODUCT_NOT_FOUND);
  });

  it('fails when the requested quantity exceeds the available stock', async () => {
    const result = await useCase.execute(buildInput({ quantity: 99 }));

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.INSUFFICIENT_STOCK);
  });

  it('propagates persistence failures on the error track', async () => {
    customerRepository.upsertByEmail.mockReturnValue(
      errAsync(DomainError.persistence('connection lost')),
    );

    const result = await useCase.execute(buildInput());

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.PERSISTENCE_ERROR);
  });
});
