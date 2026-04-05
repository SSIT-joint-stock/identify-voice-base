import { BaseClientError } from './base';

/**
 * Unauthorized Error Class
 * Represents 401 Unauthorized errors following API structure guidelines
 */
export class UnauthorizedError extends BaseClientError {
  constructor(
    message: string = 'Authentication required',
    code: string = 'UNAUTHORIZED',
    details: Record<string, unknown> = {},
  ) {
    super(message, 401, code, details);
  }
}

export default UnauthorizedError;
