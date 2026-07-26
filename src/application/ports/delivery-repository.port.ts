import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { Delivery } from '../../domain/models/delivery.model';
import { DeliveryStatusEnum } from '../../domain/resources/delivery-status.enum';

export const DELIVERY_REPOSITORY_PORT = Symbol('DELIVERY_REPOSITORY_PORT');

export interface CreateDeliveryCommand {
  readonly transactionId: string;
  readonly customerId: string;
  readonly recipientName: string;
  readonly address: string;
  readonly city: string;
  readonly region: string;
  readonly country: string;
  readonly phoneNumber: string;
  readonly postalCode?: string | null;
}

export interface DeliveryRepositoryPort {
  create(command: CreateDeliveryCommand): ResultAsync<Delivery, DomainError>;
  findByTransactionId(transactionId: string): ResultAsync<Delivery | null, DomainError>;
  updateStatus(
    transactionId: string,
    status: DeliveryStatusEnum,
  ): ResultAsync<Delivery, DomainError>;
}
