import { BaseClientError } from './base';

/**
 * Unprocessable Entity Error Class
 * Represents 422 Unprocessable Entity errors following API structure guidelines
 */
export class ValidationError extends BaseClientError {
  constructor(
    message: string = 'Validation failed',
    code: string = 'VALIDATION_ERROR',
    details: Record<string, unknown> = {},
  ) {
    super(message, 422, code, details);
  }
}

export default ValidationError;
