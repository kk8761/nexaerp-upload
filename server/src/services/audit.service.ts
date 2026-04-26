import prisma from '../config/prisma';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Create an immutable audit log entry
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          details: entry.details,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent
        }
      });
    } catch (error) {
      console.error('Audit Log Error (Failed to persist):', error);
      // We don't typically throw here to avoid failing the main transaction
      // but in strict compliance environments, we might want to fail the whole request
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination
   */
  static async search(filters: any, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
      if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' }
      })
    ]);

    return { total, page, pages: Math.ceil(total / limit), data: logs };
  }

  /**
   * Apply data retention policy (keep logs for 7 years)
   */
  static async applyRetentionPolicy(): Promise<void> {
    const sevenYearsAgo = new Date();
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

    try {
      // Archive logs older than 7 years before deleting (mocking archive logic)
      // Delete the logs
      const result = await prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: sevenYearsAgo
          }
        }
      });
      console.log(`Audit retention applied. Deleted ${result.count} old records.`);
    } catch (error) {
      console.error('Error applying audit retention policy:', error);
    }
  }
}
