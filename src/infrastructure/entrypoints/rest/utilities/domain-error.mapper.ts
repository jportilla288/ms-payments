import { HttpStatus } from '@nestjs/common';
import {
  DomainError,
  DomainErrorCode,
} from '../../../../domain/errors/domain-error';

const STATUS_BY_CODE: Readonly<Record<DomainErrorCode, HttpStatus>> = {
  [DomainErrorCode.PRODUCT_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [DomainErrorCode.TRANSACTION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [DomainErrorCode.INSUFFICIENT_STOCK]: HttpStatus.CONFLICT,
  [DomainErrorCode.TRANSACTION_ALREADY_FINALIZED]: HttpStatus.CONFLICT,
  [DomainErrorCode.INVALID_CARD]: HttpStatus.UNPROCESSABLE_ENTITY,
  [DomainErrorCode.INVALID_QUANTITY]: HttpStatus.UNPROCESSABLE_ENTITY,
  [DomainErrorCode.INVALID_WEBHOOK_SIGNATURE]: HttpStatus.UNAUTHORIZED,
  [DomainErrorCode.GATEWAY_ERROR]: HttpStatus.BAD_GATEWAY,
  [DomainErrorCode.PERSISTENCE_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * The single place where a domain failure becomes an HTTP status.
 * Controllers stay free of business branching.
 */
export const toHttpStatus = (error: DomainError): HttpStatus =>
  STATUS_BY_CODE[error.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
