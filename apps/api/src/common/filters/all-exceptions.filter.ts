import { LoggerService } from '@/common/logger/logger.service';
import { CONTEXT_LOGGER_TOKEN } from '@/common/logger/logger.token';
import {
  BadRequestError,
  BaseClientError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from '@/common/response/client-errors';
import {
  BaseServerError,
  InternalServerError,
} from '@/common/response/server-errors';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { HttpLogInterceptor } from '../interceptors/http-logger.interceptor';

@Catch()
export class AllExceptionsFilter
  extends HttpLogInterceptor
  implements ExceptionFilter
{
  constructor(
    @Inject(CONTEXT_LOGGER_TOKEN('APP'))
    private readonly appLogger: LoggerService,
    @Inject(CONTEXT_LOGGER_TOKEN('HTTP'))
    private readonly httpLogger: LoggerService,
  ) {
    super(httpLogger);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default to internal server error
    let error: BaseClientError | BaseServerError;
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    // Handle different types of exceptions
    if (
      exception instanceof BaseClientError ||
      exception instanceof BaseServerError ||
      (typeof exception === 'object' &&
        exception !== null &&
        'statusCode' in exception &&
        'toResponse' in exception)
    ) {
      // Already using our error classes or duck-typed matching, use as is
      const duckTypedError = exception as {
        statusCode: number;
        toResponse: () => any;
      };
      error = duckTypedError as unknown as BaseClientError | BaseServerError;
      status = duckTypedError.statusCode;
    } else if (exception instanceof HttpException) {
      // Convert NestJS HttpException to our error classes
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      let message: string;
      let details: Record<string, unknown> | undefined;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const obj = exceptionResponse as Record<string, unknown>;
        message = (obj.message as string) ?? (obj.error as string) ?? 'Error';

        if (Array.isArray(obj.message)) {
          details = { validationErrors: obj.message };
          message = 'Validation failed';
        }
      } else {
        message = exception.message;
      }

      // Map HTTP status code to appropriate error class
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          error = new BadRequestError(message, 'BAD_REQUEST', details);
          break;
        case HttpStatus.UNAUTHORIZED:
          error = new UnauthorizedError(message, 'UNAUTHORIZED', details);
          break;
        case HttpStatus.FORBIDDEN:
          error = new ForbiddenError(message, 'FORBIDDEN', details);
          break;
        case HttpStatus.NOT_FOUND:
          error = new NotFoundError(message, 'NOT_FOUND', details);
          break;
        case HttpStatus.CONFLICT:
          error = new ConflictError(message, 'CONFLICT', details);
          break;
        case HttpStatus.UNPROCESSABLE_ENTITY:
          error = new ValidationError(message, 'VALIDATION_ERROR', details);
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          error = new RateLimitError(message, 'RATE_LIMIT', details);
          break;
        default:
          error = new InternalServerError(message, 'INTERNAL_ERROR', details);
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma errors
      status = HttpStatus.BAD_REQUEST;
      let message = `Database error: ${exception.code}`;
      let code = 'DATABASE_ERROR';

      // Map common Prisma error codes to more specific messages
      switch (exception.code) {
        case 'P2002':
          message = 'Unique constraint violation';
          code = 'UNIQUE_CONSTRAINT';
          break;
        case 'P2025':
          message = 'Record not found';
          code = 'RECORD_NOT_FOUND';
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2003':
          message = 'Foreign key constraint violation';
          code = 'FOREIGN_KEY_CONSTRAINT';
          break;
      }

      const details: Record<string, unknown> = {
        prismaCode: exception.code,
      };

      if (
        exception.meta &&
        typeof exception.meta === 'object' &&
        'target' in exception.meta
      ) {
        details.target = exception.meta.target;
      }

      error = new BadRequestError(message, code, details);
    } else if (exception instanceof Error) {
      // Handle generic Error objects
      error = new InternalServerError(
        exception.message || 'Internal server error',
        'INTERNAL_ERROR',
        { stack: exception.stack },
      );
    } else {
      // Handle unknown errors
      error = new InternalServerError(
        'Unknown error occurred',
        'UNKNOWN_ERROR',
      );
    }

    // Send the error response
    response.status(status);

    // Log detailed error information
    this.logError(request, response, error, exception);

    response.json(error.toResponse());
  }

  private logError(
    request: Request,
    response: Response,
    error: BaseClientError | BaseServerError,
    originalException: unknown,
  ): void {
    const requestId = request.requestId;
    const requestMeta = this.getRequestMeta(request, response, requestId);
    // Client errors (4xx) are logged as warnings, server errors (5xx) as errors
    if (error.statusCode >= 500) {
      this.httpLogger.error(`Server error: ${error.message}`, {
        ...requestMeta,
        statusCode: error.statusCode, // Added statusCode
        stack:
          originalException instanceof Error
            ? originalException.stack
            : undefined,
        details: error.details,
      });
    } else if (error.statusCode >= 400) {
      this.httpLogger.warn(`Client error: ${error.message}`, {
        ...requestMeta,
        details: error.details,
      });
    }
  }
}
