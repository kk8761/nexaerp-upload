/**
 * Document Archival Service (Task 15.6)
 * Handles document archival policies and automated archival
 */

import prisma from '../config/prisma';
import cron from 'node-cron';

export interface CreateArchivalPolicyInput {
  name: string;
  description?: string;
  category?: string;
  retentionDays: number;
  isActive?: boolean;
  legalHold?: boolean;
}

export class DocumentArchivalService {
  private cronJob?: cron.ScheduledTask;

  constructor() {
    // Schedule daily archival check at 2 AM
    this.scheduleArchivalJob();
  }

  /**
   * Create an archival policy
   */
  async createArchivalPolicy(input: CreateArchivalPolicyInput) {
    const policy = await prisma.documentArchivalPolicy.create({
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        retentionDays: input.retentionDays,
        isActive: input.isActive !== undefined ? input.isActive : true,
        legalHold: input.legalHold || false,
      },
    });

    return policy;
  }

  /**
   * Get all archival policies
   */
  async getArchivalPolicies() {
    const policies = await prisma.documentArchivalPolicy.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return policies;
  }

  /**
   * Get archival policy by ID
   */
  async getArchivalPolicy(policyId: string) {
    const policy = await prisma.documentArchivalPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new Error('Archival policy not found');
    }

    return policy;
  }

  /**
   * Update archival policy
   */
  async updateArchivalPolicy(policyId: string, input: Partial<CreateArchivalPolicyInput>) {
    const policy = await prisma.documentArchivalPolicy.update({
      where: { id: policyId },
      data: input,
    });

    return policy;
  }

  /**
   * Delete archival policy
   */
  async deleteArchivalPolicy(policyId: string) {
    await prisma.documentArchivalPolicy.delete({
      where: { id: policyId },
    });

    return { success: true, message: 'Archival policy deleted' };
  }

  /**
   * Apply legal hold to documents
   */
  async applyLegalHold(documentIds: string[], reason: string) {
    // Update documents to prevent archival
    const result = await prisma.document.updateMany({
      where: {
        id: { in: documentIds },
      },
      data: {
        metadata: {
          legalHold: true,
          legalHoldReason: reason,
          legalHoldAppliedAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      message: `Legal hold applied to ${result.count} documents`,
      count: result.count,
    };
  }

  /**
   * Remove legal hold from documents
   */
  async removeLegalHold(documentIds: string[]) {
    const result = await prisma.document.updateMany({
      where: {
        id: { in: documentIds },
      },
      data: {
        metadata: {
          legalHold: false,
          legalHoldReason: null,
          legalHoldRemovedAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      message: `Legal hold removed from ${result.count} documents`,
      count: result.count,
    };
  }

  /**
   * Run archival process
   */
  async runArchivalProcess() {
    console.log('Starting document archival process...');

    // Get all active policies
    const policies = await prisma.documentArchivalPolicy.findMany({
      where: {
        isActive: true,
        legalHold: false,
      },
    });

    let totalArchived = 0;

    for (const policy of policies) {
      const archivedCount = await this.archiveDocumentsByPolicy(policy);
      totalArchived += archivedCount;
    }

    console.log(`Document archival process completed. Archived ${totalArchived} documents.`);

    return {
      success: true,
      totalArchived,
      timestamp: new Date(),
    };
  }

  /**
   * Archive documents based on a policy
   */
  private async archiveDocumentsByPolicy(policy: any): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const where: any = {
      status: 'active',
      createdAt: {
        lt: cutoffDate,
      },
    };

    // Apply category filter if specified
    if (policy.category) {
      where.category = policy.category;
    }

    // Exclude documents with legal hold
    where.NOT = {
      metadata: {
        path: ['legalHold'],
        equals: true,
      },
    };

    // Find documents to archive
    const documentsToArchive = await prisma.document.findMany({
      where,
      select: { id: true },
    });

    if (documentsToArchive.length === 0) {
      return 0;
    }

    // Archive documents
    const result = await prisma.document.updateMany({
      where: {
        id: { in: documentsToArchive.map(d => d.id) },
      },
      data: {
        status: 'archived',
      },
    });

    console.log(`Archived ${result.count} documents under policy: ${policy.name}`);

    return result.count;
  }

  /**
   * Get documents eligible for archival
   */
  async getEligibleDocuments(policyId: string) {
    const policy = await this.getArchivalPolicy(policyId);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    const where: any = {
      status: 'active',
      createdAt: {
        lt: cutoffDate,
      },
    };

    if (policy.category) {
      where.category = policy.category;
    }

    // Exclude documents with legal hold
    where.NOT = {
      metadata: {
        path: ['legalHold'],
        equals: true,
      },
    };

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
        createdAt: 'asc',
      },
    });

    return documents;
  }

  /**
   * Manually archive specific documents
   */
  async archiveDocuments(documentIds: string[]) {
    const result = await prisma.document.updateMany({
      where: {
        id: { in: documentIds },
        status: 'active',
      },
      data: {
        status: 'archived',
      },
    });

    return {
      success: true,
      message: `Archived ${result.count} documents`,
      count: result.count,
    };
  }

  /**
   * Restore archived documents
   */
  async restoreDocuments(documentIds: string[]) {
    const result = await prisma.document.updateMany({
      where: {
        id: { in: documentIds },
        status: 'archived',
      },
      data: {
        status: 'active',
      },
    });

    return {
      success: true,
      message: `Restored ${result.count} documents`,
      count: result.count,
    };
  }

  /**
   * Schedule automated archival job
   */
  private scheduleArchivalJob() {
    // Run daily at 2 AM
    this.cronJob = cron.schedule('0 2 * * *', async () => {
      try {
        await this.runArchivalProcess();
      } catch (error) {
        console.error('Error in scheduled archival process:', error);
      }
    });

    console.log('Document archival job scheduled (daily at 2 AM)');
  }

  /**
   * Stop the archival job
   */
  stopArchivalJob() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Document archival job stopped');
    }
  }
}

export default new DocumentArchivalService();
