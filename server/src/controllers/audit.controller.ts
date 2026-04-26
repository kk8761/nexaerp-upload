import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import prisma from '../config/prisma';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

/**
 * Audit Log Controller
 * Handles audit log search, export, and retention
 * Requirements: 24.4, 24.5, 24.6, 24.8
 */

export class AuditController {
  /**
   * Search audit logs with filters and pagination
   * Requirements: 24.5
   */
  static async searchAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        action,
        entity,
        entityId,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;

      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (action) filters.action = action as string;
      if (entity) filters.entity = entity as string;
      if (entityId) filters.entityId = entityId as string;
      if (startDate) filters.startDate = startDate as string;
      if (endDate) filters.endDate = endDate as string;

      const result = await AuditService.search(
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: parseInt(limit as string),
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error: any) {
      console.error('Audit search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search audit logs',
        error: error.message
      });
    }
  }

  /**
   * Export audit logs in various formats (CSV, JSON, PDF)
   * Requirements: 24.8
   */
  static async exportAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        action,
        entity,
        entityId,
        startDate,
        endDate,
        format = 'csv'
      } = req.query;

      const filters: any = {};
      if (userId) filters.userId = userId as string;
      if (action) filters.action = action as string;
      if (entity) filters.entity = entity as string;
      if (entityId) filters.entityId = entityId as string;
      if (startDate) filters.startDate = startDate as string;
      if (endDate) filters.endDate = endDate as string;

      // Fetch all matching logs (no pagination for export)
      const result = await AuditService.search(filters, 1, 10000);
      const logs = result.data;

      switch (format) {
        case 'csv':
          await AuditController.exportAsCSV(logs, res);
          break;
        case 'json':
          await AuditController.exportAsJSON(logs, res);
          break;
        case 'pdf':
          await AuditController.exportAsPDF(logs, res);
          break;
        default:
          res.status(400).json({
            success: false,
            message: 'Invalid format. Supported formats: csv, json, pdf'
          });
      }
    } catch (error: any) {
      console.error('Audit export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export audit logs',
        error: error.message
      });
    }
  }

  /**
   * Export audit logs as CSV
   */
  private static async exportAsCSV(logs: any[], res: Response): Promise<void> {
    try {
      const fields = [
        'id',
        'userId',
        'action',
        'entity',
        'entityId',
        'ipAddress',
        'userAgent',
        'timestamp'
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(logs);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
      res.send(csv);
    } catch (error: any) {
      throw new Error(`CSV export failed: ${error.message}`);
    }
  }

  /**
   * Export audit logs as JSON
   */
  private static async exportAsJSON(logs: any[], res: Response): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
    res.json({
      exportDate: new Date().toISOString(),
      totalRecords: logs.length,
      logs
    });
  }

  /**
   * Export audit logs as PDF
   */
  private static async exportAsPDF(logs: any[], res: Response): Promise<void> {
    try {
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.pdf`);

      doc.pipe(res);

      // Title
      doc.fontSize(20).text('Audit Log Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.fontSize(12).text(`Total Records: ${logs.length}`, { align: 'center' });
      doc.moveDown(2);

      // Table headers
      doc.fontSize(10).font('Helvetica-Bold');
      const startY = doc.y;
      doc.text('Timestamp', 50, startY, { width: 100 });
      doc.text('User', 150, startY, { width: 80 });
      doc.text('Action', 230, startY, { width: 100 });
      doc.text('Entity', 330, startY, { width: 100 });
      doc.text('Entity ID', 430, startY, { width: 100 });
      doc.moveDown();

      // Table rows
      doc.font('Helvetica').fontSize(8);
      logs.forEach((log) => {
        if (doc.y > 700) {
          doc.addPage();
          doc.fontSize(10).font('Helvetica-Bold');
          const headerY = doc.y;
          doc.text('Timestamp', 50, headerY, { width: 100 });
          doc.text('User', 150, headerY, { width: 80 });
          doc.text('Action', 230, headerY, { width: 100 });
          doc.text('Entity', 330, headerY, { width: 100 });
          doc.text('Entity ID', 430, headerY, { width: 100 });
          doc.moveDown();
          doc.font('Helvetica').fontSize(8);
        }

        const rowY = doc.y;
        doc.text(new Date(log.timestamp).toISOString().substring(0, 19), 50, rowY, { width: 100 });
        doc.text(log.userId?.substring(0, 8) || 'system', 150, rowY, { width: 80 });
        doc.text(log.action, 230, rowY, { width: 100 });
        doc.text(log.entity, 330, rowY, { width: 100 });
        doc.text(log.entityId?.substring(0, 8) || '-', 430, rowY, { width: 100 });
        doc.moveDown(0.5);
      });

      doc.end();
    } catch (error: any) {
      throw new Error(`PDF export failed: ${error.message}`);
    }
  }

  /**
   * Get audit log statistics
   * Requirements: 24.5
   */
  static async getAuditStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {};
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate as string);
        if (endDate) where.timestamp.lte = new Date(endDate as string);
      }

      const [
        totalLogs,
        actionStats,
        entityStats,
        userStats
      ] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true }
        }),
        prisma.auditLog.groupBy({
          by: ['entity'],
          where,
          _count: { entity: true }
        }),
        prisma.auditLog.groupBy({
          by: ['userId'],
          where,
          _count: { userId: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10
        })
      ]);

      res.json({
        success: true,
        data: {
          totalLogs,
          actionBreakdown: actionStats.map(s => ({
            action: s.action,
            count: s._count.action
          })),
          entityBreakdown: entityStats.map(s => ({
            entity: s.entity,
            count: s._count.entity
          })),
          topUsers: userStats.map(s => ({
            userId: s.userId,
            count: s._count.userId
          }))
        }
      });
    } catch (error: any) {
      console.error('Audit stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit statistics',
        error: error.message
      });
    }
  }

  /**
   * Manually trigger retention policy
   * Requirements: 24.4
   * Note: This is admin-only and should be used sparingly
   */
  static async applyRetentionPolicy(_req: Request, res: Response): Promise<void> {
    try {
      await AuditService.applyRetentionPolicy();
      res.json({
        success: true,
        message: 'Retention policy applied successfully'
      });
    } catch (error: any) {
      console.error('Retention policy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply retention policy',
        error: error.message
      });
    }
  }

  /**
   * Prevent audit log modification - this endpoint always returns 403
   * Requirements: 24.6
   */
  static async preventModification(_req: Request, res: Response): Promise<void> {
    res.status(403).json({
      success: false,
      message: 'Audit logs are immutable and cannot be modified or deleted'
    });
  }
}
