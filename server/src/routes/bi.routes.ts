import { Router } from 'express';
import { BIController } from '../controllers/bi.controller';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.post('/templates', 
  requirePermission('create', 'report_template'),
  auditLog('CREATE', 'report_template'),
  BIController.createReportTemplate
);

router.get('/reports/:id/execute', 
  requirePermission('read', 'report'),
  auditLog('EXECUTE', 'report'),
  BIController.generateReport
);

export default router;
