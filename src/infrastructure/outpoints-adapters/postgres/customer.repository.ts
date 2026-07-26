import { Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import {
  CustomerRepositoryPort,
  UpsertCustomerCommand,
} from '../../../application/ports/customer-repository.port';
import { DomainError } from '../../../domain/errors/domain-error';
import { Customer } from '../../../domain/models/customer.model';
import { PrismaService } from './prisma.service';
import { fromPrisma } from './persistence.helper';
import { toCustomerModel } from './prisma.mappers';

@Injectable()
export class PostgresCustomerRepository implements CustomerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  upsertByEmail(command: UpsertCustomerCommand): ResultAsync<Customer, DomainError> {
    const { email, ...rest } = command;

    return fromPrisma(
      this.prisma.customer.upsert({
        where: { email },
        update: rest,
        create: { email, ...rest },
      }),
      'Unable to persist customer',
    ).map(toCustomerModel);
  }

  findById(id: string): ResultAsync<Customer | null, DomainError> {
    return fromPrisma(
      this.prisma.customer.findUnique({ where: { id } }),
      'Unable to load customer',
    ).map((row) => (row === null ? null : toCustomerModel(row)));
  }

  findByEmail(email: string): ResultAsync<Customer | null, DomainError> {
    return fromPrisma(
      this.prisma.customer.findUnique({ where: { email } }),
      'Unable to load customer',
    ).map((row) => (row === null ? null : toCustomerModel(row)));
  }
}
