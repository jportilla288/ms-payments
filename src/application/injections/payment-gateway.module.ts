import { Global, Module } from '@nestjs/common';
import { PAYMENT_GATEWAY_PORT } from '../ports/payment-gateway.port';
import { PaymentGatewayConfig } from '../../infrastructure/outpoints-adapters/external-services/payment-gateway.config';
import { WompiPaymentGatewayAdapter } from '../../infrastructure/outpoints-adapters/external-services/payment-gateway.adapter';

/** Binds the payment port to the concrete provider adapter. */
@Global()
@Module({
  providers: [
    PaymentGatewayConfig,
    { provide: PAYMENT_GATEWAY_PORT, useClass: WompiPaymentGatewayAdapter },
  ],
  exports: [PAYMENT_GATEWAY_PORT],
})
export class PaymentGatewayModule {}
