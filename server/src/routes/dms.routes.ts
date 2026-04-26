import { Router } from 'express';
import { DMSController } from '../controllers/dms.controller';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// Upload document
router.post('/upload', 
  requirePermission('create', 'document'),
  auditLog('CREATE', 'document'),
  DMSController.uploadMiddleware,
  DMSController.uploadDocument
);

// Get all documents (with filters)
router.get('/', 
  requirePermission('read', 'document'),
  DMSController.getDocuments
);

// Get document statistics
router.get('/stats',
  requirePermission('read', 'document'),
  DMSController.getDocumentStats
);

// Get documents by entity
router.get('/entity/:entityType/:entityId',
  requirePermission('read', 'document'),
  DMSController.getDocumentsByEntity
);

// Get document by ID
router.get('/:id',
  requirePermission('read', 'document'),
  DMSController.getDocumentById
);

// Update document metadata
router.patch('/:id',
  requirePermission('update', 'document'),
  auditLog('UPDATE', 'document'),
  DMSController.updateDocument
);

// Archive document
router.patch('/:id/archive', 
  requirePermission('update', 'document'),
  auditLog('ARCHIVE', 'document'),
  DMSController.archiveDocument
);

// Delete document
router.delete('/:id',
  requirePermission('delete', 'document'),
  auditLog('DELETE', 'document'),
  DMSController.deleteDocument
);

// Add tags to document
router.post('/:id/tags',
  requirePermission('update', 'document'),
  auditLog('ADD_TAGS', 'document'),
  DMSController.addTags
);

// Remove tags from document
router.delete('/:id/tags',
  requirePermission('update', 'document'),
  auditLog('REMOVE_TAGS', 'document'),
  DMSController.removeTags
);

// Link document to entity
router.post('/:id/link',
  requirePermission('update', 'document'),
  auditLog('LINK_ENTITY', 'document'),
  DMSController.linkToEntity
);

// ============ Task 15.2: OCR and Data Extraction ============

// Perform OCR on document
router.post('/:id/ocr',
  requirePermission('update', 'document'),
  auditLog('OCR', 'document'),
  DMSController.performOCR
);

// Extract invoice data from document
router.post('/:id/extract-invoice',
  requirePermission('update', 'document'),
  auditLog('EXTRACT_INVOICE', 'document'),
  DMSController.extractInvoiceData
);

// ============ Task 15.3: Version Control ============

// Create new version of document
router.post('/:id/versions',
  requirePermission('update', 'document'),
  auditLog('CREATE_VERSION', 'document'),
  DMSController.uploadMiddleware,
  DMSController.createVersion
);

// Get version history
router.get('/:id/versions',
  requirePermission('read', 'document'),
  DMSController.getVersions
);

// Rollback to previous version
router.post('/:id/rollback',
  requirePermission('update', 'document'),
  auditLog('ROLLBACK_VERSION', 'document'),
  DMSController.rollbackVersion
);

// ============ Task 15.4: E-Signature ============

// Create signature request
router.post('/signature-requests',
  requirePermission('create', 'document'),
  auditLog('CREATE_SIGNATURE_REQUEST', 'document'),
  DMSController.createSignatureRequest
);

// Get signature request
router.get('/signature-requests/:requestId',
  DMSController.getSignatureRequest
);

// Sign document
router.post('/signature-requests/:requestId/sign/:signerId',
  auditLog('SIGN_DOCUMENT', 'document'),
  DMSController.signDocument
);

// Decline signature
router.post('/signature-requests/:requestId/decline/:signerId',
  auditLog('DECLINE_SIGNATURE', 'document'),
  DMSController.declineSignature
);

// Get signature requests for document
router.get('/:id/signature-requests',
  requirePermission('read', 'document'),
  DMSController.getDocumentSignatureRequests
);

// ============ Task 15.5: Document Search and Linking ============

// Full-text search
router.get('/search/full-text',
  requirePermission('read', 'document'),
  DMSController.fullTextSearch
);

// Advanced search
router.get('/search/advanced',
  requirePermission('read', 'document'),
  DMSController.advancedSearch
);

// Get related documents
router.get('/:id/related',
  requirePermission('read', 'document'),
  DMSController.getRelatedDocuments
);

// ============ Task 15.6: Document Archival ============

// Create archival policy
router.post('/archival/policies',
  requirePermission('create', 'document'),
  auditLog('CREATE_ARCHIVAL_POLICY', 'document'),
  DMSController.createArchivalPolicy
);

// Get archival policies
router.get('/archival/policies',
  requirePermission('read', 'document'),
  DMSController.getArchivalPolicies
);

// Update archival policy
router.patch('/archival/policies/:id',
  requirePermission('update', 'document'),
  auditLog('UPDATE_ARCHIVAL_POLICY', 'document'),
  DMSController.updateArchivalPolicy
);

// Delete archival policy
router.delete('/archival/policies/:id',
  requirePermission('delete', 'document'),
  auditLog('DELETE_ARCHIVAL_POLICY', 'document'),
  DMSController.deleteArchivalPolicy
);

// Run archival process manually
router.post('/archival/run',
  requirePermission('update', 'document'),
  auditLog('RUN_ARCHIVAL_PROCESS', 'document'),
  DMSController.runArchivalProcess
);

// Apply legal hold
router.post('/archival/legal-hold/apply',
  requirePermission('update', 'document'),
  auditLog('APPLY_LEGAL_HOLD', 'document'),
  DMSController.applyLegalHold
);

// Remove legal hold
router.post('/archival/legal-hold/remove',
  requirePermission('update', 'document'),
  auditLog('REMOVE_LEGAL_HOLD', 'document'),
  DMSController.removeLegalHold
);

export default router;
