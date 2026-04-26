/**
 * Document Storage Service
 * Handles document upload, storage, categorization, and access control
 */

import prisma from '../config/prisma';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ocrService from './ocr.service';

export interface DocumentMetadata {
  [key: string]: any;
}

export interface CreateDocumentInput {
  title: string;
  description?: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  fileBuffer: Buffer;
  category?: string;
  tags?: string[];
  metadata?: DocumentMetadata;
  linkedEntityType?: string;
  linkedEntityId?: string;
  accessLevel?: 'public' | 'private' | 'restricted';
  allowedRoles?: string[];
  allowedUsers?: string[];
  uploadedById: string;
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  metadata?: DocumentMetadata;
  linkedEntityType?: string;
  linkedEntityId?: string;
  accessLevel?: 'public' | 'private' | 'restricted';
  allowedRoles?: string[];
  allowedUsers?: string[];
}

export interface DocumentSearchCriteria {
  category?: string;
  tags?: string[];
  linkedEntityType?: string;
  linkedEntityId?: string;
  uploadedById?: string;
  accessLevel?: string;
  status?: string;
  searchText?: string;
}

export class DocumentService {
  private uploadDir: string;

  constructor() {
    // Use environment variable or default to uploads directory
    this.uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads/documents');
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Store file to local storage (can be extended to S3/Azure Blob)
   */
  private async storeFile(fileBuffer: Buffer, fileName: string): Promise<string> {
    const uniqueFileName = `${uuidv4()}-${fileName}`;
    const filePath = path.join(this.uploadDir, uniqueFileName);
    
    await fs.promises.writeFile(filePath, fileBuffer);
    
    // Return relative URL path
    return `/uploads/documents/${uniqueFileName}`;
  }

  /**
   * Create and upload a document
   */
  async createDocument(input: CreateDocumentInput) {
    // Store file
    const fileUrl = await this.storeFile(input.fileBuffer, input.fileName);

    // Create document record
    const document = await prisma.document.create({
      data: {
        title: input.title,
        description: input.description,
        fileName: input.fileName,
        fileUrl,
        fileType: input.fileType,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        category: input.category || 'other',
        tags: input.tags || [],
        metadata: input.metadata || {},
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
        accessLevel: input.accessLevel || 'private',
        allowedRoles: input.allowedRoles || [],
        allowedUsers: input.allowedUsers || [],
        uploadedById: input.uploadedById,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return document;
  }

  /**
   * Get document by ID with access control check
   */
  async getDocumentById(documentId: string, userId: string, userRoles: string[]) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check access control
    if (!this.checkAccess(document, userId, userRoles)) {
      throw new Error('Access denied');
    }

    return document;
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId: string, userId: string, userRoles: string[], input: UpdateDocumentInput) {
    // First check if user has access
    const existingDoc = await this.getDocumentById(documentId, userId, userRoles);

    // Only owner or admin can update
    if (existingDoc.uploadedById !== userId && !userRoles.includes('admin')) {
      throw new Error('Only document owner or admin can update');
    }

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        tags: input.tags,
        metadata: input.metadata,
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
        accessLevel: input.accessLevel,
        allowedRoles: input.allowedRoles,
        allowedUsers: input.allowedUsers,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return document;
  }

  /**
   * Search documents with filters
   */
  async searchDocuments(criteria: DocumentSearchCriteria, userId: string, userRoles: string[]) {
    const where: any = {
      status: criteria.status || 'active',
    };

    if (criteria.category) {
      where.category = criteria.category;
    }

    if (criteria.tags && criteria.tags.length > 0) {
      where.tags = {
        hasSome: criteria.tags,
      };
    }

    if (criteria.linkedEntityType) {
      where.linkedEntityType = criteria.linkedEntityType;
    }

    if (criteria.linkedEntityId) {
      where.linkedEntityId = criteria.linkedEntityId;
    }

    if (criteria.uploadedById) {
      where.uploadedById = criteria.uploadedById;
    }

    if (criteria.searchText) {
      where.OR = [
        { title: { contains: criteria.searchText, mode: 'insensitive' } },
        { description: { contains: criteria.searchText, mode: 'insensitive' } },
        { fileName: { contains: criteria.searchText, mode: 'insensitive' } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter by access control
    return documents.filter(doc => this.checkAccess(doc, userId, userRoles));
  }

  /**
   * Archive document
   */
  async archiveDocument(documentId: string, userId: string, userRoles: string[]) {
    const existingDoc = await this.getDocumentById(documentId, userId, userRoles);

    // Only owner or admin can archive
    if (existingDoc.uploadedById !== userId && !userRoles.includes('admin')) {
      throw new Error('Only document owner or admin can archive');
    }

    const document = await prisma.document.update({
      where: { id: documentId },
      data: { status: 'archived' },
    });

    return document;
  }

  /**
   * Delete document (soft delete)
   */
  async deleteDocument(documentId: string, userId: string, userRoles: string[]) {
    const existingDoc = await this.getDocumentById(documentId, userId, userRoles);

    // Only owner or admin can delete
    if (existingDoc.uploadedById !== userId && !userRoles.includes('admin')) {
      throw new Error('Only document owner or admin can delete');
    }

    const document = await prisma.document.update({
      where: { id: documentId },
      data: { status: 'deleted' },
    });

    return document;
  }

  /**
   * Add tags to document
   */
  async addTags(documentId: string, userId: string, userRoles: string[], newTags: string[]) {
    await this.getDocumentById(documentId, userId, userRoles);

    const currentDoc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { tags: true },
    });

    const currentTags = currentDoc?.tags || [];
    const updatedTags = Array.from(new Set([...currentTags, ...newTags]));

    const document = await prisma.document.update({
      where: { id: documentId },
      data: { tags: updatedTags },
    });

    return document;
  }

  /**
   * Remove tags from document
   */
  async removeTags(documentId: string, userId: string, userRoles: string[], tagsToRemove: string[]) {
    await this.getDocumentById(documentId, userId, userRoles);

    const currentDoc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { tags: true },
    });

    const currentTags = currentDoc?.tags || [];
    const updatedTags = currentTags.filter(tag => !tagsToRemove.includes(tag));

    const document = await prisma.document.update({
      where: { id: documentId },
      data: { tags: updatedTags },
    });

    return document;
  }

  /**
   * Link document to entity
   */
  async linkToEntity(documentId: string, userId: string, userRoles: string[], entityType: string, entityId: string) {
    await this.getDocumentById(documentId, userId, userRoles);

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        linkedEntityType: entityType,
        linkedEntityId: entityId,
      },
    });

    return document;
  }

  /**
   * Get documents linked to an entity
   */
  async getDocumentsByEntity(entityType: string, entityId: string, userId: string, userRoles: string[]) {
    const documents = await prisma.document.findMany({
      where: {
        linkedEntityType: entityType,
        linkedEntityId: entityId,
        status: 'active',
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter by access control
    return documents.filter(doc => this.checkAccess(doc, userId, userRoles));
  }

  /**
   * Check if user has access to document
   */
  private checkAccess(document: any, userId: string, userRoles: string[]): boolean {
    // Public documents are accessible to all
    if (document.accessLevel === 'public') {
      return true;
    }

    // Owner always has access
    if (document.uploadedById === userId) {
      return true;
    }

    // Admin always has access
    if (userRoles.includes('admin')) {
      return true;
    }

    // Check if user is in allowed users list
    if (document.allowedUsers && document.allowedUsers.includes(userId)) {
      return true;
    }

    // Check if user has any of the allowed roles
    if (document.allowedRoles && document.allowedRoles.length > 0) {
      const hasAllowedRole = userRoles.some(role => document.allowedRoles.includes(role));
      if (hasAllowedRole) {
        return true;
      }
    }

    // For private documents, only owner has access (already checked above)
    // For restricted documents, only allowed users/roles have access (already checked above)
    return false;
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(userId: string, userRoles: string[]) {
    const isAdmin = userRoles.includes('admin');

    const where: any = {
      status: 'active',
    };

    if (!isAdmin) {
      where.OR = [
        { uploadedById: userId },
        { accessLevel: 'public' },
        { allowedUsers: { has: userId } },
      ];
    }

    const [totalCount, byCategory, totalSize] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      prisma.document.aggregate({
        where,
        _sum: {
          fileSize: true,
        },
      }),
    ]);

    return {
      totalDocuments: totalCount,
      totalSize: totalSize._sum.fileSize || 0,
      byCategory: byCategory.map(item => ({
        category: item.category,
        count: item._count,
      })),
    };
  }

  /**
   * Perform OCR on a document (Task 15.2)
   */
  async performOCR(documentId: string, userId: string, userRoles: string[]) {
    const document = await this.getDocumentById(documentId, userId, userRoles);

    // Check if OCR already performed
    if (document.ocrProcessed) {
      return {
        text: document.ocrText,
        alreadyProcessed: true,
      };
    }

    // Get file path
    const filePath = path.join(__dirname, '../..', document.fileUrl);

    if (!fs.existsSync(filePath)) {
      throw new Error('Document file not found');
    }

    try {
      // Perform OCR
      const ocrResult = await ocrService.processDocument(filePath, document.mimeType);

      // Update document with OCR results
      const updatedDoc = await prisma.document.update({
        where: { id: documentId },
        data: {
          ocrText: ocrResult.text,
          ocrProcessed: true,
          ocrProcessedAt: new Date(),
        },
      });

      return {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        alreadyProcessed: false,
      };
    } catch (error: any) {
      console.error('OCR processing error:', error);
      throw new Error(`Failed to perform OCR: ${error.message}`);
    }
  }

  /**
   * Extract invoice data from a document (Task 15.2)
   */
  async extractInvoiceData(documentId: string, userId: string, userRoles: string[]) {
    const document = await this.getDocumentById(documentId, userId, userRoles);

    // Ensure OCR has been performed
    let ocrText = document.ocrText;
    if (!ocrText) {
      const ocrResult = await this.performOCR(documentId, userId, userRoles);
      ocrText = ocrResult.text;
    }

    // Extract invoice data
    const invoiceData = ocrService.extractInvoiceData(ocrText);

    // Store extracted data
    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedData: invoiceData as any,
      },
    });

    return invoiceData;
  }

  /**
   * Create a new version of a document (Task 15.3)
   */
  async createDocumentVersion(
    documentId: string,
    userId: string,
    userRoles: string[],
    fileBuffer: Buffer,
    fileName: string,
    fileSize: number,
    changes?: string
  ) {
    const document = await this.getDocumentById(documentId, userId, userRoles);

    // Only owner or admin can create versions
    if (document.uploadedById !== userId && !userRoles.includes('admin')) {
      throw new Error('Only document owner or admin can create versions');
    }

    // Store new version file
    const fileUrl = await this.storeFile(fileBuffer, fileName);

    // Get current version number
    const currentVersion = document.version;
    const newVersionNumber = currentVersion + 1;

    // Create version record
    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: newVersionNumber,
        fileUrl,
        fileName,
        fileSize,
        changes: changes || `Version ${newVersionNumber}`,
        uploadedById: userId,
      },
    });

    // Update document with new version
    await prisma.document.update({
      where: { id: documentId },
      data: {
        version: newVersionNumber,
        fileUrl,
        fileName,
        fileSize,
      },
    });

    return version;
  }

  /**
   * Get version history for a document (Task 15.3)
   */
  async getDocumentVersions(documentId: string, userId: string, userRoles: string[]) {
    await this.getDocumentById(documentId, userId, userRoles);

    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    return versions;
  }

  /**
   * Rollback to a previous version (Task 15.3)
   */
  async rollbackToVersion(
    documentId: string,
    versionNumber: number,
    userId: string,
    userRoles: string[]
  ) {
    const document = await this.getDocumentById(documentId, userId, userRoles);

    // Only owner or admin can rollback
    if (document.uploadedById !== userId && !userRoles.includes('admin')) {
      throw new Error('Only document owner or admin can rollback versions');
    }

    // Get the target version
    const targetVersion = await prisma.documentVersion.findUnique({
      where: {
        documentId_versionNumber: {
          documentId,
          versionNumber,
        },
      },
    });

    if (!targetVersion) {
      throw new Error('Version not found');
    }

    // Create a new version with the old file
    const newVersionNumber = document.version + 1;
    await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: newVersionNumber,
        fileUrl: targetVersion.fileUrl,
        fileName: targetVersion.fileName,
        fileSize: targetVersion.fileSize,
        changes: `Rolled back to version ${versionNumber}`,
        uploadedById: userId,
      },
    });

    // Update document
    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: {
        version: newVersionNumber,
        fileUrl: targetVersion.fileUrl,
        fileName: targetVersion.fileName,
        fileSize: targetVersion.fileSize,
      },
    });

    return updatedDoc;
  }
}

export default new DocumentService();
