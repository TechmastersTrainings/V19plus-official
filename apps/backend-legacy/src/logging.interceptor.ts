import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logger.log(
            `${method} ${url} - ${statusCode} - ${duration}ms`,
          );
        },
        error: (err: any) => {
          const duration = Date.now() - startTime;
          const statusCode = err?.status || 500;
          this.logger.warn(
            `${method} ${url} - ${statusCode} - ${duration}ms - Error: ${err?.message || 'Unknown'}`,
          );
        },
      }),
    );
  }
}
