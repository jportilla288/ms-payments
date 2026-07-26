import { PostgresProductRepository } from './product.repository';
import { DomainErrorCode } from '../../../domain/errors/domain-error';

const row = {
  id: 'prod-1',
  name: 'Pro Running Shoes',
  description: 'Nice shoes',
  priceInCents: 100_000,
  stock: 10,
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PostgresProductRepository', () => {
  let prisma: any;
  let repository: PostgresProductRepository;

  beforeEach(() => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([row]),
        findUnique: jest.fn().mockResolvedValue(row),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    repository = new PostgresProductRepository(prisma);
  });

  it('maps rows to domain models', async () => {
    const result = await repository.findAll();

    expect(result._unsafeUnwrap()[0].priceInCents).toBe(100_000);
    expect(prisma.product.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('returns null when the product is missing', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    expect((await repository.findById('nope'))._unsafeUnwrap()).toBeNull();
  });

  it('converts a driver failure into a persistence error', async () => {
    prisma.product.findMany.mockRejectedValue(new Error('connection lost'));

    const result = await repository.findAll();

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.PERSISTENCE_ERROR);
    expect(result._unsafeUnwrapErr().message).toContain('connection lost');
  });

  it('decrements stock atomically with a conditional filter', async () => {
    await repository.decrementStock('prod-1', 2);

    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod-1', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });

  it('fails when no row matched the stock condition', async () => {
    prisma.product.updateMany.mockResolvedValue({ count: 0 });

    const result = await repository.decrementStock('prod-1', 99);

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.INSUFFICIENT_STOCK);
  });
});
