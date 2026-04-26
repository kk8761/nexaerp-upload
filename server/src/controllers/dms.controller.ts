import { Request, Response } from 'express';
import documentService, { DocumentSearchCriteria } from '../services/document.service';
import eSignatureService from '../services/esignature.service';
import documentSearchService from '../services/document-search.service';
import documentArchivalService from '../services/document-archival.service';
import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow common document types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images are allowed.'));
    }
  },
});

export class DMSController {
  
  /**
   * Upload a new document
   */
  static uploadMiddleware = upload.single('file');

  static async uploadDocument(req: Request, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const user: any = req.user;
      const {
        title,
        description,
        category,
        tags,
        metadata,
        linkedEntityType,
        linkedEntityId,
        accessLevel,
        allowedRoles,
        allowedUsers,
      } = req.body;

      // Parse JSON fields if they're strings
      const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      const parsedAllowedRoles = typeof allowedRoles === 'string' ? JSON.parse(allowedRoles) : allowedRoles;
      const parsedAllowedUsers = typeof allowedUsers === 'string' ? JSON.parse(allowedUsers) : allowedUsers;

      const document = await documentService.createDocument({
        title: title || file.originalname,
        description,
        fileName: file.originalname,
        fileType: path.extname(file.originalname),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileBuffer: file.buffer,
        category,
        tags: parsedTags,
        metadata: parsedMetadata,
        linkedEntityType,
        linkedEntityId,
        accessLevel,
        allowedRoles: parsedAllowedRoles,
        allowedUsers: parsedAllowedUsers,
        uploadedById: user.id,
      });

      return res.status(201).json({ success: true, document });
    } catch (error: any) {
      console.error('Upload error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to upload document' });
    }
  }

  /**
   * Get all documents (with filters)
   */
  static async getDocuments(req: Request, res: Response) {
    try {
      const user: any = req.user;
      const userRoles = user.roles || [];

      const criteria: DocumentSearchCriteria = {
        category: req.query.category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        linkedEntityType: req.query.linkedEntityType as string,
        linkedEntityId: req.query.linkedEntityId as string,
        uploadedById: req.query.uploadedById as string,
        accessLevel: req.query.accessLevel as string,
        status: req.query.status as string,
        searchText: req.query.search as string,
      };

      const documents = await documentService.searchDocuments(criteria, user.id, userRoles);
      res.json({ success: true, documents });
    } catch (error: any) {
      console.error('Get documents error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch documents' });
    }
  }

  /**
   * Get document by ID
   */
  static async getDocumentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user: any = req.user;
      const userRoles = user.roles || [];

      const document = await documentService.getDocumentById(id, user.id, userRoles);
      res.json({ success: true, document });
    } catch (error: any) {
      console.error('Get document error:', error);
      const status = error.message === 'Document not found' ? 404 : error.message === 'Access denied' ? 403 : 500;
      res.status(status).json({ success: false, message: error.message });
    }
  }

  /**
   * Update document metadata
   */
  static async updateDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user: any = req.user;
      const userRoles = user.roles || [];

      const document = await documentService.updateDocument(id, user.id, userRoles, req.body);
      res.json({ success: true, document });
    } catch (error: any) {
      console.error('Update document error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update document' });
    }
  }

  /**
   * Archive document
   */
  static async archiveDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user: any = req.user;
      const userRoles = user.roles || [];

      await documentService.archiveDocument(id, user.id, userRoles);
      res.json({ success: true, message: 'Document archived successfully' });
    } catch (error: any) {
      console.error('Archive document error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to archive document' });
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user: any = req.user;
      const userRoles = user.roles || [];

      await documentService.deleteDocument(id, user.id, userRoles);
      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error: any) {
      console.error('Delete document error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to delete document' });
    }
  }

  /**
   * Add tags to document
   */
  static async addTags(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tags } = req.body;
      const user: any = req.user;
      const userRoles = user.roles || [];

      if (!tags || !Array.isArray(tags)) {
        return res.status(400).json({ success: false, message: 'Tags must be an array' });
      }

      const document = await documentService.addTags(id, user.id, userRoles, tags);
      return res.json({ success: true, document });
    } catch (error: any) {
      console.error('Add tags error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to add tags' });
    }
  }

  /**
   * Remove tags from document
   */
  static async removeTags(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tags } = req.body;
      const user: any = req.user;
      const userRoles = user.roles || [];

      if (!tags || !Array.isArray(tags)) {
        return res.status(400).json({ success: false, message: 'Tags must be an array' });
      }

      const document = await documentService.removeTags(id, user.id, userRoles, tags);
      return res.json({ success: true, document });
    } catch (error: any) {
      console.error('Remove tags error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to remove tags' });
    }
  }

  /**
   * Link document to entity
   */
  static async linkToEntity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { entityType, entityId } = req.body;
      const user: any = req.user;
      const userRoles = user.roles || [];

      if (!entityType || !entityId) {
        return res.status(400).json({ success: false, message: 'entityType and entityId are required' });
      }

      const document = await documentService.linkToEntity(id, user.id, userRoles, entityType, entityId);
      return res.json({ success: true, document });
    } catch (error: any) {
      console.error('Link to entity error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to link document' });
    }
  }

  /**
   * Get documents by entity
   */
  static async getDocumentsByEntity(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;
      const user: any = req.user;
      const userRoles = user.roles || [];

      const documents = await documentService.getDocumentsByEntity(entityType, entityId, user.id, userRoles);
      res.json({ success: true, documents });
    } catch (error: any) {
      console.error('Get documents by entity error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch documents' });
    }
  }

  /**
   * Get document statistics
   */
  static async getDocumentStats(req: Request, res: Response) {
    try {
      const user: any = req.user;
      const userRoles = user.roles || [];

      const stats = await documentService.getDocumentStats(user.id, userRoles);
      res.json({ success: true, stats });
    } catch (error: any) {
      console.error('Get stats error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch statistics' });
    }
  }

  // ============ Task 15.2: OCR and Data Extraction ============

  /**
   * Perform OCR on a document
   */
  static async performOCR(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user: any = req.user;
      const userRoles = user.roles || [];

      const result = await documentService.performOCR(id, user.id, userRoles);
      res.json({ success: true, result });
    } catch (error: any) {
      console.error('OCR error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to perform OCR' });
    }
  }

  /**
   * Extract invoice data from a document
   */
  static async extractInvoiceData(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user: any = req.user;
      const userRoles = user.roles || [];

      const invoiceData = await documentService.extractInvoiceData(id, user.id, userRoles);
      res.json({ success: true, invoiceData });
    } catch (error: any) {
      console.error('Invoice extraction error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to extract invoice data' });
    }
  }

  // ============ Task 15.3: Version Control ============

  /**
   * Create a new version of a document
   */
  static async createVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const user: any = req.user;
      const userRoles = user.roles || [];
      const { changes } = req.body;

      const version = await documentService.createDocumentVersion(
        id,
        user.id,
        userRoles,
        file.buffer,
        file.originalname,
        file.size,
        changes
      );

      res.json({ success: true, version });
    } catch (error: any) {
      console.error('Create version error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create version' });
    }
  }

  /**
   * Get version history for a document
   */
  static async getVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user: any = req.user;
      const userRoles = user.roles || [];

      const versions = await documentService.getDocumentVersions(id, user.id, userRoles);
      res.json({ success: true, versions });
    } catch (error: any) {
      console.error('Get versions error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch versions' });
    }
  }

  /**
   * Rollback to a previous version
   */
  static async rollbackVersion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { versionNumber } = req.body;
      const user: any = req.user;
      const userRoles = user.roles || [];

      if (!versionNumber) {
        return res.status(400).json({ success: false, message: 'versionNumber is required' });
      }

      const document = await documentService.rollbackToVersion(id, versionNumber, user.id, userRoles);
      res.json({ success: true, document });
    } catch (error: any) {
      console.error('Rollback version error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to rollback version' });
    }
  }

  // ============ Task 15.4: E-Signature ============

  /**
   * Create an e-signature request
   */
  static async createSignatureRequest(req: Request, res: Response) {
    try {
      const { documentId, signers, message, expiryDate } = req.body;
      const user: any = req.user;

      if (!documentId || !signers || !Array.isArray(signers)) {
        return res.status(400).json({ 
          success: false, 
          message: 'documentId and signers array are required' 
        });
      }

      const request = await eSignatureService.createSignatureRequest({
        documentId,
        signers,
        message,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        createdById: user.id,
      });

      res.json({ success: true, request });
    } catch (error: any) {
      console.error('Create signature request error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create signature request' });
    }
  }

  /**
   * Get signature request by ID
   */
  static async getSignatureRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const request = await eSignatureService.getSignatureRequest(requestId);
      res.json({ success: true, request });
    } catch (error: any) {
      console.error('Get signature request error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch signature request' });
    }
  }

  /**
   * Sign a document
   */
  static async signDocument(req: Request, res: Response) {
    try {
      const { requestId, signerId } = req.params;
      const { signatureData } = req.body;
      const ipAddress = req.ip;

      if (!signatureData) {
        return res.status(400).json({ success: false, message: 'signatureData is required' });
      }

      const result = await eSignatureService.signDocument({
        requestId,
        signerId,
        signatureData,
        ipAddress,
      });

      res.json({ success: true, result });
    } catch (error: any) {
      console.error('Sign document error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to sign document' });
    }
  }

  /**
   * Decline to sign a document
   */
  static async declineSignature(req: Request, res: Response) {
    try {
      const { requestId, signerId } = req.params;
      const { reason } = req.body;

      const result = await eSignatureService.declineSignature(requestId, signerId, reason);
      res.json(result);
    } catch (error: any) {
      console.error('Decline signature error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to decline signature' });
    }
  }

  /**
   * Get signature requests for a document
   */
  static async getDocumentSignatureRequests(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const requests = await eSignatureService.getDocumentSignatureRequests(id);
      res.json({ success: true, requests });
    } catch (error: any) {
      console.error('Get document signature requests error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch signature requests' });
    }
  }

  // ============ Task 15.5: Document Search and Linking ============

  /**
   * Full-text search across documents
   */
  static async fullTextSearch(req: Request, res: Response) {
    try {
      const { query, limit } = req.query;
      const user: any = req.user;
      const userRoles = user.roles || [];

      if (!query) {
        return res.status(400).json({ success: false, message: 'query parameter is required' });
      }

      const documents = await documentSearchService.fullTextSearch(
        query as string,
        user.id,
        userRoles,
        limit ? parseInt(limit as string) : 50
      );

      res.json({ success: true, documents });
    } catch (error: any) {
      console.error('Full-text search error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to search documents' });
    }
  }

  /**
   * Advanced search with multiple criteria
   */
  static async advancedSearch(req: Request, res: Response) {
    try {
      const user: any = req.user;
      const userRoles = user.roles || [];

      const criteria = {
        fullTextQuery: req.query.query as string,
        category: req.query.category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        linkedEntityType: req.query.linkedEntityType as string,
        linkedEntityId: req.query.linkedEntityId as string,
        uploadedById: req.query.uploadedById as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        minFileSize: req.query.minFileSize ? parseInt(req.query.minFileSize as string) : undefined,
        maxFileSize: req.query.maxFileSize ? parseInt(req.query.maxFileSize as string) : undefined,
      };

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const documents = await documentSearchService.advancedSearch(criteria, user.id, userRoles, limit);
      res.json({ success: true, documents });
    } catch (error: any) {
      console.error('Advanced search error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to search documents' });
    }
  }

  /**
   * Get related documents
   */
  static async getRelatedDocuments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user: any = req.user;
      const userRoles = user.roles || [];
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const documents = await documentSearchService.getRelatedDocuments(id, user.id, userRoles, limit);
      res.json({ success: true, documents });
    } catch (error: any) {
      console.error('Get related documents error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch related documents' });
    }
  }

  // ============ Task 15.6: Document Archival ============

  /**
   * Create an archival policy
   */
  static async createArchivalPolicy(req: Request, res: Response) {
    try {
      const policy = await documentArchivalService.createArchivalPolicy(req.body);
      res.json({ success: true, policy });
    } catch (error: any) {
      console.error('Create archival policy error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create archival policy' });
    }
  }

  /**
   * Get all archival policies
   */
  static async getArchivalPolicies(req: Request, res: Response) {
    try {
      const policies = await documentArchivalService.getArchivalPolicies();
      res.json({ success: true, policies });
    } catch (error: any) {
      console.error('Get archival policies error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch archival policies' });
    }
  }

  /**
   * Update an archival policy
   */
  static async updateArchivalPolicy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const policy = await documentArchivalService.updateArchivalPolicy(id, req.body);
      res.json({ success: true, policy });
    } catch (error: any) {
      console.error('Update archival policy error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update archival policy' });
    }
  }

  /**
   * Delete an archival policy
   */
  static async deleteArchivalPolicy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await documentArchivalService.deleteArchivalPolicy(id);
      res.json(result);
    } catch (error: any) {
      console.error('Delete archival policy error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to delete archival policy' });
    }
  }

  /**
   * Run archival process manually
   */
  static async runArchivalProcess(req: Request, res: Response) {
    try {
      const result = await documentArchivalService.runArchivalProcess();
      res.json(result);
    } catch (error: any) {
      console.error('Run archival process error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to run archival process' });
    }
  }

  /**
   * Apply legal hold to documents
   */
  static async applyLegalHold(req: Request, res: Response) {
    try {
      const { documentIds, reason } = req.body;

      if (!documentIds || !Array.isArray(documentIds)) {
        return res.status(400).json({ success: false, message: 'documentIds array is required' });
      }

      const result = await documentArchivalService.applyLegalHold(documentIds, reason);
      res.json(result);
    } catch (error: any) {
      console.error('Apply legal hold error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to apply legal hold' });
    }
  }

  /**
   * Remove legal hold from documents
   */
  static async removeLegalHold(req: Request, res: Response) {
    try {
      const { documentIds } = req.body;

      if (!documentIds || !Array.isArray(documentIds)) {
        return res.status(400).json({ success: false, message: 'documentIds array is required' });
      }

      const result = await documentArchivalService.removeLegalHold(documentIds);
      res.json(result);
    } catch (error: any) {
      console.error('Remove legal hold error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to remove legal hold' });
    }
  }
}
