import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { getOrSetCache, CACHE_TTL } from '../services/cache.service';

/**
 * Enterprise RBAC Middleware
 * Validates user permissions before allowing route access
 */

export const requirePermission = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user: any = req.user;
      
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized access' });
      }

      // Check if user has permission
      const hasPermission = await checkUserPermission(user.id, action, resource);

      if (hasPermission) {
        return next();
      }

      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: Missing required permission [${action}:${resource}]` 
      });
    } catch (error) {
      console.error('RBAC Error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error evaluating permissions' });
    }
  };
};

/**
 * Alias for requirePermission with different parameter order
 */
export const checkPermission = (resource: string, action: string) => {
  return requirePermission(action, resource);
};

/**
 * Checks if a user has a specific permission
 * Uses Redis caching to optimize database queries
 */
export async function checkUserPermission(userId: string, action: string, resource: string): Promise<boolean> {
  const cacheKey = `rbac:${userId}:${action}:${resource}`;

  return getOrSetCache(
    cacheKey,
    async () => {
      // 1. Get user to check legacy role
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role === 'admin' || user?.role === 'owner') return true;

      // 2. Get all roles for the user
      const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      });

      // 2. Check if any of the roles have the requested permission
      for (const ur of userRoles) {
        // Also check if user has 'admin' role, grant universal access
        if (ur.role.name === 'admin' || ur.role.name === 'owner') return true;

        const hasPerm = ur.role.permissions.some(
          (rp: any) => rp.permission.action === action && rp.permission.resource === resource
        );
        if (hasPerm) return true;
      }

      return false;
    },
    CACHE_TTL.SHORT // Cache for 1 minute to allow quick permission updates
  );
}

/**
 * Segregation of Duties (SoD) Validator
 * Prevents users from performing conflicting actions (e.g., creating and approving the same invoice)
 */
export async function validateSoD(userId: string, actions: string[], resource: string): Promise<boolean> {
  let matchedActions = 0;
  
  for (const action of actions) {
    const hasPerm = await checkUserPermission(userId, action, resource);
    if (hasPerm) {
      matchedActions++;
    }
  }

  // If user has more than 1 conflicting permission (e.g., 'create' AND 'approve'), SoD is violated
  return matchedActions <= 1;
}

export const enforceSoD = (conflictingActions: string[], resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user: any = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized access' });

    const isSoDCompliant = await validateSoD(user.id, conflictingActions, resource);

    if (!isSoDCompliant) {
      return res.status(403).json({ 
        success: false, 
        message: `Segregation of Duties Violation: You cannot possess both [${conflictingActions.join(', ')}] permissions for ${resource}` 
      });
    }

    return next();
  };
};
