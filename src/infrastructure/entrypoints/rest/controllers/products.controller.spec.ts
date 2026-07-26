import { HttpException } from '@nestjs/common';
import { errAsync, okAsync } from 'neverthrow';
import { ProductsController } from './products.controller';
import { DomainError } from '../../../../domain/errors/domain-error';
import { aProduct } from '../../../../test-support/builders';

describe('ProductsController', () => {
  const listProducts = { execute: jest.fn() };
  const getProduct = { execute: jest.fn() };
  const controller = new ProductsController(
    listProducts as never,
    getProduct as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('maps the catalogue to response DTOs', async () => {
    listProducts.execute.mockReturnValue(okAsync([aProduct()]));

    const response = await controller.findAll();

    expect(response).toEqual([
      expect.objectContaining({ id: 'prod-1', priceInCents: 100_000, stock: 10 }),
    ]);
  });

  it('maps a single product', async () => {
    getProduct.execute.mockReturnValue(okAsync(aProduct()));

    expect((await controller.findOne('prod-1')).name).toBe('Pro Running Shoes');
  });

  it('turns a domain failure into an HttpException', async () => {
    getProduct.execute.mockReturnValue(errAsync(DomainError.productNotFound('x')));

    await expect(controller.findOne('x')).rejects.toBeInstanceOf(HttpException);
  });
});
