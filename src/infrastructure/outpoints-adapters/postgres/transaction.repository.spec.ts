import { PostgresTransactionRepository } from './transaction.repository';
import { DomainErrorCode } from '../../../domain/errors/domain-error';
import { CardBrandEnum } from '../../../domain/resources/card-brand.enum';
import { TransactionStatusEnum } from '../../../domain/resources/transaction-status.enum';

const row = {
  transactionId: 'tx-1',
  reference: 'TX-REF',
  paymentDescription: 'Shoes x1',
  status: 'PENDING',
  solicitedDate: new Date(),
  quantity: 1,
  productAmountInCents: 100_000,
  baseFeeInCents: 50_000,
  deliveryFeeInCents: 120_000,
  amountInCents: 270_000,
  wompiTransactionId: null,
  statusMessage: null,
  cardBrand: 'VISA',
  cardLastFour: '4242',
  customerId: 'cus-1',
  productId: 'prod-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PostgresTransactionRepository', () => {
  let prisma: any;
  let repository: PostgresTransactionRepository;

  beforeEach(() => {
    prisma = {
      transaction: {
        create: jest.fn().mockResolvedValue(row),
        findUnique: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue({ ...row, status: 'APPROVED' }),
      },
    };
    repository = new PostgresTransactionRepository(prisma);
  });

  it('always creates transactions in PENDING', async () => {
    await repository.create({
      reference: 'TX-REF',
      paymentDescription: 'Shoes x1',
      quantity: 1,
      amounts: {
        productAmountInCents: 100_000,
        baseFeeInCents: 50_000,
        deliveryFeeInCents: 120_000,
        amountInCents: 270_000,
      },
      customerId: 'cus-1',
      productId: 'prod-1',
      cardBrand: CardBrandEnum.VISA,
      cardLastFour: '4242',
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: TransactionStatusEnum.PENDING }),
    });
  });

  it('maps the amount breakdown back into the domain model', async () => {
    const result = await repository.findById('tx-1');

    expect(result._unsafeUnwrap()?.amounts.amountInCents).toBe(270_000);
    expect(result._unsafeUnwrap()?.cardBrand).toBe(CardBrandEnum.VISA);
  });

  it('looks a transaction up by its gateway reference', async () => {
    await repository.findByReference('TX-REF');

    expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
      where: { reference: 'TX-REF' },
    });
  });

  it('updates the status', async () => {
    const result = await repository.updateStatus({
      transactionId: 'tx-1',
      status: TransactionStatusEnum.APPROVED,
      wompiTransactionId: 'gw-1',
      statusMessage: null,
    });

    expect(result._unsafeUnwrap().status).toBe(TransactionStatusEnum.APPROVED);
  });

  it('converts a driver failure into a persistence error', async () => {
    prisma.transaction.create.mockRejectedValue(new Error('deadlock'));

    const result = await repository.create({
      reference: 'TX-REF',
      paymentDescription: 'Shoes x1',
      quantity: 1,
      amounts: {
        productAmountInCents: 1,
        baseFeeInCents: 1,
        deliveryFeeInCents: 1,
        amountInCents: 3,
      },
      customerId: 'cus-1',
      productId: 'prod-1',
      cardBrand: CardBrandEnum.VISA,
      cardLastFour: '4242',
    });

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.PERSISTENCE_ERROR);
  });
});
