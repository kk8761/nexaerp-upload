/**
 * Prisma Middleware
 * Automatically handles audit fields and other cross-cutting concerns
 */

import { PrismaClient } from '@prisma/client';

type MiddlewareParams = {
  model?: string;
  action: string;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

type MiddlewareNext = (params: MiddlewareParams) => Promise<any>;

type Middleware = (params: MiddlewareParams, next: MiddlewareNext) => Promise<any>;

/**
 * Audit middleware that automatically sets createdAt, updatedAt, createdBy, updatedBy
 */
export function auditMiddleware(userId?: string): Middleware {
  return async (params: MiddlewareParams, next: MiddlewareNext) => {
    const now = new Date();

    // Handle create operations
    if (params.action === 'create') {
      if (params.args.data) {
        params.args.data = {
          ...params.args.data,
          createdAt: params.args.data.createdAt || now,
          updatedAt: params.args.data.updatedAt || now,
          ...(userId && {
            createdBy: params.args.data.createdBy || userId,
            updatedBy: params.args.data.updatedBy || userId,
          }),
        };
      }
    }

    // Handle update operations
    if (params.action === 'update' || params.action === 'updateMany') {
      if (params.args.data) {
        params.args.data = {
          ...params.args.data,
          updatedAt: now,
          ...(userId && { updatedBy: userId }),
        };
      }
    }

    // Handle upsert operations
    if (params.action === 'upsert') {
      if (params.args.create) {
        params.args.create = {
          ...params.args.create,
          createdAt: params.args.create.createdAt || now,
          updatedAt: params.args.create.updatedAt || now,
          ...(userId && {
            createdBy: params.args.create.createdBy || userId,
            updatedBy: params.args.create.updatedBy || userId,
          }),
        };
      }
      if (params.args.update) {
        params.args.update = {
          ...params.args.update,
          updatedAt: now,
          ...(userId && { updatedBy: userId }),
        };
      }
    }

    return next(params);
  };
}

/**
 * Soft delete middleware
 * Converts delete operations to updates that set isDeleted flag
 */
export function softDeleteMiddleware(userId?: string): Middleware {
  return async (params: MiddlewareParams, next: MiddlewareNext) => {
    // Check if the model has soft delete fields
    const modelsWithSoftDelete = ['User', 'Product', 'Order']; // Add models that support soft delete

    if (modelsWithSoftDelete.includes(params.model || '')) {
      // Convert delete to update
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = {
          isDeleted: true,
          deletedAt: new Date(),
          ...(userId && { deletedBy: userId }),
        };
      }

      // Convert deleteMany to updateMany
      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        params.args.data = {
          isDeleted: true,
          deletedAt: new Date(),
          ...(userId && { deletedBy: userId }),
        };
      }

      // Filter out soft deleted records in find operations
      if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.args.where = {
          ...params.args.where,
          isDeleted: false,
        };
      }

      if (params.action === 'findMany') {
        if (params.args.where) {
          if (params.args.where.isDeleted === undefined) {
            params.args.where.isDeleted = false;
          }
        } else {
          params.args.where = { isDeleted: false };
        }
      }
    }

    return next(params);
  };
}

/**
 * Logging middleware for debugging
 */
export function loggingMiddleware(): Middleware {
  return async (params: MiddlewareParams, next: MiddlewareNext) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Prisma] ${params.model}.${params.action} took ${after - before}ms`
      );
    }

    return result;
  };
}

/**
 * Error handling middleware
 */
export function errorHandlingMiddleware(): Middleware {
  return async (params: MiddlewareParams, next: MiddlewareNext) => {
    try {
      return await next(params);
    } catch (error) {
      // Log the error with context
      console.error('[Prisma Error]', {
        model: params.model,
        action: params.action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Apply all middleware to Prisma client
 * Note: Prisma v7.8.0 removed $use middleware API
 * Middleware functionality is disabled until migration to Prisma extensions
 */
export function applyMiddleware(
  _prisma: PrismaClient,
  _options: { userId?: string; enableLogging?: boolean } = {}
) {
  // Middleware API ($use) was removed in Prisma v7.8.0
  // TODO: Migrate to Prisma Client Extensions when needed
  // For now, audit fields should be handled in application code
  console.log('⚠️  Prisma middleware disabled (v7.8.0+ uses extensions instead)');
}
