import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';

/**
 * Audit Middleware
 * Automatically logs actions for protected endpoints
 * 
 * Captures:
 * - CREATE: User, timestamp, initial values
 * - UPDATE: User, timestamp, old values (from response), new values (from request)
 * - DELETE: User, timestamp, deleted values (from response)
 * 
 * Requirements: 5.7, 24.1, 24.2, 24.3
 */
export const auditLog = (action: string, entity: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original response methods to intercept response data
    const originalJson = res.json.bind(res);
    let responseData: any = null;

    // Intercept res.json to capture response data (contains old values for updates/deletes)
    res.json = function (data: any) {
      responseData = data;
      return originalJson(data);
    };

    // Intercept response finish event to ensure we only log successful actions
    res.on('finish', () => {
      const user: any = req.user;
      const status = res.statusCode;

      // Extract entity ID if present in params (e.g. /users/:id)
      const entityId = req.params.id || req.body?.id || undefined;

      // We might want to log successful changes (200, 201) and errors
      const fullAction = status >= 400 ? `${action}_FAILED` : action;

      // Build details object based on action type
      const details: any = {
        method: req.method,
        url: req.originalUrl,
        status
      };

      // For CREATE: log initial values (new data)
      if (action === 'CREATE' && req.method !== 'GET') {
        details.newValues = req.body;
      }

      // For UPDATE: log both old and new values
      if (action === 'UPDATE' && req.method !== 'GET') {
        details.oldValues = responseData?.data?.before || responseData?.before;
        details.newValues = req.body;
      }

      // For DELETE: log deleted values
      if (action === 'DELETE') {
        details.deletedValues = responseData?.data || responseData;
      }

      // For other actions, log request body if not GET
      if (!['CREATE', 'UPDATE', 'DELETE'].includes(action) && req.method !== 'GET') {
        details.body = req.body;
      }

      AuditService.log({
        userId: user?.id,
        action: fullAction,
        entity,
        entityId,
        details,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('User-Agent')
      });
    });

    next();
  };
};
