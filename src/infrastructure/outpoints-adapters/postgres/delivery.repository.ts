import { Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import {
  CreateDeliveryCommand,
  DeliveryRepositoryPort,
} from '../../../application/ports/delivery-repository.port';
import { DomainError } from '../../../domain/errors/domain-error';
import { Delivery } from '../../../domain/models/delivery.model';
import { DeliveryStatusEnum } from '../../../domain/resources/delivery-status.enum';
import { PrismaService } from './prisma.service';
import { fromPrisma } from './persistence.helper';
import { toDeliveryModel } from './prisma.mappers';

@Injectable()
export class PostgresDeliveryRepository implements DeliveryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  create(command: CreateDeliveryCommand): ResultAsync<Delivery, DomainError> {
    return fromPrisma(
      this.prisma.delivery.create({
        data: {
          transactionId: command.transactionId,
          customerId: command.customerId,
          recipientName: command.recipientName,
          address: command.address,
          city: command.city,
          region: command.region,
          country: command.country,
          phoneNumber: command.phoneNumber,
          postalCode: command.postalCode ?? null,
          status: DeliveryStatusEnum.PENDING,
        },
      }),
      'Unable to create delivery',
    ).map(toDeliveryModel);
  }

  findByTransactionId(transactionId: string): ResultAsync<Delivery | null, DomainError> {
    return fromPrisma(
      this.prisma.delivery.findUnique({ where: { transactionId } }),
      'Unable to load delivery',
    ).map((row) => (row === null ? null : toDeliveryModel(row)));
  }

  updateStatus(
    transactionId: string,
    status: DeliveryStatusEnum,
  ): ResultAsync<Delivery, DomainError> {
    return fromPrisma(
      this.prisma.delivery.update({ where: { transactionId }, data: { status } }),
      'Unable to update delivery status',
    ).map(toDeliveryModel);
  }
}
