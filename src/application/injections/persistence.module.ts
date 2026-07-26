import { Global, Module } from '@nestjs/common';
import { CUSTOMER_REPOSITORY_PORT } from '../ports/customer-repository.port';
import { DELIVERY_REPOSITORY_PORT } from '../ports/delivery-repository.port';
import { PRODUCT_REPOSITORY_PORT } from '../ports/product-repository.port';
import { TRANSACTION_REPOSITORY_PORT } from '../ports/transaction-repository.port';
import { PostgresCustomerRepository } from '../../infrastructure/outpoints-adapters/postgres/customer.repository';
import { PostgresDeliveryRepository } from '../../infrastructure/outpoints-adapters/postgres/delivery.repository';
import { PostgresProductRepository } from '../../infrastructure/outpoints-adapters/postgres/product.repository';
import { PostgresTransactionRepository } from '../../infrastructure/outpoints-adapters/postgres/transaction.repository';
import { PrismaService } from '../../infrastructure/outpoints-adapters/postgres/prisma.service';

/**
 * Binds every outbound persistence port to its PostgreSQL adapter.
 * Swapping the database means changing only this file.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    { provide: PRODUCT_REPOSITORY_PORT, useClass: PostgresProductRepository },
    { provide: CUSTOMER_REPOSITORY_PORT, useClass: PostgresCustomerRepository },
    { provide: TRANSACTION_REPOSITORY_PORT, useClass: PostgresTransactionRepository },
    { provide: DELIVERY_REPOSITORY_PORT, useClass: PostgresDeliveryRepository },
  ],
  exports: [
    PrismaService,
    PRODUCT_REPOSITORY_PORT,
    CUSTOMER_REPOSITORY_PORT,
    TRANSACTION_REPOSITORY_PORT,
    DELIVERY_REPOSITORY_PORT,
  ],
})
export class PersistenceModule {}
