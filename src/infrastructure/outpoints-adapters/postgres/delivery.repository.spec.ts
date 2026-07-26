import { PostgresDeliveryRepository } from './delivery.repository';
import { mockPrismaDelegate } from '../../../test-support/mocks';
import type { PrismaService } from './prisma.service';
import { DomainErrorCode } from '../../../domain/errors/domain-error';
import { DeliveryStatusEnum } from '../../../domain/resources/delivery-status.enum';

const row = {
  id: 'del-1',
  recipientName: 'Jane Doe',
  address: 'Calle 100',
  city: 'Bucaramanga',
  region: 'Santander',
  country: 'CO',
  postalCode: '680001',
  phoneNumber: '3001234567',
  status: 'PENDING',
  deliveredAt: null,
  transactionId: 'tx-1',
  customerId: 'cus-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const command = {
  transactionId: 'tx-1',
  customerId: 'cus-1',
  recipientName: 'Jane Doe',
  address: 'Calle 100',
  city: 'Bucaramanga',
  region: 'Santander',
  country: 'CO',
  phoneNumber: '3001234567',
};

describe('PostgresDeliveryRepository', () => {
  let prisma: { delivery: ReturnType<typeof mockPrismaDelegate> };
  let repository: PostgresDeliveryRepository;

  beforeEach(() => {
    prisma = { delivery: mockPrismaDelegate() };
    prisma.delivery.create.mockResolvedValue(row);
    prisma.delivery.findUnique.mockResolvedValue(row);
    prisma.delivery.update.mockResolvedValue({ ...row, status: 'ASSIGNED' });
    repository = new PostgresDeliveryRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('creates deliveries in PENDING and defaults the postal code to null', async () => {
    await repository.create(command);

    expect(prisma.delivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: DeliveryStatusEnum.PENDING,
        postalCode: null,
      }) as unknown,
    });
  });

  it('finds a delivery by its transaction', async () => {
    const result = await repository.findByTransactionId('tx-1');

    expect(result._unsafeUnwrap()?.id).toBe('del-1');
  });

  it('returns null when no delivery matches', async () => {
    prisma.delivery.findUnique.mockResolvedValue(null);

    expect(
      (await repository.findByTransactionId('x'))._unsafeUnwrap(),
    ).toBeNull();
  });

  it('moves the delivery to ASSIGNED', async () => {
    const result = await repository.updateStatus(
      'tx-1',
      DeliveryStatusEnum.ASSIGNED,
    );

    expect(result._unsafeUnwrap().status).toBe(DeliveryStatusEnum.ASSIGNED);
  });

  it('converts a driver failure into a persistence error', async () => {
    prisma.delivery.update.mockRejectedValue(new Error('row locked'));

    const result = await repository.updateStatus(
      'tx-1',
      DeliveryStatusEnum.SHIPPED,
    );

    expect(result._unsafeUnwrapErr().code).toBe(
      DomainErrorCode.PERSISTENCE_ERROR,
    );
  });
});
