// Global shared types

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;
  errors?: Record<string, string[]>;
}

export type ID = string | number;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type UnknownRecord = Record<string, unknown>;
