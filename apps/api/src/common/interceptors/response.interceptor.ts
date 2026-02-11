import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Wraps every successful response in the standard API envelope:
 * { success: true, data: <original response>, meta?: <pagination> }
 *
 * Controllers return raw data. This interceptor wraps it automatically.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // If the data already has our envelope structure, don't double-wrap
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // If the data has a meta field (pagination), extract it
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            data: data.data,
            meta: data.meta,
          };
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
