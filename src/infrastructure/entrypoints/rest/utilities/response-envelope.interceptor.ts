import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponseDto, buildSuccessEnvelope } from '../dtos/api-response.dto';

/** Wraps every successful controller payload in the standard envelope. */
@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(map((payload) => buildSuccessEnvelope(payload)));
  }
}
