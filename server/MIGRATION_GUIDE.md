# Database Migration Guide

This guide explains how to migrate data from MongoDB to PostgreSQL and manage database migrations.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ running (via Docker or local installation)
- MongoDB running with existing data
- Environment variables configured in `.env`

## Setup

### 1. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/nexaerp?schema=public
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=nexaerp
POSTGRES_MAX_CONNECTIONS=20

# MongoDB Configuration (for migration)
MONGODB_URI=mongodb://localhost:27017/nexaerp
```

### 2. Start PostgreSQL with Docker

```bash
cd server
docker-compose up -d postgres
```

This will start PostgreSQL with:
- Automated backups (daily at 2 AM)
- Connection pooling configured
- Performance monitoring enabled
- Health checks

### 3. Run Prisma Migrations

Generate Prisma client and apply schema:

```bash
cd server
npx prisma generate
npx prisma db push
```

## Migration Process

### Step 1: Verify Source Data

Check MongoDB data before migration:

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/nexaerp

# Check collections
db.users.countDocuments()
db.products.countDocuments()
db.orders.countDocuments()
```

### Step 2: Run Data Migration

Execute the migration script:

```bash
cd server
npm run build
node dist/scripts/migrateData.js
```

The migration will:
1. Connect to both MongoDB and PostgreSQL
2. Migrate users in batches of 500
3. Migrate products in batches of 500
4. Migrate orders with their items in transactions
5. Validate data integrity
6. Report statistics

### Step 3: Verify Migration

Check PostgreSQL data after migration:

```bash
# Connect to PostgreSQL
psql -h localhost -p 5433 -U postgres -d nexaerp

# Check tables
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "Order";
SELECT COUNT(*) FROM "OrderItem";
```

### Step 4: Monitor Database

Access monitoring endpoints:

```bash
# Health check
curl http://localhost:5000/api/monitoring/health

# Current metrics
curl http://localhost:5000/api/monitoring/metrics

# Database statistics
curl http://localhost:5000/api/monitoring/stats
```

## Backup and Restore

### Create Manual Backup

```bash
cd server
docker exec nexaerp_postgres pg_dump -U postgres -d nexaerp -F c -f /backups/manual_backup.backup
```

Or use the backup script:

```bash
cd server
docker exec nexaerp_postgres /backup.sh
```

### Restore from Backup

```bash
cd server
docker exec -it nexaerp_postgres /restore.sh /backups/nexaerp_20240101_120000.backup.gz
```

## Parallel Systems (Transition Period)

During the transition period, you can run both MongoDB and PostgreSQL:

1. **Read from PostgreSQL, Write to Both**:
   - All new data goes to PostgreSQL
   - Sync writes to MongoDB for backward compatibility
   - Gradually migrate read operations to PostgreSQL

2. **Monitor Both Systems**:
   - Use monitoring endpoints to track PostgreSQL health
   - Keep MongoDB running as fallback
   - Compare data consistency

3. **Gradual Cutover**:
   - Module by module migration
   - Start with non-critical modules
   - Monitor performance and errors
   - Complete cutover when stable

## Migration Utilities

The migration framework provides several utilities:

### Batch Operations

```typescript
import { batchInsert, batchUpdate } from './utils/migration.utils';

// Batch insert
await batchInsert('user', userData, 1000);

// Batch update
await batchUpdate('product', productData, 500);
```

### Data Validation

```typescript
import { validateDataIntegrity } from './utils/migration.utils';

const result = await validateDataIntegrity('user', (user) => {
  return user.email && user.name;
});
```

### Transaction Support

```typescript
import { runInTransaction } from './utils/migration.utils';

await runInTransaction(async (tx) => {
  await tx.order.create({ data: orderData });
  await tx.orderItem.createMany({ data: itemsData });
});
```

## Troubleshooting

### Connection Pool Exhausted

If you see "Connection pool exhausted" errors:

1. Increase `POSTGRES_MAX_CONNECTIONS` in `.env`
2. Check for connection leaks in application code
3. Monitor pool stats: `curl http://localhost:5000/api/monitoring/metrics`

### Slow Queries

If queries are slow:

1. Check slow query log in PostgreSQL
2. Add indexes using migration utilities
3. Monitor cache hit ratio
4. Consider query optimization

### Migration Failures

If migration fails:

1. Check error logs for specific issues
2. Verify data format compatibility
3. Run migration in smaller batches
4. Use transaction rollback for safety

### Data Inconsistencies

If data doesn't match:

1. Use `compareTableData` utility to find differences
2. Re-run specific migration functions
3. Validate with `validateDataIntegrity`
4. Check transformation logic

## Performance Optimization

### Connection Pooling

Configured in `src/config/prisma.ts`:
- Max connections: 20 (configurable)
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds
- Keep-alive enabled

### Indexes

Key indexes are defined in Prisma schema:
- User: email (unique), storeId + isActive
- Product: storeId + isActive, storeId + stock + minStock
- Order: storeId + createdAt, customerId, status + storeId

### Caching

Redis is used for:
- Session storage
- Query result caching
- Rate limiting

## Monitoring

### Database Metrics

- Connection pool utilization
- Active/idle connections
- Cache hit ratio
- Slow query count
- Average query time
- Database size
- Table statistics

### Health Checks

The system monitors:
- Connection pool health (< 80% utilization)
- Database connection health (< 80% utilization)
- Cache hit ratio (> 90%)
- Slow query count (< 10)

### Alerts

Configure alerts for:
- High connection pool utilization
- Low cache hit ratio
- Excessive slow queries
- Database size growth

## Best Practices

1. **Always backup before migration**
2. **Test migration on staging first**
3. **Run migrations during low-traffic periods**
4. **Monitor system during and after migration**
5. **Keep MongoDB running during transition**
6. **Validate data integrity after migration**
7. **Document any custom transformations**
8. **Use transactions for related data**
9. **Batch large datasets**
10. **Monitor performance metrics**

## Support

For issues or questions:
1. Check logs in `server/error.log`
2. Review PostgreSQL logs in Docker container
3. Use monitoring endpoints for diagnostics
4. Consult Prisma documentation for schema issues
