import express from 'express';
import { AuditController } from '../controllers/audit.controller';
import { requirePermission } from '../middleware/rbac.middleware';

const router = express.Router();

/**
 * Audit Log Routes
 * All routes are admin-only (require 'read:audit' or 'admin' role)
 * Requirements: 24.4, 24.5, 24.6, 24.8
 */

/**
 * Search audit logs with filters
 * GET /api/audit/logs?userId=xxx&action=CREATE&entity=user&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50
 * Requirements: 24.5
 */
router.get(
  '/logs',
  requirePermission('read', 'audit'),
  AuditController.searchAuditLogs
);

/**
 * Export audit logs in various formats
 * GET /api/audit/export?format=csv&userId=xxx&startDate=2024-01-01
 * Supported formats: csv, json, pdf
 * Requirements: 24.8
 */
router.get(
  '/export',
  requirePermission('read', 'audit'),
  AuditController.exportAuditLogs
);

/**
 * Get audit log statistics
 * GET /api/audit/stats?startDate=2024-01-01&endDate=2024-12-31
 * Requirements: 24.5
 */
router.get(
  '/stats',
  requirePermission('read', 'audit'),
  AuditController.getAuditStats
);

/**
 * Manually trigger retention policy (7-year retention)
 * POST /api/audit/retention
 * Requirements: 24.4
 * Note: This is also automatically scheduled to run daily
 */
router.post(
  '/retention',
  requirePermission('delete', 'audit'),
  AuditController.applyRetentionPolicy
);

/**
 * Prevent audit log modification/deletion
 * These endpoints always return 403 to enforce immutability
 * Requirements: 24.6
 */
router.put('/logs/:id', AuditController.preventModification);
router.patch('/logs/:id', AuditController.preventModification);
router.delete('/logs/:id', AuditController.preventModification);

export default router;
