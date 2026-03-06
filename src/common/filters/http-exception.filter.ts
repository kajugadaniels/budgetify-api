import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();
      const normalized =
        typeof errorResponse === 'string'
          ? {
              statusCode: status,
              error: HttpStatus[status] ?? 'Error',
              message: errorResponse,
            }
          : (errorResponse as Record<string, unknown>);

      response.status(status).json({
        statusCode: normalized.statusCode ?? status,
        error: normalized.error ?? HttpStatus[status] ?? 'Error',
        message: normalized.message ?? 'Request failed.',
        path: request.url,
        timestamp: new Date().toISOString(),
      });

      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Unexpected server error.',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
