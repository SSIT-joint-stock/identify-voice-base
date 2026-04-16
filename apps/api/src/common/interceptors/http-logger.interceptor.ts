import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { LoggerService } from '@/common/logger/logger.service';
import { CONTEXT_LOGGER_TOKEN } from '@/common/logger/logger.token';
import { RequestMeta } from '@/common/types/request.type';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class HttpLogInterceptor implements NestInterceptor {
  private readonly MAX_TEXT = 4096;
  private readonly SENSITIVE_FIELDS_BODY = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'key',
    'authorization',
  ];
  private readonly SENSITIVE_FIELDS_HEADERS = [
    'authorization',
    'cookie',
    'session',
    'user',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'key',
  ];
  constructor(
    @Inject(CONTEXT_LOGGER_TOKEN('HTTP'))
    private readonly logger: LoggerService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const http = ctx.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const start = performance.now();
    const requestId = this.generateRequestId();

    // Attach request ID to request object for use in other parts of the app
    req.requestId = requestId;

    return next.handle().pipe(
      tap((data) => {
        const ms = performance.now() - start;
        const requestMeta = this.getRequestMeta(req, res, requestId);
        // Log successful response
        this.logger.info(`Response sent`, {
          ...requestMeta,
          durationMs: `${ms.toFixed(2)}ms`,
          responseSize: this.getApproximateSize(data),
        });
      }),
      catchError((error) => {
        const ms = performance.now() - start;
        const requestMeta = this.getRequestMeta(req, res, requestId);
        // Log error response
        this.logger.error(`Request failed ${error.message}`, {
          ...requestMeta,
          statusCode: error.statusCode || error.status || 500,
          error: error.message,
          durationMs: `${ms.toFixed(2)}ms`,
        });

        // Re-throw the error so it can be handled by the exception filter
        throw error;
      }),
    );
  }

  private generateRequestId(): string {
    // Generate a simple unique ID
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // List of sensitive fields to mask
    const sensitiveFields = this.SENSITIVE_FIELDS_BODY;

    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized = { ...headers };

    // List of sensitive fields to mask
    const sensitiveFields = this.SENSITIVE_FIELDS_HEADERS;

    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getApproximateSize(data: any): string {
    if (!data) return '0B';

    try {
      const jsonString = JSON.stringify(data);
      const bytes = new TextEncoder().encode(jsonString).length;

      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)}KB`;
      return `${(bytes / 1048576).toFixed(2)}MB`;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return 'unknown';
    }
  }

  private maybeTruncate(v: any) {
    try {
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      return s.length > this.MAX_TEXT
        ? s.slice(0, this.MAX_TEXT) + '…[truncated]'
        : s;
    } catch {
      return '[Unserializable]';
    }
  }

  protected getRequestMeta(
    request: Request,
    response: Response,
    requestId: string,
  ): RequestMeta {
    const requestMeta: RequestMeta = {
      requestId,
      method: request.method,
      url: request.url,
      ip: request.ip || 'unknown',
      userAgent: request.get('user-agent') || 'unknown',
      query: this.maybeTruncate(request.query || {}),
      params: this.maybeTruncate(request.params || {}),
      body: this.maybeTruncate(this.sanitizeBody(request.body || {})),
      headers: this.maybeTruncate(this.sanitizeHeaders(request.headers || {})),
      cookies: this.maybeTruncate(request.cookies || {}),
      session: this.maybeTruncate(request.session || {}),
      user: this.maybeTruncate(request.user || {}),
      statusCode: response.statusCode,
      durationMs: '0ms',
      responseSize: '0B',
    };
    return requestMeta;
  }

  private logRequest(request: Request, response: Response, start: number) {
    const ms = performance.now() - start;
    const requestId = this.generateRequestId();
    const requestMeta = this.getRequestMeta(request, response, requestId);
    this.logger.info(`Request received`, {
      ...requestMeta,
      durationMs: `${ms.toFixed(2)}ms`,
      responseSize: response.getHeader('content-length') || '0B',
    });
  }
}
