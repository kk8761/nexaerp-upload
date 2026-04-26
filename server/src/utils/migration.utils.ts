/**
 * Migration Utilities
 * Helper functions for database migrations
 */

import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

/**
 * Check if a migration has been run
 */
export async function isMigrationApplied(migrationName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<Array<{ applied: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM "_prisma_migrations" 
        WHERE migration_name = ${migrationName}
      ) as applied
    `;
    return result[0]?.applied || false;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Get list of applied migrations
 */
export async function getAppliedMigrations(): Promise<
  Array<{
    id: string;
    checksum: string;
    finished_at: Date | null;
    migration_name: string;
    logs: string | null;
    rolled_back_at: Date | null;
    started_at: Date;
    applied_steps_count: number;
  }>
> {
  try {
    return await prisma.$queryRaw`
      SELECT * FROM "_prisma_migrations" 
      ORDER BY started_at DESC
    `;
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    return [];
  }
}

/**
 * Batch insert helper
 */
export async function batchInsert<T>(
  model: string,
  data: T[],
  batchSize: number = 1000
): Promise<number> {
  let totalInserted = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      // @ts-ignore - Dynamic model access
      const result = await prisma[model].createMany({
        data: batch,
        skipDuplicates: true,
      });
      totalInserted += result.count;
      console.log(
        `Inserted batch ${Math.floor(i / batchSize) + 1}: ${result.count} records`
      );
    } catch (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }
  }

  return totalInserted;
}

/**
 * Batch update helper
 */
export async function batchUpdate<T extends { id: string }>(
  model: string,
  data: T[],
  batchSize: number = 1000
): Promise<number> {
  let totalUpdated = 0;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      for (const item of batch) {
        const { id, ...updateData } = item;
        // @ts-ignore - Dynamic model access
        await prisma[model].update({
          where: { id },
          data: updateData,
        });
        totalUpdated++;
      }
      console.log(
        `Updated batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`
      );
    } catch (error) {
      console.error(`Error updating batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }
  }

  return totalUpdated;
}

/**
 * Execute raw SQL with transaction support
 */
export async function executeRawSQL(sql: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ SQL executed successfully');
  } catch (error) {
    console.error('❌ Error executing SQL:', error);
    throw error;
  }
}

/**
 * Create indexes for better performance
 */
export async function createIndexes(
  tableName: string,
  indexes: Array<{ name: string; columns: string[]; unique?: boolean }>
): Promise<void> {
  for (const index of indexes) {
    const uniqueClause = index.unique ? 'UNIQUE' : '';
    const sql = `
      CREATE ${uniqueClause} INDEX IF NOT EXISTS ${index.name}
      ON ${tableName} (${index.columns.join(', ')})
    `;
    try {
      await executeRawSQL(sql);
      console.log(`✅ Created index: ${index.name}`);
    } catch (error) {
      console.error(`❌ Error creating index ${index.name}:`, error);
    }
  }
}

/**
 * Validate data integrity
 */
export async function validateDataIntegrity(
  model: string,
  validationFn: (record: any) => boolean
): Promise<{ valid: number; invalid: number; errors: any[] }> {
  let valid = 0;
  let invalid = 0;
  const errors: any[] = [];

  try {
    // @ts-ignore - Dynamic model access
    const records = await prisma[model].findMany();

    for (const record of records) {
      if (validationFn(record)) {
        valid++;
      } else {
        invalid++;
        errors.push(record);
      }
    }

    return { valid, invalid, errors };
  } catch (error) {
    console.error('Error validating data integrity:', error);
    throw error;
  }
}

/**
 * Transaction wrapper for complex migrations
 */
export async function runInTransaction<T>(
  operations: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(operations, {
    maxWait: 10000, // 10 seconds
    timeout: 60000, // 60 seconds
  });
}

/**
 * Backup table before migration
 */
export async function backupTable(tableName: string): Promise<void> {
  const backupTableName = `${tableName}_backup_${Date.now()}`;
  const sql = `CREATE TABLE ${backupTableName} AS SELECT * FROM ${tableName}`;
  
  try {
    await executeRawSQL(sql);
    console.log(`✅ Created backup table: ${backupTableName}`);
  } catch (error) {
    console.error(`❌ Error creating backup table:`, error);
    throw error;
  }
}

/**
 * Get table row count
 */
export async function getTableRowCount(tableName: string): Promise<number> {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return Number(result[0]?.count || 0n);
  } catch (error) {
    console.error(`Error getting row count for ${tableName}:`, error);
    return 0;
  }
}

/**
 * Compare data between two tables
 */
export async function compareTableData(
  table1: string,
  table2: string,
  keyColumn: string = 'id'
): Promise<{
  onlyInTable1: number;
  onlyInTable2: number;
  inBoth: number;
}> {
  try {
    const result = await prisma.$queryRawUnsafe<
      Array<{ only_in_table1: bigint; only_in_table2: bigint; in_both: bigint }>
    >(`
      SELECT 
        COUNT(DISTINCT t1.${keyColumn}) FILTER (WHERE t2.${keyColumn} IS NULL) as only_in_table1,
        COUNT(DISTINCT t2.${keyColumn}) FILTER (WHERE t1.${keyColumn} IS NULL) as only_in_table2,
        COUNT(DISTINCT t1.${keyColumn}) FILTER (WHERE t2.${keyColumn} IS NOT NULL) as in_both
      FROM ${table1} t1
      FULL OUTER JOIN ${table2} t2 ON t1.${keyColumn} = t2.${keyColumn}
    `);

    const data = result[0];
    return {
      onlyInTable1: Number(data?.only_in_table1 || 0n),
      onlyInTable2: Number(data?.only_in_table2 || 0n),
      inBoth: Number(data?.in_both || 0n),
    };
  } catch (error) {
    console.error('Error comparing table data:', error);
    throw error;
  }
}
