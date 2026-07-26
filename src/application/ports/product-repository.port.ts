import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { Product } from '../../domain/models/product.model';

export const PRODUCT_REPOSITORY_PORT = Symbol('PRODUCT_REPOSITORY_PORT');

export interface ProductRepositoryPort {
  findAll(): ResultAsync<Product[], DomainError>;
  findById(id: string): ResultAsync<Product | null, DomainError>;
  /** Atomically decrements stock; fails if not enough units remain. */
  decrementStock(
    id: string,
    quantity: number,
  ): ResultAsync<Product, DomainError>;
}
