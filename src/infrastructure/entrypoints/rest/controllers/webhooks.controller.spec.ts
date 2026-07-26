import { HttpException } from '@nestjs/common';
import { errAsync, okAsync } from 'neverthrow';
import { WebhooksController } from './webhooks.controller';
import { DomainError } from '../../../../domain/errors/domain-error';
import { aTransaction } from '../../../../test-support/builders';

describe('WebhooksController', () => {
  const handlePaymentWebhook = { execute: jest.fn() };
  const controller = new WebhooksController(handlePaymentWebhook as never);

  beforeEach(() => jest.clearAllMocks());

  it('acknowledges a valid event', async () => {
    handlePaymentWebhook.execute.mockReturnValue(okAsync(aTransaction()));

    await expect(controller.receive({})).resolves.toEqual({ received: true });
  });

  it('acknowledges an event for an unknown transaction', async () => {
    handlePaymentWebhook.execute.mockReturnValue(okAsync(null));

    await expect(controller.receive({})).resolves.toEqual({ received: true });
  });

  it('rejects an event with an invalid signature', async () => {
    handlePaymentWebhook.execute.mockReturnValue(
      errAsync(DomainError.invalidWebhookSignature()),
    );

    await expect(controller.receive({})).rejects.toBeInstanceOf(HttpException);
  });
});
