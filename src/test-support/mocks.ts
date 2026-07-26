/**
 * Typed mock factories.
 *
 * Returning explicitly shaped objects instead of `any` keeps the specs free of
 * unsafe-member-access lint warnings while still allowing per-test overrides.
 */

export type JestMocked<T> = { [K in keyof T]: jest.Mock };

export const mockProductRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  decrementStock: jest.fn(),
});

export const mockCustomerRepository = () => ({
  upsertByEmail: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
});

export const mockTransactionRepository = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByReference: jest.fn(),
  updateStatus: jest.fn(),
});

export const mockDeliveryRepository = () => ({
  create: jest.fn(),
  findByTransactionId: jest.fn(),
  updateStatus: jest.fn(),
});

export const mockPaymentGateway = () => ({
  charge: jest.fn(),
  getTransactionStatus: jest.fn(),
});

export const mockFulfillmentService = () => ({
  apply: jest.fn(),
});

export const mockUseCase = () => ({
  execute: jest.fn(),
});

/** Minimal Prisma delegate surface used by the repository specs. */
export const mockPrismaDelegate = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  deleteMany: jest.fn(),
});
