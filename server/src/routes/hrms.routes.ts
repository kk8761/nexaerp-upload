import { Router } from 'express';
import { HRMSController } from '../controllers/hrms.controller';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.post('/employees', 
  requirePermission('create', 'employee'),
  auditLog('CREATE', 'employee'),
  HRMSController.createEmployee
);

router.post('/attendance', 
  requirePermission('create', 'attendance'),
  auditLog('CREATE', 'attendance'),
  HRMSController.recordAttendance
);

router.post('/payroll', 
  requirePermission('create', 'payroll'),
  auditLog('CREATE', 'payroll'),
  HRMSController.processPayroll
);

export default router;
