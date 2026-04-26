import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { 
  getOrSetCache, 
  invalidateCache, 
  invalidateCachePattern, 
  CACHE_TTL, 
  CACHE_PREFIX 
} from '../services/cache.service';

export class CRMController {
  // ─── LEADS ──────────────────────────────────────────────────────────────

  /**
   * Calculate lead score (0-100) based on multiple factors
   * Requirements: 1.2 - Automated lead scoring
   */
  private static calculateLeadScore(lead: any): number {
    let score = 0;

    // Source-based scoring (max 30 points)
    const sourceScores: Record<string, number> = {
      referral: 30,
      website: 20,
      cold_call: 10,
      organic: 15
    };
    score += sourceScores[lead.source] || 10;

    // Email presence (10 points)
    if (lead.email) score += 10;

    // Phone presence (10 points)
    if (lead.phone) score += 10;

    // Company presence (15 points)
    if (lead.company) score += 15;

    // Activity count (max 25 points, 5 per activity)
    const activityCount = lead.activities?.length || 0;
    score += Math.min(activityCount * 5, 25);

    // Recency bonus (10 points if created within last 7 days)
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation <= 7) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Auto-assign lead to user based on round-robin or workload
   * Requirements: 1.1 - Lead assignment rules
   */
  private static async autoAssignLead(leadId: string): Promise<void> {
    try {
      // Get all active users with sales roles (simplified - in production, filter by role)
      const salesUsers = await prisma.user.findMany({
        where: { isActive: true },
        include: {
          assignedLeads: {
            where: { status: { notIn: ['converted', 'lost'] } }
          }
        }
      });

      if (salesUsers.length === 0) return;

      // Find user with least assigned leads (workload balancing)
      const userWithLeastLeads = salesUsers.reduce((min, user) => 
        user.assignedLeads.length < min.assignedLeads.length ? user : min
      );

      await prisma.lead.update({
        where: { id: leadId },
        data: { assignedToId: userWithLeastLeads.id }
      });
    } catch (error) {
      console.error('Auto-assignment failed:', error);
      // Don't throw - assignment failure shouldn't block lead creation
    }
  }

  static async createLead(req: Request, res: Response) {
    try {
      const { firstName, lastName, email, phone, company, source, assignedToId } = req.body;
      
      // Create lead
      const lead = await prisma.lead.create({
        data: { 
          firstName, 
          lastName, 
          email, 
          phone, 
          company, 
          source,
          assignedToId: assignedToId || null
        },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } }
        }
      });

      // Calculate initial score
      const score = CRMController.calculateLeadScore(lead);
      
      // Update lead with score
      const updatedLead = await prisma.lead.update({
        where: { id: lead.id },
        data: { score },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } }
        }
      });

      // Auto-assign if not manually assigned
      if (!assignedToId) {
        await CRMController.autoAssignLead(lead.id);
      }
      
      // Invalidate leads list cache
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}leads:*`);
      
      res.status(201).json({ success: true, lead: updatedLead });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to create lead' });
    }
  }

  static async updateLeadScore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const lead = await prisma.lead.findUnique({
        where: { id },
        include: { activities: true }
      });

      if (!lead) {
        res.status(404).json({ success: false, message: 'Lead not found' });
        return;
      }

      const score = CRMController.calculateLeadScore(lead);
      
      const updatedLead = await prisma.lead.update({
        where: { id },
        data: { score },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } }
        }
      });

      await invalidateCache(`${CACHE_PREFIX.CRM}lead:${id}`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}leads:*`);

      res.json({ success: true, lead: updatedLead });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to update lead score' });
    }
  }

  static async convertLeadToOpportunity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, value, probability, stage, expectedClose, assignedToId } = req.body;

      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        res.status(404).json({ success: false, message: 'Lead not found' });
        return;
      }

      // Create opportunity from lead
      const opportunity = await prisma.opportunity.create({
        data: {
          name: name || `${lead.firstName} ${lead.lastName} - ${lead.company || 'Opportunity'}`,
          leadId: id,
          value: Number(value) || 0,
          probability: Number(probability) || 10,
          stage: stage || 'prospecting',
          expectedClose: expectedClose ? new Date(expectedClose) : null,
          assignedToId: assignedToId || lead.assignedToId
        },
        include: {
          lead: true,
          assignedTo: { select: { id: true, name: true, email: true } }
        }
      });

      // Update lead status to converted
      await prisma.lead.update({
        where: { id },
        data: { status: 'converted' }
      });

      await invalidateCache(`${CACHE_PREFIX.CRM}lead:${id}`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}leads:*`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);

      res.status(201).json({ success: true, opportunity });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to convert lead to opportunity' });
    }
  }

  static async getLeads(_req: Request, res: Response) {
    try {
      const cacheKey = `${CACHE_PREFIX.CRM}leads:all`;
      
      const leads = await getOrSetCache(
        cacheKey,
        async () => {
          return await prisma.lead.findMany({
            orderBy: { createdAt: 'desc' }
          });
        },
        CACHE_TTL.SHORT // Leads change frequently
      );
      
      res.json({ success: true, leads });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to retrieve leads' });
    }
  }

  // ─── OPPORTUNITIES ────────────────────────────────────────────────────────

  static async createOpportunity(req: Request, res: Response) {
    try {
      const { name, leadId, value, probability, stage, expectedClose, assignedToId } = req.body;
      const opp = await prisma.opportunity.create({
        data: {
          name,
          leadId,
          value: Number(value) || 0,
          probability: Number(probability) || 10,
          stage: stage || 'prospecting',
          expectedClose: expectedClose ? new Date(expectedClose) : null,
          assignedToId: assignedToId || null
        },
        include: {
          lead: true,
          assignedTo: { select: { id: true, name: true, email: true } }
        }
      });
      
      // Invalidate opportunities cache
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);
      await invalidateCache(`${CACHE_PREFIX.CRM}forecast`);
      
      res.status(201).json({ success: true, opportunity: opp });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to create opportunity' });
    }
  }

  static async getOpportunities(req: Request, res: Response) {
    try {
      const { stage, leadId, assignedToId } = req.query;
      
      const where: any = {};
      if (stage) where.stage = stage;
      if (leadId) where.leadId = leadId;
      if (assignedToId) where.assignedToId = assignedToId;

      // Create cache key based on filters
      const cacheKey = `${CACHE_PREFIX.CRM}opportunities:${JSON.stringify(where)}`;

      const opportunities = await getOrSetCache(
        cacheKey,
        async () => {
          return await prisma.opportunity.findMany({
            where,
            include: {
              lead: { select: { id: true, firstName: true, lastName: true, company: true } },
              assignedTo: { select: { id: true, name: true, email: true } },
              quotations: { select: { id: true, quoteNo: true, status: true, total: true } },
              activities: { select: { id: true, type: true, subject: true, status: true } }
            },
            orderBy: { createdAt: 'desc' }
          });
        },
        CACHE_TTL.SHORT
      );

      res.json({ success: true, opportunities });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to retrieve opportunities' });
    }
  }

  static async getOpportunityById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const cacheKey = `${CACHE_PREFIX.CRM}opportunity:${id}`;
      
      const opportunity = await getOrSetCache(
        cacheKey,
        async () => {
          return await prisma.opportunity.findUnique({
            where: { id },
            include: {
              lead: true,
              assignedTo: { select: { id: true, name: true, email: true } },
              quotations: {
                include: {
                  items: true
                },
                orderBy: { createdAt: 'desc' }
              },
              activities: {
                include: {
                  createdBy: { select: { id: true, name: true, email: true } }
                },
                orderBy: { createdAt: 'desc' }
              }
            }
          });
        },
        CACHE_TTL.MEDIUM
      );

      if (!opportunity) {
        res.status(404).json({ success: false, message: 'Opportunity not found' });
        return;
      }

      res.json({ success: true, opportunity });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to retrieve opportunity' });
    }
  }

  static async updateOpportunity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, value, probability, stage, expectedClose, assignedToId } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (value !== undefined) updateData.value = Number(value);
      if (probability !== undefined) updateData.probability = Number(probability);
      if (stage !== undefined) updateData.stage = stage;
      if (expectedClose !== undefined) updateData.expectedClose = expectedClose ? new Date(expectedClose) : null;
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

      const opportunity = await prisma.opportunity.update({
        where: { id },
        data: updateData,
        include: {
          lead: true,
          assignedTo: { select: { id: true, name: true, email: true } }
        }
      });

      // Invalidate related caches
      await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${id}`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);
      await invalidateCache(`${CACHE_PREFIX.CRM}forecast`);

      res.json({ success: true, opportunity });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to update opportunity' });
    }
  }

  static async updateOpportunityStage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { stage } = req.body;

      const validStages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
      if (!validStages.includes(stage)) {
        res.status(400).json({ success: false, message: 'Invalid stage' });
        return;
      }

      const opportunity = await prisma.opportunity.update({
        where: { id },
        data: { stage },
        include: {
          lead: true,
          assignedTo: { select: { id: true, name: true, email: true } }
        }
      });

      // Invalidate related caches
      await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${id}`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);
      await invalidateCache(`${CACHE_PREFIX.CRM}forecast`);

      res.json({ success: true, opportunity });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to update opportunity stage' });
    }
  }

  static async getForecastedRevenue(_req: Request, res: Response) {
    try {
      const cacheKey = `${CACHE_PREFIX.CRM}forecast`;
      
      const forecast = await getOrSetCache(
        cacheKey,
        async () => {
          // Get all open opportunities (not closed_won or closed_lost)
          const opportunities = await prisma.opportunity.findMany({
            where: {
              stage: {
                notIn: ['closed_won', 'closed_lost']
              }
            }
          });

          // Calculate weighted pipeline value
          let totalWeightedValue = 0;
          const byStage: Record<string, { count: number; value: number; weightedValue: number }> = {};

          opportunities.forEach(opp => {
            const weightedValue = (opp.value * opp.probability) / 100;
            totalWeightedValue += weightedValue;

            if (!byStage[opp.stage]) {
              byStage[opp.stage] = { count: 0, value: 0, weightedValue: 0 };
            }
            byStage[opp.stage].count++;
            byStage[opp.stage].value += opp.value;
            byStage[opp.stage].weightedValue += weightedValue;
          });

          // Calculate win rate and average deal size
          const closedOpportunities = await prisma.opportunity.findMany({
            where: {
              stage: {
                in: ['closed_won', 'closed_lost']
              }
            }
          });

          const wonOpportunities = closedOpportunities.filter(o => o.stage === 'closed_won');
          const winRate = closedOpportunities.length > 0 
            ? (wonOpportunities.length / closedOpportunities.length) * 100 
            : 0;

          const totalWonValue = wonOpportunities.reduce((sum, o) => sum + o.value, 0);
          const averageDealSize = wonOpportunities.length > 0 
            ? totalWonValue / wonOpportunities.length 
            : 0;

          return {
            totalWeightedValue,
            totalPipelineValue: opportunities.reduce((sum, o) => sum + o.value, 0),
            openOpportunities: opportunities.length,
            byStage,
            winRate: Math.round(winRate * 100) / 100,
            averageDealSize: Math.round(averageDealSize * 100) / 100
          };
        },
        CACHE_TTL.MEDIUM // Forecast can be cached for a bit longer
      );

      res.json({
        success: true,
        forecast
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to calculate forecast' });
    }
  }

  static async convertOpportunityToQuotation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { items, validUntil } = req.body;

      // Verify opportunity exists
      const opportunity = await prisma.opportunity.findUnique({
        where: { id }
      });

      if (!opportunity) {
        res.status(404).json({ success: false, message: 'Opportunity not found' });
        return;
      }

      // items expects [{ productId, productName, qty, price, discount }]
      let subtotal = 0;
      let taxAmount = 0;
      
      const quotationItems = items.map((item: any) => {
        const itemSubtotal = (item.qty * item.price) - (item.discount || 0);
        subtotal += itemSubtotal;
        return {
          productId: item.productId,
          productName: item.productName,
          qty: item.qty,
          price: item.price,
          discount: item.discount || 0,
          subtotal: itemSubtotal
        };
      });

      const total = subtotal + taxAmount;

      const quotation = await prisma.quotation.create({
        data: {
          quoteNo: `QT-${Date.now()}`,
          opportunityId: id,
          subtotal,
          taxAmount,
          total,
          validUntil: new Date(validUntil),
          items: {
            create: quotationItems
          }
        },
        include: { 
          items: true,
          opportunity: {
            include: {
              lead: true
            }
          }
        }
      });

      // Invalidate opportunity cache since it now has a quotation
      await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${id}`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);

      res.status(201).json({ success: true, quotation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to convert opportunity to quotation' });
    }
  }

  // ─── QUOTATIONS ──────────────────────────────────────────────────────────

  static async createQuotation(req: Request, res: Response) {
    try {
      const { opportunityId, items, validUntil } = req.body;
      // items expects [{ productId, productName, qty, price, discount }]
      
      let subtotal = 0;
      let taxAmount = 0;
      
      const quotationItems = items.map((item: any) => {
        const itemSubtotal = (item.qty * item.price) - (item.discount || 0);
        subtotal += itemSubtotal;
        return {
          productId: item.productId,
          productName: item.productName,
          qty: item.qty,
          price: item.price,
          discount: item.discount || 0,
          subtotal: itemSubtotal
        };
      });

      const total = subtotal + taxAmount;

      const quotation = await prisma.quotation.create({
        data: {
          quoteNo: `QT-${Date.now()}`,
          opportunityId,
          subtotal,
          taxAmount,
          total,
          validUntil: new Date(validUntil),
          items: {
            create: quotationItems
          }
        },
        include: { items: true }
      });

      // Invalidate opportunity cache
      await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${opportunityId}`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);

      res.status(201).json({ success: true, quotation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to create quotation' });
    }
  }

  static async getQuotations(req: Request, res: Response) {
    try {
      const { status, opportunityId } = req.query;
      
      const where: any = {};
      if (status) where.status = status;
      if (opportunityId) where.opportunityId = opportunityId;

      const quotations = await prisma.quotation.findMany({
        where,
        include: {
          items: true,
          opportunity: {
            include: {
              lead: { select: { id: true, firstName: true, lastName: true, company: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, quotations });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to retrieve quotations' });
    }
  }

  static async getQuotationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
          items: true,
          opportunity: {
            include: {
              lead: true,
              assignedTo: { select: { id: true, name: true, email: true } }
            }
          }
        }
      });

      if (!quotation) {
        res.status(404).json({ success: false, message: 'Quotation not found' });
        return;
      }

      res.json({ success: true, quotation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to retrieve quotation' });
    }
  }

  /**
   * Approve quotation
   * Requirements: 1.5 - Quotation approval workflow
   */
  static async approveQuotation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const quotation = await prisma.quotation.findUnique({
        where: { id }
      });

      if (!quotation) {
        res.status(404).json({ success: false, message: 'Quotation not found' });
        return;
      }

      if (quotation.status !== 'draft' && quotation.status !== 'sent') {
        res.status(400).json({ 
          success: false, 
          message: 'Only draft or sent quotations can be approved' 
        });
        return;
      }

      const updatedQuotation = await prisma.quotation.update({
        where: { id },
        data: { status: 'approved' },
        include: {
          items: true,
          opportunity: true
        }
      });

      // Invalidate caches
      await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${quotation.opportunityId}`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);

      res.json({ success: true, quotation: updatedQuotation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to approve quotation' });
    }
  }

  /**
   * Reject quotation
   * Requirements: 1.5 - Quotation approval workflow
   */
  static async rejectQuotation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const quotation = await prisma.quotation.findUnique({
        where: { id }
      });

      if (!quotation) {
        res.status(404).json({ success: false, message: 'Quotation not found' });
        return;
      }

      const updatedQuotation = await prisma.quotation.update({
        where: { id },
        data: { status: 'rejected' },
        include: {
          items: true,
          opportunity: true
        }
      });

      await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${quotation.opportunityId}`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);

      res.json({ success: true, quotation: updatedQuotation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to reject quotation' });
    }
  }

  /**
   * Convert approved quotation to sales order
   * Requirements: 1.6 - Quotation-to-sales-order conversion
   */
  static async convertQuotationToSalesOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { customerId, customerName, customerPhone, paymentMode } = req.body;

      const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
          items: true,
          opportunity: {
            include: {
              lead: true
            }
          }
        }
      });

      if (!quotation) {
        res.status(404).json({ success: false, message: 'Quotation not found' });
        return;
      }

      if (quotation.status !== 'approved') {
        res.status(400).json({ 
          success: false, 
          message: 'Only approved quotations can be converted to sales orders' 
        });
        return;
      }

      // Check if quotation is expired
      if (new Date(quotation.validUntil) < new Date()) {
        res.status(400).json({ 
          success: false, 
          message: 'Quotation has expired' 
        });
        return;
      }

      // Create sales order from quotation
      const year = new Date().getFullYear();
      const orderCount = await prisma.order.count() + 1;
      const orderNo = `ORD-${year}-${String(orderCount).padStart(4, '0')}`;
      const invoiceNo = `INV-${year}-${String(orderCount).padStart(4, '0')}`;

      // Map quotation items to order items
      const orderItems = quotation.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        price: item.price,
        cost: 0, // Cost would need to be fetched from product
        gst: 0,
        discount: item.discount,
        subtotal: item.subtotal,
        gstAmount: 0
      }));

      const order = await prisma.order.create({
        data: {
          orderNo,
          invoiceNo,
          type: 'sale',
          customerId,
          customerName: customerName || `${quotation.opportunity.lead.firstName} ${quotation.opportunity.lead.lastName}`,
          customerPhone: customerPhone || quotation.opportunity.lead.phone || '',
          subtotal: quotation.subtotal,
          discount: 0,
          taxAmount: quotation.taxAmount,
          total: quotation.total,
          paymentMode: paymentMode || 'pending',
          paymentStatus: 'pending',
          amountPaid: 0,
          status: 'pending',
          items: {
            create: orderItems
          }
        },
        include: {
          items: true
        }
      });

      // Update opportunity stage to closed_won
      await prisma.opportunity.update({
        where: { id: quotation.opportunityId },
        data: { stage: 'closed_won' }
      });

      // Invalidate caches
      await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${quotation.opportunityId}`);
      await invalidateCachePattern(`${CACHE_PREFIX.CRM}opportunities:*`);
      await invalidateCache(`${CACHE_PREFIX.CRM}forecast`);

      res.status(201).json({ 
        success: true, 
        order,
        message: 'Quotation successfully converted to sales order'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to convert quotation to sales order' });
    }
  }

  // ─── ACTIVITIES ──────────────────────────────────────────────────────────

  static async createActivity(req: Request, res: Response) {
    try {
      const { type, subject, description, leadId, opportunityId, scheduledDate } = req.body;
      const user: any = req.user;

      const activity = await prisma.activity.create({
        data: {
          type,
          subject,
          description,
          leadId,
          opportunityId,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          createdById: user.id
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          opportunity: { select: { id: true, name: true, stage: true } }
        }
      });
      
      // Invalidate related caches
      if (opportunityId) {
        await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${opportunityId}`);
      }
      if (leadId) {
        await invalidateCache(`${CACHE_PREFIX.CRM}lead:${leadId}`);
      }
      
      res.status(201).json({ success: true, activity });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to log activity' });
    }
  }

  /**
   * Get activity timeline for a lead or opportunity
   * Requirements: 1.7 - Activity timeline view
   */
  static async getActivityTimeline(req: Request, res: Response) {
    try {
      const { leadId, opportunityId, userId } = req.query;
      
      const where: any = {};
      if (leadId) where.leadId = leadId;
      if (opportunityId) where.opportunityId = opportunityId;
      if (userId) where.createdById = userId;

      const activities = await prisma.activity.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          opportunity: { select: { id: true, name: true, stage: true } }
        },
        orderBy: [
          { scheduledDate: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      res.json({ success: true, activities });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to retrieve activity timeline' });
    }
  }

  /**
   * Update activity status (mark as completed)
   * Requirements: 1.7 - Customer interaction tracking
   */
  static async updateActivityStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, completedDate } = req.body;

      const validStatuses = ['planned', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status' });
        return;
      }

      const updateData: any = { status };
      if (status === 'completed' && completedDate) {
        updateData.completedDate = new Date(completedDate);
      } else if (status === 'completed') {
        updateData.completedDate = new Date();
      }

      const activity = await prisma.activity.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          lead: { select: { id: true, firstName: true, lastName: true } },
          opportunity: { select: { id: true, name: true } }
        }
      });

      // Invalidate related caches
      if (activity.opportunityId) {
        await invalidateCache(`${CACHE_PREFIX.CRM}opportunity:${activity.opportunityId}`);
      }
      if (activity.leadId) {
        await invalidateCache(`${CACHE_PREFIX.CRM}lead:${activity.leadId}`);
      }

      res.json({ success: true, activity });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to update activity status' });
    }
  }

  /**
   * Get upcoming activities (reminders)
   * Requirements: 1.7 - Activity reminders and notifications
   */
  static async getUpcomingActivities(req: Request, res: Response) {
    try {
      const user: any = req.user;
      const { days = 7 } = req.query;

      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Number(days));

      const activities = await prisma.activity.findMany({
        where: {
          createdById: user.id,
          status: 'planned',
          scheduledDate: {
            gte: now,
            lte: futureDate
          }
        },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          opportunity: { select: { id: true, name: true, stage: true, value: true } }
        },
        orderBy: { scheduledDate: 'asc' }
      });

      res.json({ success: true, activities, count: activities.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to retrieve upcoming activities' });
    }
  }

  /**
   * Get overdue activities
   * Requirements: 1.7 - Activity reminders and notifications
   */
  static async getOverdueActivities(req: Request, res: Response) {
    try {
      const user: any = req.user;

      const now = new Date();

      const activities = await prisma.activity.findMany({
        where: {
          createdById: user.id,
          status: 'planned',
          scheduledDate: {
            lt: now
          }
        },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          opportunity: { select: { id: true, name: true, stage: true, value: true } }
        },
        orderBy: { scheduledDate: 'asc' }
      });

      res.json({ success: true, activities, count: activities.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to retrieve overdue activities' });
    }
  }
}
