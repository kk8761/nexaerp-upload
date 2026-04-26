import { Router } from 'express';
import { IntegrationsController } from '../controllers/integrations.controller';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

router.post('/webhooks', 
  requirePermission('create', 'webhook'),
  auditLog('CREATE', 'webhook'),
  IntegrationsController.createWebhook
);

router.post('/api-keys', 
  requirePermission('create', 'api_key'),
  auditLog('CREATE', 'api_key'),
  IntegrationsController.createApiKey
);

export default router;
