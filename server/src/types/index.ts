/**
 * Shared TypeScript Types
 * Common types used across the application
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

export type UserRole = 'admin' | 'manager' | 'user';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface QueryOptions {
  sort?: string;
  fields?: string;
  page?: number;
  limit?: number;
}
