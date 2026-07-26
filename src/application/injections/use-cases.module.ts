import { Module } from '@nestjs/common';
import { CreateTransactionUseCase } from '../use-cases/create-transaction.use-case';
import { GetProductUseCase } from '../use-cases/get-product.use-case';
import { GetTransactionUseCase } from '../use-cases/get-transaction.use-case';
import { HandlePaymentWebhookUseCase } from '../use-cases/handle-payment-webhook.use-case';
import { ListProductsUseCase } from '../use-cases/list-products.use-case';
import { ProcessPaymentUseCase } from '../use-cases/process-payment.use-case';
import { TransactionFulfillmentService } from '../services/transaction-fulfillment.service';
import { WEBHOOK_SECRET } from '../ports/webhook-secret.port';

const USE_CASES = [
  ListProductsUseCase,
  GetProductUseCase,
  CreateTransactionUseCase,
  ProcessPaymentUseCase,
  GetTransactionUseCase,
  HandlePaymentWebhookUseCase,
];

@Module({
  providers: [
    ...USE_CASES,
    TransactionFulfillmentService,
    {
      provide: WEBHOOK_SECRET,
      useFactory: (): string => process.env.PAYMENT_EVENTS_KEY ?? '',
    },
  ],
  exports: USE_CASES,
})
export class UseCasesModule {}
