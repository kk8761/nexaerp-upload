import { Router } from 'express';
import { CRMController } from '../controllers/crm.controller';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// ─── LEADS ──────────────────────────────────────────────────────────────

router.post('/leads', 
  requirePermission('create', 'lead'),
  auditLog('CREATE', 'lead'),
  CRMController.createLead
);

router.get('/leads', 
  requirePermission('read', 'lead'),
  CRMController.getLeads
);

router.put('/leads/:id/score', 
  requirePermission('update', 'lead'),
  auditLog('UPDATE', 'lead'),
  CRMController.updateLeadScore
);

router.post('/leads/:id/convert-to-opportunity', 
  requirePermission('create', 'opportunity'),
  auditLog('CREATE', 'opportunity'),
  CRMController.convertLeadToOpportunity
);

// ─── OPPORTUNITIES ──────────────────────────────────────────────────────

router.post('/opportunities', 
  requirePermission('create', 'opportunity'),
  auditLog('CREATE', 'opportunity'),
  CRMController.createOpportunity
);

router.get('/opportunities', 
  requirePermission('read', 'opportunity'),
  CRMController.getOpportunities
);

router.get('/opportunities/:id', 
  requirePermission('read', 'opportunity'),
  CRMController.getOpportunityById
);

router.put('/opportunities/:id', 
  requirePermission('update', 'opportunity'),
  auditLog('UPDATE', 'opportunity'),
  CRMController.updateOpportunity
);

router.put('/opportunities/:id/stage', 
  requirePermission('update', 'opportunity'),
  auditLog('UPDATE', 'opportunity'),
  CRMController.updateOpportunityStage
);

router.get('/forecast', 
  requirePermission('read', 'opportunity'),
  CRMController.getForecastedRevenue
);

router.post('/opportunities/:id/convert-to-quotation', 
  requirePermission('create', 'quotation'),
  auditLog('CREATE', 'quotation'),
  CRMController.convertOpportunityToQuotation
);

// ─── QUOTATIONS ─────────────────────────────────────────────────────────

router.post('/quotations', 
  requirePermission('create', 'quotation'),
  auditLog('CREATE', 'quotation'),
  CRMController.createQuotation
);

router.get('/quotations', 
  requirePermission('read', 'quotation'),
  CRMController.getQuotations
);

router.get('/quotations/:id', 
  requirePermission('read', 'quotation'),
  CRMController.getQuotationById
);

router.put('/quotations/:id/approve', 
  requirePermission('approve', 'quotation'),
  auditLog('APPROVE', 'quotation'),
  CRMController.approveQuotation
);

router.put('/quotations/:id/reject', 
  requirePermission('approve', 'quotation'),
  auditLog('REJECT', 'quotation'),
  CRMController.rejectQuotation
);

router.post('/quotations/:id/convert-to-order', 
  requirePermission('create', 'order'),
  auditLog('CREATE', 'order'),
  CRMController.convertQuotationToSalesOrder
);

// ─── ACTIVITIES (INTERACTION TRACKING) ──────────────────────────────────

router.post('/activities', 
  requirePermission('create', 'activity'),
  auditLog('CREATE', 'activity'),
  CRMController.createActivity
);

router.get('/activities/timeline', 
  requirePermission('read', 'activity'),
  CRMController.getActivityTimeline
);

router.put('/activities/:id/status', 
  requirePermission('update', 'activity'),
  auditLog('UPDATE', 'activity'),
  CRMController.updateActivityStatus
);

router.get('/activities/upcoming', 
  requirePermission('read', 'activity'),
  CRMController.getUpcomingActivities
);

router.get('/activities/overdue', 
  requirePermission('read', 'activity'),
  CRMController.getOverdueActivities
);

export default router;
