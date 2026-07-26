import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ example: 'PRODUCT_NOT_FOUND' })
  code!: string;

  @ApiProperty({ example: 'Product 3f8a1c22 does not exist.' })
  message!: string;

  @ApiPropertyOptional({ nullable: true, type: Object })
  details!: Record<string, unknown> | null;
}

/**
 * Envelope applied to every response of the API.
 *
 * Controllers keep returning plain domain payloads; the envelope is added by
 * ResponseEnvelopeInterceptor on success and by ResponseEnvelopeExceptionFilter
 * on failure, so the shape stays consistent without duplicating code.
 */
export class ApiResponseDto<T> {
  @ApiPropertyOptional({ nullable: true })
  result!: T | null;

  @ApiProperty({ example: 5, description: 'Items included in this response.' })
  totalItemsReturned!: number;

  @ApiProperty({ example: 5, description: 'Items matching the query in the database.' })
  totalItemsInDataBase!: number;

  @ApiProperty({ type: [ApiErrorDto] })
  errors!: ApiErrorDto[];

  @ApiProperty({ example: true })
  isSuccess!: boolean;

  @ApiProperty({ example: false })
  hasErrors!: boolean;
}

export const buildSuccessEnvelope = <T>(result: T): ApiResponseDto<T> => {
  const count = Array.isArray(result) ? result.length : result === null || result === undefined ? 0 : 1;

  return {
    result: result ?? null,
    totalItemsReturned: count,
    totalItemsInDataBase: count,
    errors: [],
    isSuccess: true,
    hasErrors: false,
  };
};

export const buildErrorEnvelope = (errors: ApiErrorDto[]): ApiResponseDto<null> => ({
  result: null,
  totalItemsReturned: 0,
  totalItemsInDataBase: 0,
  errors,
  isSuccess: false,
  hasErrors: true,
});
