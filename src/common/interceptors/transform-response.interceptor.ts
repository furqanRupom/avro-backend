import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        // If data is already in standardized ApiResponse format, return as-is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'statusCode' in data
        ) {
          return data;
        }

        let message = 'Operation successful';
        let responseData = data;

        // Check if data is an object with message and data fields
        if (
          data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          ('message' in data || 'data' in data)
        ) {
          if (typeof data.message === 'string') {
            message = data.message;
          }
          if ('data' in data) {
            responseData = data.data;
          }
        }

        return {
          success: true,
          statusCode: response.statusCode,
          message,
          data: responseData,
          timestamp: new Date().toISOString(),
          path: request.originalUrl || request.url,
        };
      }),
    );
  }
}
