import { fromPrisma } from './persistence.helper';
import { DomainErrorCode } from '../../../domain/errors/domain-error';

describe('fromPrisma', () => {
  it('keeps a resolved value on the success track', async () => {
    const result = await fromPrisma(Promise.resolve({ id: 1 }), 'ctx');

    expect(result._unsafeUnwrap()).toEqual({ id: 1 });
  });

  it('wraps a rejection as a persistence error with its context', async () => {
    const result = await fromPrisma(Promise.reject(new Error('boom')), 'Unable to read');

    expect(result._unsafeUnwrapErr().code).toBe(DomainErrorCode.PERSISTENCE_ERROR);
    expect(result._unsafeUnwrapErr().message).toBe('Unable to read: boom');
  });
});
