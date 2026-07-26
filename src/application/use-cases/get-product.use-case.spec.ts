import { okAsync } from 'neverthrow';
import { GetProductUseCase } from './get-product.use-case';
import { DomainErrorCode } from '../../domain/errors/domain-error';
import { aProduct } from '../../test-support/builders';

describe('GetProductUseCase', () => {
  it('returns the product when it exists', async () => {
    const repository = {
      findById: jest.fn().mockReturnValue(okAsync(aProduct())),
    };

    const result = await new GetProductUseCase(repository as never).execute(
      'prod-1',
    );

    expect(result._unsafeUnwrap().id).toBe('prod-1');
  });

  it('fails when the product does not exist', async () => {
    const repository = { findById: jest.fn().mockReturnValue(okAsync(null)) };

    const result = await new GetProductUseCase(repository as never).execute(
      'missing',
    );

    expect(result._unsafeUnwrapErr().code).toBe(
      DomainErrorCode.PRODUCT_NOT_FOUND,
    );
  });
});
