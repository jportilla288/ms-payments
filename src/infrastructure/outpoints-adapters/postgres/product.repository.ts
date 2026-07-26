import { Injectable } from '@nestjs/common';
import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import { DomainError } from '../../../domain/errors/domain-error';
import { Product } from '../../../domain/models/product.model';
import { ProductRepositoryPort } from '../../../application/ports/product-repository.port';
import { PrismaService } from './prisma.service';
import { fromPrisma } from './persistence.helper';
import { toProductModel } from './prisma.mappers';

@Injectable()
export class PostgresProductRepository implements ProductRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): ResultAsync<Product[], DomainError> {
    return fromPrisma(
      this.prisma.product.findMany({ orderBy: { name: 'asc' } }),
      'Unable to list products',
    ).map((rows) => rows.map(toProductModel));
  }

  findById(id: string): ResultAsync<Product | null, DomainError> {
    return fromPrisma(
      this.prisma.product.findUnique({ where: { id } }),
      'Unable to load product',
    ).map((row) => (row === null ? null : toProductModel(row)));
  }

  /**
   * Conditional update: the `stock: { gte: quantity }` filter makes the
   * decrement atomic, so two concurrent checkouts cannot oversell.
   */
  decrementStock(
    id: string,
    quantity: number,
  ): ResultAsync<Product, DomainError> {
    return fromPrisma(
      this.prisma.product.updateMany({
        where: { id, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      }),
      'Unable to update stock',
    )
      .andThen((result) =>
        result.count === 0
          ? errAsync(DomainError.insufficientStock(0, quantity))
          : okAsync(true as const),
      )
      .andThen(() => this.findById(id))
      .andThen((product) =>
        product === null
          ? errAsync(DomainError.productNotFound(id))
          : okAsync(product),
      );
  }
}
