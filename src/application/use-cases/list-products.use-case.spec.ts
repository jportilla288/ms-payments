import { errAsync, okAsync } from 'neverthrow';
import { ListProductsUseCase } from './list-products.use-case';
import { DomainError, DomainErrorCode } from '../../domain/errors/domain-error';
import { aProduct } from '../../test-support/builders';

describe('ListProductsUseCase', () => {
  it('returns the catalogue', async () => {
    const repository = { findAll: jest.fn().mockReturnValue(okAsync([aProduct()])) };

    const result = await new ListProductsUseCase(repository as never).execute();

    expect(result._unsafeUnwrap()).toHaveLength(1);
  });

  it('propagates a persistence failure', async () => {
    const repository = {
      findAll: jest.fn().mockReturnValue(errAsync(DomainError.persistence('down'))),
    };

    const result = await new ListProductsUseCase(repository as never).execute();

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.PERSISTENCE_ERROR);
  });
});
