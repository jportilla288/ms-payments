import { Inject, Injectable } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../domain/errors/domain-error';
import { Product } from '../../domain/models/product.model';
import { PRODUCT_REPOSITORY_PORT } from '../ports/product-repository.port';
import type { ProductRepositoryPort } from '../ports/product-repository.port';

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  execute(): ResultAsync<Product[], DomainError> {
    return this.productRepository.findAll();
  }
}
