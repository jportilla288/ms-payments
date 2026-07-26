import { Module } from '@nestjs/common';
import { UseCasesModule } from '../../../application/injections/use-cases.module';
import { HealthController } from './controllers/health.controller';
import { ProductsController } from './controllers/products.controller';
import { TransactionsController } from './controllers/transactions.controller';
import { WebhooksController } from './controllers/webhooks.controller';

@Module({
  imports: [UseCasesModule],
  controllers: [
    HealthController,
    ProductsController,
    TransactionsController,
    WebhooksController,
  ],
})
export class RestModule {}
