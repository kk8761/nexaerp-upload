# Audit Log API Documentation

## Overview

The Audit Log API provides comprehensive audit trail functionality with search, export, and retention capabilities. All audit log endpoints are admin-only and require appropriate RBAC permissions.

**Requirements Implemented:**
- 24.4: 7-year retention policy with automated cleanup
- 24.5: Audit log search with filters (user, date, entity, action)
- 24.6: Immutable audit logs (cannot be modified or deleted)
- 24.8: Audit log export in multiple formats (CSV, JSON, PDF)

## Authentication & Authorization

All audit log endpoints require:
- Valid authentication (JWT token or session)
- RBAC permission: `read:audit` for read operations
- RBAC permission: `delete:audit` for retention policy execution

## Endpoints

### 1. Search Audit Logs

Search and filter audit logs with pagination.

**Endpoint:** `GET /api/audit/logs`

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action (e.g., CREATE, UPDATE, DELETE)
- `entity` (optional): Filter by entity type (e.g., user, product, order)
- `entityId` (optional): Filter by specific entity ID
- `startDate` (optional): Filter by start date (ISO 8601 format)
- `endDate` (optional): Filter by end date (ISO 8601 format)
- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 50): Number of records per page

**Example Request:**
```bash
GET /api/audit/logs?userId=user-123&action=UPDATE&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "audit-log-id",
      "userId": "user-123",
      "action": "UPDATE",
      "entity": "product",
      "entityId": "product-456",
      "details": {
        "oldValues": { "price": 100 },
        "newValues": { "price": 120 }
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-06-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### 2. Export Audit Logs

Export audit logs in various formats (CSV, JSON, PDF).

**Endpoint:** `GET /api/audit/export`

**Query Parameters:**
- `format` (required): Export format - `csv`, `json`, or `pdf`
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action
- `entity` (optional): Filter by entity type
- `entityId` (optional): Filter by specific entity ID
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Example Request:**
```bash
GET /api/audit/export?format=csv&startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
- CSV format: Returns CSV file with headers
- JSON format: Returns JSON file with structured data
- PDF format: Returns PDF document with formatted table

**CSV Export Example:**
```csv
id,userId,action,entity,entityId,ipAddress,userAgent,timestamp
audit-1,user-123,CREATE,product,prod-456,192.168.1.1,Mozilla/5.0...,2024-06-15T10:30:00.000Z
```

**JSON Export Example:**
```json
{
  "exportDate": "2024-06-15T12:00:00.000Z",
  "totalRecords": 150,
  "logs": [
    {
      "id": "audit-1",
      "userId": "user-123",
      "action": "CREATE",
      "entity": "product",
      "entityId": "prod-456",
      "timestamp": "2024-06-15T10:30:00.000Z"
    }
  ]
}
```

### 3. Get Audit Statistics

Retrieve audit log statistics and analytics.

**Endpoint:** `GET /api/audit/stats`

**Query Parameters:**
- `startDate` (optional): Start date for statistics
- `endDate` (optional): End date for statistics

**Example Request:**
```bash
GET /api/audit/stats?startDate=2024-01-01&endDate=2024-12-31
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalLogs": 5000,
    "actionBreakdown": [
      { "action": "CREATE", "count": 1500 },
      { "action": "UPDATE", "count": 2000 },
      { "action": "DELETE", "count": 500 }
    ],
    "entityBreakdown": [
      { "entity": "user", "count": 800 },
      { "entity": "product", "count": 1200 },
      { "entity": "order", "count": 2000 }
    ],
    "topUsers": [
      { "userId": "user-123", "count": 450 },
      { "userId": "user-456", "count": 380 }
    ]
  }
}
```

### 4. Apply Retention Policy

Manually trigger the 7-year retention policy to delete old audit logs.

**Endpoint:** `POST /api/audit/retention`

**Permissions Required:** `delete:audit`

**Example Request:**
```bash
POST /api/audit/retention
```

**Example Response:**
```json
{
  "success": true,
  "message": "Retention policy applied successfully"
}
```

**Note:** This endpoint is also automatically executed daily at 2:00 AM via scheduled task.

### 5. Prevent Audit Log Modification

These endpoints always return 403 to enforce audit log immutability.

**Endpoints:**
- `PUT /api/audit/logs/:id`
- `PATCH /api/audit/logs/:id`
- `DELETE /api/audit/logs/:id`

**Example Response:**
```json
{
  "success": false,
  "message": "Audit logs are immutable and cannot be modified or deleted"
}
```

## Automated Retention Policy

The audit log retention policy runs automatically:
- **Schedule:** Daily at 2:00 AM
- **Retention Period:** 7 years
- **Action:** Deletes audit logs older than 7 years
- **Logging:** Logs the number of deleted records

The scheduler starts automatically when the server starts and stops gracefully on shutdown.

## Security Features

### 1. Immutability
- Audit logs cannot be updated or deleted via API
- Only the automated retention policy can delete old logs
- Prisma schema has no update mapping for AuditLog model

### 2. RBAC Protection
- All endpoints require authentication
- Read operations require `read:audit` permission
- Retention policy requires `delete:audit` permission
- Typically only admin users have these permissions

### 3. Comprehensive Logging
- Captures user ID, action, entity, entity ID
- Records IP address and user agent
- Stores before/after values for updates
- Timestamps all actions

## Integration Examples

### JavaScript/TypeScript
```typescript
// Search audit logs
const response = await fetch('/api/audit/logs?userId=user-123&page=1&limit=50', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Export as CSV
const csvResponse = await fetch('/api/audit/export?format=csv&startDate=2024-01-01', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const blob = await csvResponse.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'audit-logs.csv';
a.click();
```

### cURL
```bash
# Search audit logs
curl -X GET "http://localhost:5000/api/audit/logs?userId=user-123&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Export as CSV
curl -X GET "http://localhost:5000/api/audit/export?format=csv&startDate=2024-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o audit-logs.csv

# Get statistics
curl -X GET "http://localhost:5000/api/audit/stats?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Apply retention policy
curl -X POST "http://localhost:5000/api/audit/retention" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Handling

All endpoints return standard error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `200 OK`: Successful operation
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions or immutability violation
- `500 Internal Server Error`: Server-side error

## Best Practices

1. **Regular Exports**: Export audit logs regularly for external archival
2. **Monitoring**: Monitor audit log growth and retention policy execution
3. **Access Control**: Restrict audit log access to authorized personnel only
4. **Compliance**: Use audit logs for compliance reporting and investigations
5. **Performance**: Use filters and pagination for large datasets

## Compliance

This implementation satisfies:
- **SOX Compliance**: Immutable audit trail with 7-year retention
- **GDPR**: Audit logs track data access and modifications
- **HIPAA**: Comprehensive audit trail for healthcare data
- **ISO 27001**: Security event logging and monitoring
