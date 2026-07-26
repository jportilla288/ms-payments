import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../../domain/errors/domain-error';

/** Lifts a Prisma promise onto the Result track with a domain-level error. */
export const fromPrisma = <T>(
  promise: Promise<T>,
  context: string,
): ResultAsync<T, DomainError> =>
  ResultAsync.fromPromise(promise, (cause) =>
    DomainError.persistence(`${context}: ${(cause as Error).message}`),
  );
