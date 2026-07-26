import { PostgresCustomerRepository } from './customer.repository';
import { mockPrismaDelegate } from '../../../test-support/mocks';
import type { PrismaService } from './prisma.service';
import { DomainErrorCode } from '../../../domain/errors/domain-error';
import { DocumentTypeEnum } from '../../../domain/resources/document-type.enum';

const row = {
  id: 'cus-1',
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  document: '1098765432',
  documentType: 'CC',
  phoneNumber: '3001234567',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const command = {
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  document: '1098765432',
  documentType: DocumentTypeEnum.CC,
  phoneNumber: '3001234567',
};

describe('PostgresCustomerRepository', () => {
  let prisma: { customer: ReturnType<typeof mockPrismaDelegate> };
  let repository: PostgresCustomerRepository;

  beforeEach(() => {
    prisma = { customer: mockPrismaDelegate() };
    prisma.customer.upsert.mockResolvedValue(row);
    prisma.customer.findUnique.mockResolvedValue(row);
    repository = new PostgresCustomerRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('upserts by email so repeat buyers reuse one record', async () => {
    const result = await repository.upsertByEmail(command);

    expect(result._unsafeUnwrap().id).toBe('cus-1');
    expect(prisma.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'jane@example.com' } }),
    );
  });

  it('finds a customer by id', async () => {
    expect((await repository.findById('cus-1'))._unsafeUnwrap()?.email).toBe(
      'jane@example.com',
    );
  });

  it('returns null for an unknown email', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    expect(
      (await repository.findByEmail('nope@x.com'))._unsafeUnwrap(),
    ).toBeNull();
  });

  it('converts a driver failure into a persistence error', async () => {
    prisma.customer.upsert.mockRejectedValue(new Error('unique violation'));

    expect(
      (await repository.upsertByEmail(command))._unsafeUnwrapErr().code,
    ).toBe(DomainErrorCode.PERSISTENCE_ERROR);
  });
});
