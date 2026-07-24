import { LoggerService } from '@/common/logger/logger.service';
import {
  BadGatewayException,
  GatewayTimeoutException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const appError = jest.fn();
  const appWarn = jest.fn();
  const httpError = jest.fn();
  const httpWarn = jest.fn();
  const appLogger = {
    error: appError,
    warn: appWarn,
  } as unknown as LoggerService;
  const httpLogger = {
    error: httpError,
    warn: httpWarn,
  } as unknown as LoggerService;

  let filter: AllExceptionsFilter;
  let request: Partial<Request>;
  let response: Partial<Response>;
  let host: ArgumentsHost;
  let responseBody: unknown;
  let responseStatus: number | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    responseBody = undefined;
    responseStatus = undefined;
    request = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      query: {},
      params: {},
      body: {},
      headers: {},
      cookies: {},
      get: jest.fn().mockReturnValue('jest'),
    };
    response = {
      statusCode: 200,
      status: jest.fn((status: number) => {
        responseStatus = status;
        response.statusCode = status;
        return response as Response;
      }),
      json: jest.fn((body: unknown) => {
        responseBody = body;
        return response as Response;
      }),
    };
    host = {
      switchToHttp: () => ({
        getRequest: () => request as Request,
        getResponse: () => response as Response,
        getNext: jest.fn(),
      }),
    } as unknown as ArgumentsHost;
    filter = new AllExceptionsFilter(appLogger, httpLogger);
  });

  it('không trả message nội bộ hoặc stack trace cho client', () => {
    filter.catch(new Error('database password leaked in stack'), host);

    expect(responseStatus).toBe(500);
    expect(responseBody).toMatchObject({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    expect(JSON.stringify(responseBody)).not.toContain('database password');
    expect(JSON.stringify(responseBody)).not.toContain('stack');
    expect(httpError).toHaveBeenCalled();
  });

  it.each([
    [new PayloadTooLargeException('File quá lớn'), 413, 'PAYLOAD_TOO_LARGE'],
    [new BadGatewayException('AI Core lỗi'), 502, 'BAD_GATEWAY'],
    [
      new ServiceUnavailableException('Storage không sẵn sàng'),
      503,
      'SERVICE_UNAVAILABLE',
    ],
    [new GatewayTimeoutException('AI Core timeout'), 504, 'GATEWAY_TIMEOUT'],
  ])('giữ đúng status và mã lỗi cho %s', (exception, status, code) => {
    filter.catch(exception, host);

    expect(responseStatus).toBe(status);
    expect(responseBody).toMatchObject({
      success: false,
      error: { code },
    });
  });
});
