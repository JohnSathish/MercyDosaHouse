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
export class ProductionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttp ? exception.getResponse() : null;
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] })?.message;

    const clientMessage = Array.isArray(message)
      ? message.join(', ')
      : typeof message === 'string'
        ? message
        : status >= 500
          ? 'An unexpected error occurred. Please try again.'
          : 'Request could not be processed.';

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const isProduction = process.env.NODE_ENV === 'production';

    response.status(status).json({
      statusCode: status,
      message:
        isProduction && status >= 500
          ? 'An unexpected error occurred. Please try again.'
          : clientMessage,
      error: isHttp ? (exception as HttpException).name : 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(isProduction
        ? {}
        : { debug: exception instanceof Error ? exception.message : String(exception) }),
    });
  }
}
