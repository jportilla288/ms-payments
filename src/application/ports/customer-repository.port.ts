import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { Customer } from '../../domain/models/customer.model';
import { DocumentTypeEnum } from '../../domain/resources/document-type.enum';

export const CUSTOMER_REPOSITORY_PORT = Symbol('CUSTOMER_REPOSITORY_PORT');

export interface UpsertCustomerCommand {
  readonly email: string;
  readonly fullName: string;
  readonly document: string;
  readonly documentType: DocumentTypeEnum;
  readonly phoneNumber: string;
}

export interface CustomerRepositoryPort {
  /** Customers are identified by email; repeated checkouts reuse the record. */
  upsertByEmail(
    command: UpsertCustomerCommand,
  ): ResultAsync<Customer, DomainError>;
  findById(id: string): ResultAsync<Customer | null, DomainError>;
  findByEmail(email: string): ResultAsync<Customer | null, DomainError>;
}
