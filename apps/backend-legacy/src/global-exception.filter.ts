import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    // 1. Handle NestJS HttpExceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody = exception.getResponse() as any;
      
      if (typeof resBody === 'object' && resBody !== null) {
        message = resBody.message || exception.message;
        error = resBody.error || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    }
    // 2. Fallback for unhandled native/generic Errors
    else {
      const err = exception as Error;
      this.logger.error(
        `Unhandled exception caught: ${err?.message || exception}`,
        err?.stack,
      );
      
      if (process.env.NODE_ENV !== 'production' || true) {
        message = err?.message || String(exception);
        error = err?.name || 'Error';
      }
    }

    // Clean validation messages array (flatten if nested)
    if (Array.isArray(message)) {
      message = message.map((m) => String(m));
    }

    const payload = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(payload);
  }
}
