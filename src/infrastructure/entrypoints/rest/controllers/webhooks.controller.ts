import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HandlePaymentWebhookUseCase } from '../../../../application/use-cases/handle-payment-webhook.use-case';
import type { PaymentWebhookEvent } from '../../../../application/use-cases/handle-payment-webhook.use-case';
import { unwrapOrThrow } from '../utilities/result.helper';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly handlePaymentWebhook: HandlePaymentWebhookUseCase) {}

  @Post('payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive transaction events from the payment gateway',
    description:
      'The checksum is verified with the events secret before any change is persisted. ' +
      'Unknown or already finalized transactions are acknowledged without side effects.',
  })
  @ApiOkResponse({ description: 'Event acknowledged.' })
  async receive(
    @Body() event: PaymentWebhookEvent,
  ): Promise<{ received: boolean }> {
    await unwrapOrThrow(this.handlePaymentWebhook.execute(event));
    return { received: true };
  }
}
