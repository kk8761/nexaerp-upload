# RBAC Setup and Usage Guide

## Overview

The Role-Based Access Control (RBAC) system has been fully implemented for NexaERP. This guide explains how to set up and use the RBAC system.

## Components Implemented

### 1. Data Models (Prisma Schema)
- **Role**: Hierarchical role structure with parent-child relationships
- **Permission**: Action-resource pairs (e.g., "create:product", "approve:invoice")
- **RolePermission**: Many-to-many relationship between roles and permissions
- **UserRole**: Many-to-many relationship between users and roles

### 2. Middleware (`server/src/middleware/rbac.middleware.ts`)
- `requirePermission(action, resource)`: Route protection middleware
- `checkUserPermission(userId, action, resource)`: Permission validation with Redis caching
- `validateSoD(userId, actions, resource)`: Segregation of Duties validation
- `enforceSoD(conflictingActions, resource)`: SoD enforcement middleware

### 3. Service Layer (`server/src/services/rbac.service.ts`)
- Role CRUD operations
- Permission management
- User-role assignment
- Cache invalidation

### 4. API Routes (`server/src/routes/rbac.routes.ts`)
- `GET /api/rbac/roles` - List all roles
- `GET /api/rbac/roles/:id` - Get role details
- `POST /api/rbac/roles` - Create new role
- `PUT /api/rbac/roles/:id` - Update role
- `DELETE /api/rbac/roles/:id` - Delete role
- `GET /api/rbac/permissions` - List all permissions
- `POST /api/rbac/roles/:roleId/permissions` - Assign permission to role
- `DELETE /api/rbac/roles/:roleId/permissions/:permissionId` - Remove permission
- `GET /api/rbac/users/:userId/roles` - Get user roles
- `POST /api/rbac/users/:userId/roles` - Assign role to user
- `DELETE /api/rbac/users/:userId/roles/:roleId` - Remove role from user

### 5. Seed Data (`server/prisma/seeds/rbac.seed.ts`)
Default roles created:
- **admin**: Full system access
- **manager**: Approval rights and management access
- **cashier**: Sales and order management
- **warehouse**: Inventory management
- **accountant**: Financial management
- **viewer**: Read-only access

## Setup Instructions

### Step 1: Run Database Migration

```bash
cd server
npx prisma migrate dev --name add_rbac_models
```

This creates the RBAC tables in your PostgreSQL database.

### Step 2: Seed Default Roles and Permissions

```bash
cd server
npx ts-node prisma/seeds/rbac.seed.ts
```

This creates:
- 45+ default permissions
- 6 default roles with appropriate permissions

### Step 3: Verify Setup

Check that the tables were created:

```bash
npx prisma studio
```

Navigate to the Role, Permission, RolePermission, and UserRole tables.

## Usage Examples

### Protecting Routes with RBAC

```typescript
import { requirePermission } from '../middleware/rbac.middleware';
import { authenticateToken } from '../middleware/auth';

// Protect a route - user must have 'create' permission on 'product' resource
router.post('/products', 
  authenticateToken,
  requirePermission('create', 'product'),
  async (req, res) => {
    // Your route handler
  }
);
```

### Enforcing Segregation of Duties

```typescript
import { enforceSoD } from '../middleware/rbac.middleware';

// Prevent users from having both 'create' and 'approve' permissions
router.post('/invoices/:id/approve',
  authenticateToken,
  enforceSoD(['create', 'approve'], 'invoice'),
  requirePermission('approve', 'invoice'),
  async (req, res) => {
    // Approval logic
  }
);
```

### Assigning Roles to Users (API)

```bash
# Assign 'cashier' role to a user
POST /api/rbac/users/{userId}/roles
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "roleId": "{cashier_role_id}"
}
```

### Creating Custom Roles (API)

```bash
# Create a new role
POST /api/rbac/roles
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "sales_rep",
  "description": "Sales representative with limited access"
}

# Assign permissions to the role
POST /api/rbac/roles/{roleId}/permissions
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "action": "create",
  "resource": "order"
}
```

## Permission Structure

Permissions follow the format: `{action}:{resource}`

### Available Actions
- `create` - Create new records
- `read` - View records
- `update` - Modify existing records
- `delete` - Remove records
- `approve` - Approve records (for workflows)

### Available Resources
- `user`, `role`, `permission`
- `product`, `inventory`, `order`
- `invoice`, `transaction`
- `customer`, `supplier`
- `report`, `audit`

## Caching

The RBAC system uses Redis caching to optimize performance:
- User permissions are cached for 1 minute
- Cache is automatically invalidated when roles or permissions change
- Cache key format: `rbac:{userId}:{action}:{resource}`

## Hierarchical Roles

Roles support parent-child relationships:

```typescript
// Create a parent role
const managerRole = await rbacService.createRole({
  name: 'manager',
  description: 'Manager role'
});

// Create a child role that inherits from manager
const seniorManagerRole = await rbacService.createRole({
  name: 'senior_manager',
  description: 'Senior manager with additional permissions',
  parentId: managerRole.id
});
```

## Security Features

1. **Field-Level Security**: Permissions are checked at the route level
2. **Record-Level Security**: Can be implemented using conditions in permission checks
3. **Segregation of Duties**: Prevents users from having conflicting permissions
4. **Audit Trail**: All permission checks are logged (when audit logging is enabled)
5. **Session Management**: Permissions are cached per session for performance

## Testing RBAC

### Test Permission Check

```bash
# Try accessing a protected route without permission
GET /api/products
Authorization: Bearer {user_token_without_permission}

# Expected: 403 Forbidden
```

### Test SoD Enforcement

```bash
# Assign both 'create' and 'approve' permissions to a user
# Then try to approve an invoice they created

POST /api/invoices/{id}/approve
Authorization: Bearer {user_token_with_both_permissions}

# Expected: 403 Segregation of Duties Violation
```

## Troubleshooting

### Permission Denied Errors

1. Check user has the required role assigned
2. Check role has the required permission
3. Clear Redis cache: `redis-cli FLUSHDB`
4. Check audit logs for permission check failures

### SoD Violations

1. Review user's assigned roles
2. Check for conflicting permissions
3. Remove one of the conflicting roles

### Cache Issues

1. Restart Redis: `redis-cli FLUSHDB`
2. Check Redis connection in cache.service.ts
3. Verify CACHE_TTL settings

## Next Steps

1. **Admin UI**: Build a web interface for role management
2. **Field-Level Security**: Implement field-level permission filtering
3. **Row-Level Security**: Add record-level access control
4. **Audit Integration**: Connect RBAC to audit logging system
5. **Custom Conditions**: Add conditional permissions based on data values

## API Documentation

Full API documentation is available at:
- Swagger UI: `http://localhost:5000/api-docs` (when implemented)
- Postman Collection: Import from `docs/postman/rbac.json` (when created)

## Support

For issues or questions:
1. Check the error logs in `server/error.log`
2. Review the RBAC middleware code
3. Test with Prisma Studio to verify database state
