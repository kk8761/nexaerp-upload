/**
 * Document Search Service (Task 15.5)
 * Handles full-text search and document linking
 * 
 * Note: This is a basic implementation using PostgreSQL full-text search.
 * For production, integrate with Elasticsearch for better performance.
 */

import prisma from '../config/prisma';

export interface AdvancedSearchCriteria {
  fullTextQuery?: string;
  category?: string;
  tags?: string[];
  linkedEntityType?: string;
  linkedEntityId?: string;
  uploadedById?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minFileSize?: number;
  maxFileSize?: number;
}

export interface DocumentLink {
  documentId: string;
  targetDocumentId: string;
  linkType: string; // 'related', 'supersedes', 'attachment', 'reference'
  description?: string;
}

export class DocumentSearchService {
  /**
   * Perform full-text search across documents
   * Uses PostgreSQL full-text search (can be replaced with Elasticsearch)
   */
  async fullTextSearch(
    query: string,
    userId: string,
    userRoles: string[],
    limit: number = 50
  ) {
    const isAdmin = userRoles.includes('admin');

    // Build access control filter
    const accessFilter: any = {
      status: 'active',
    };

    if (!isAdmin) {
      accessFilter.OR = [
        { uploadedById: userId },
        { accessLevel: 'public' },
        { allowedUsers: { has: userId } },
      ];
    }

    // Search in title, description, fileName, and OCR text
    const documents = await prisma.document.findMany({
      where: {
        ...accessFilter,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { fileName: { contains: query, mode: 'insensitive' } },
          { ocrText: { contains: query, mode: 'insensitive' } },
        ],
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
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return documents;
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(
    criteria: AdvancedSearchCriteria,
    userId: string,
    userRoles: string[],
    limit: number = 50
  ) {
    const isAdmin = userRoles.includes('admin');

    const where: any = {
      status: 'active',
    };

    // Access control
    if (!isAdmin) {
      where.OR = [
        { uploadedById: userId },
        { accessLevel: 'public' },
        { allowedUsers: { has: userId } },
      ];
    }

    // Full-text query
    if (criteria.fullTextQuery) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { title: { contains: criteria.fullTextQuery, mode: 'insensitive' } },
          { description: { contains: criteria.fullTextQuery, mode: 'insensitive' } },
          { fileName: { contains: criteria.fullTextQuery, mode: 'insensitive' } },
          { ocrText: { contains: criteria.fullTextQuery, mode: 'insensitive' } },
        ],
      });
    }

    // Category filter
    if (criteria.category) {
      where.category = criteria.category;
    }

    // Tags filter
    if (criteria.tags && criteria.tags.length > 0) {
      where.tags = {
        hasSome: criteria.tags,
      };
    }

    // Entity linking filter
    if (criteria.linkedEntityType) {
      where.linkedEntityType = criteria.linkedEntityType;
    }

    if (criteria.linkedEntityId) {
      where.linkedEntityId = criteria.linkedEntityId;
    }

    // Uploader filter
    if (criteria.uploadedById) {
      where.uploadedById = criteria.uploadedById;
    }

    // Date range filter
    if (criteria.dateFrom || criteria.dateTo) {
      where.createdAt = {};
      if (criteria.dateFrom) {
        where.createdAt.gte = criteria.dateFrom;
      }
      if (criteria.dateTo) {
        where.createdAt.lte = criteria.dateTo;
      }
    }

    // File size filter
    if (criteria.minFileSize || criteria.maxFileSize) {
      where.fileSize = {};
      if (criteria.minFileSize) {
        where.fileSize.gte = criteria.minFileSize;
      }
      if (criteria.maxFileSize) {
        where.fileSize.lte = criteria.maxFileSize;
      }
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
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return documents;
  }

  /**
   * Index document content for search
   * This is a placeholder for Elasticsearch integration
   */
  async indexDocument(documentId: string) {
    // TODO: Implement Elasticsearch indexing
    // For now, this is handled by PostgreSQL full-text search
    console.log(`Document ${documentId} indexed for search`);
  }

  /**
   * Remove document from search index
   */
  async removeFromIndex(documentId: string) {
    // TODO: Implement Elasticsearch removal
    console.log(`Document ${documentId} removed from search index`);
  }

  /**
   * Get related documents based on tags and category
   */
  async getRelatedDocuments(documentId: string, userId: string, userRoles: string[], limit: number = 10) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const isAdmin = userRoles.includes('admin');

    const where: any = {
      status: 'active',
      id: { not: documentId },
    };

    // Access control
    if (!isAdmin) {
      where.OR = [
        { uploadedById: userId },
        { accessLevel: 'public' },
        { allowedUsers: { has: userId } },
      ];
    }

    // Find documents with similar tags or same category
    const relatedDocs = await prisma.document.findMany({
      where: {
        ...where,
        OR: [
          { category: document.category },
          { tags: { hasSome: document.tags } },
          { linkedEntityType: document.linkedEntityType },
        ],
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
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return relatedDocs;
  }

  /**
   * Search documents by entity
   */
  async searchByEntity(entityType: string, entityId: string, userId: string, userRoles: string[]) {
    const isAdmin = userRoles.includes('admin');

    const where: any = {
      status: 'active',
      linkedEntityType: entityType,
      linkedEntityId: entityId,
    };

    // Access control
    if (!isAdmin) {
      where.OR = [
        { uploadedById: userId },
        { accessLevel: 'public' },
        { allowedUsers: { has: userId } },
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

    return documents;
  }
}

export default new DocumentSearchService();
