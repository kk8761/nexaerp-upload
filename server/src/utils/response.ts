/**
 * Response Utility
 * Standardized API response formats
 */

import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: string[];
}

export class ResponseHandler {
  static success<T>(res: Response, data: T, message?: string, statusCode = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
    };

    if (message) {
      response.message = message;
    }

    res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode = 500, errors?: string[]): void {
    const response: ApiResponse = {
      success: false,
      error: message,
    };

    if (errors) {
      response.errors = errors;
    }

    res.status(statusCode).json(response);
  }

  static validationError(res: Response, errors: string[]): void {
    this.error(res, 'Validation failed', 400, errors);
  }

  static notFound(res: Response, resource = 'Resource'): void {
    this.error(res, `${resource} not found`, 404);
  }

  static unauthorized(res: Response, message = 'Unauthorized'): void {
    this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden'): void {
    this.error(res, message, 403);
  }
}
