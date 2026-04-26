/**
 * Cache Warming Service
 * Implements Task 3.2: Cache warming for frequently accessed data
 * 
 * This service pre-loads frequently accessed data into Redis cache
 * during application startup to improve initial response times.
 */

import prisma from '../config/prisma';
import { warmCacheBatch, CACHE_TTL, CACHE_PREFIX } from './cache.service';

/**
 * Warm all critical caches on application startup
 */
export async function warmCriticalCaches(): Promise<void> {
  console.log('🔥 Starting cache warming process...');
  
  const startTime = Date.now();
  
  try {
    await warmCacheBatch([
      // Warm warehouses cache (stable reference data)
      {
        key: `${CACHE_PREFIX.INVENTORY}warehouses:all`,
        fetcher: async () => {
          return await prisma.warehouse.findMany();
        },
        ttl: CACHE_TTL.LONG,
      },
      
      // Warm CRM leads cache
      {
        key: `${CACHE_PREFIX.CRM}leads:all`,
        fetcher: async () => {
          return await prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit to recent leads for warming
          });
        },
        ttl: CACHE_TTL.SHORT,
      },
      
      // Warm open opportunities cache
      {
        key: `${CACHE_PREFIX.CRM}opportunities:{}`,
        fetcher: async () => {
          return await prisma.opportunity.findMany({
            where: {},
            include: {
              lead: { select: { id: true, firstName: true, lastName: true, company: true } },
              assignedTo: { select: { id: true, name: true, email: true } },
              quotations: { select: { id: true, quoteNo: true, status: true, total: true } },
              activities: { select: { id: true, type: true, subject: true, status: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit for warming
          });
        },
        ttl: CACHE_TTL.SHORT,
      },
      
      // Warm revenue forecast cache
      {
        key: `${CACHE_PREFIX.CRM}forecast`,
        fetcher: async () => {
          const opportunities = await prisma.opportunity.findMany({
            where: {
              stage: {
                notIn: ['closed_won', 'closed_lost']
              }
            }
          });

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
        ttl: CACHE_TTL.MEDIUM,
      },
      
      // Warm inventory valuation cache
      {
        key: `${CACHE_PREFIX.INVENTORY}valuation:all`,
        fetcher: async () => {
          return await prisma.$queryRaw`
            SELECT 
              p.id, p.name, p.category, p.stock,
              COALESCE(AVG(b."costPerUnit"), p.cost) as "avgCost",
              p.stock * COALESCE(AVG(b."costPerUnit"), p.cost) as "totalValue"
            FROM "Product" p
            LEFT JOIN "InventoryBatch" b ON p.id = b."productId" AND b.quantity > 0
            WHERE p.stock > 0
            GROUP BY p.id
            LIMIT 100
          `;
        },
        ttl: CACHE_TTL.MEDIUM,
      },
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Cache warming completed in ${duration}ms`);
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
    // Don't throw - allow app to start even if cache warming fails
  }
}

/**
 * Warm cache for a specific module
 */
export async function warmModuleCache(module: 'crm' | 'inventory' | 'accounting'): Promise<void> {
  console.log(`🔥 Warming ${module} cache...`);
  
  switch (module) {
    case 'crm':
      await warmCacheBatch([
        {
          key: `${CACHE_PREFIX.CRM}leads:all`,
          fetcher: async () => await prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
          ttl: CACHE_TTL.SHORT,
        },
        {
          key: `${CACHE_PREFIX.CRM}opportunities:{}`,
          fetcher: async () => await prisma.opportunity.findMany({ 
            include: {
              lead: { select: { id: true, firstName: true, lastName: true, company: true } },
              assignedTo: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          }),
          ttl: CACHE_TTL.SHORT,
        },
      ]);
      break;
      
    case 'inventory':
      await warmCacheBatch([
        {
          key: `${CACHE_PREFIX.INVENTORY}warehouses:all`,
          fetcher: async () => await prisma.warehouse.findMany(),
          ttl: CACHE_TTL.LONG,
        },
        {
          key: `${CACHE_PREFIX.INVENTORY}valuation:all`,
          fetcher: async () => await prisma.$queryRaw`
            SELECT 
              p.id, p.name, p.category, p.stock,
              COALESCE(AVG(b."costPerUnit"), p.cost) as "avgCost",
              p.stock * COALESCE(AVG(b."costPerUnit"), p.cost) as "totalValue"
            FROM "Product" p
            LEFT JOIN "InventoryBatch" b ON p.id = b."productId" AND b.quantity > 0
            WHERE p.stock > 0
            GROUP BY p.id
            LIMIT 100
          `,
          ttl: CACHE_TTL.MEDIUM,
        },
      ]);
      break;
      
    case 'accounting':
      // Add accounting cache warming when accounting module is implemented
      console.log('Accounting cache warming not yet implemented');
      break;
  }
  
  console.log(`✅ ${module} cache warmed`);
}
