import { HttpException } from '@nestjs/common';
import { ResultAsync } from 'neverthrow';
import { DomainError } from '../../../../domain/errors/domain-error';
import { toHttpStatus } from './domain-error.mapper';

/**
 * Collapses the Railway Oriented pipeline into an HTTP response at the very
 * edge of the application: success values are returned, failures become
 * HttpExceptions with a stable error code in the body.
 */
export const unwrapOrThrow = async <T>(
  result: ResultAsync<T, DomainError>,
): Promise<T> => {
  const outcome = await result;

  return outcome.match(
    (value) => value,
    (error) => {
      throw new HttpException(
        { code: error.code, message: error.message, details: error.details ?? null },
        toHttpStatus(error),
      );
    },
  );
};
