import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const startedAt = Date.now();
    const requestId = request.headers['x-request-id'] || randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    const log = (status: number) => {
      this.logger.log(JSON.stringify({
        requestId,
        method: request.method,
        route: request.originalUrl || request.url,
        status,
        latencyMs: Date.now() - startedAt,
        userId: request.user?.id || null,
        activeRole: request.headers['x-active-role'] || null,
      }));
    };

    return next.handle().pipe(
      tap(() => log(response.statusCode)),
      catchError((error) => {
        log(error?.status || response.statusCode || 500);
        throw error;
      }),
    );
  }
}
