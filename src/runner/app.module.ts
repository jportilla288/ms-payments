import { Module } from '@nestjs/common';
import { PaymentGatewayModule } from '../application/injections/payment-gateway.module';
import { PersistenceModule } from '../application/injections/persistence.module';
import { RestModule } from '../infrastructure/entrypoints/rest/rest.module';

@Module({
  imports: [PersistenceModule, PaymentGatewayModule, RestModule],
})
export class AppModule {}
