# User Management Module

## Overview

The User Management module provides comprehensive user CRUD operations with RBAC (Role-Based Access Control) integration, audit logging, and bulk operations support. This module is part of Phase 1 Foundation work for the comprehensive ERP enhancement.

**Requirements Implemented:**
- Requirement 5.1: Role-Based Access Control and Enterprise Security
- Requirement 30.2: System Administration

## Features

### Core Functionality
- ✅ User CRUD operations (Create, Read, Update, Delete)
- ✅ User search and filtering
- ✅ Pagination support
- ✅ RBAC integration with role assignment
- ✅ Audit logging for all operations
- ✅ Bulk operations (create, update, deactivate)
- ✅ Session management integration
- ✅ Cache optimization with Redis

### Security Features
- ✅ Permission-based access control
- ✅ Password hashing with bcrypt
- ✅ Audit trail for all user operations
- ✅ Soft delete (deactivation) instead of hard delete
- ✅ Session tracking and management

## Architecture

### Components

```
server/src/
├── controllers/
│   └── user-management.controller.ts    # HTTP request handlers
├── services/
│   └── user-management.service.ts       # Business logic layer
├── routes/
│   └── user-management.routes.ts        # API route definitions
├── views/
│   └── pages/
│       ├── users.ejs                    # User list view
│       ├── user-form.ejs                # Create/Edit form
│       └── user-detail.ejs              # User detail view
└── tests/
    └── user-management.test.ts          # Unit and integration tests
```

### Database Schema

The module uses the existing Prisma User model with the following key fields:

```prisma
model User {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique
  password     String
  phone        String?
  businessName String?
  businessType String?
  role         String    @default("cashier")  // Legacy field
  plan         String    @default("free")
  isActive     Boolean   @default(true)
  lastLogin    DateTime?
  preferences  Json?
  
  // RBAC Relations
  userRoles    UserRole[]
  
  // Other relations...
  sessions     Session[]
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

## API Endpoints

### User CRUD Operations

#### Get All Users
```http
GET /api/users?page=1&limit=20&search=john&role=manager&isActive=true
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name or email
- `role` (optional): Filter by legacy role
- `isActive` (optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

#### Get User by ID
```http
GET /api/users/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "businessName": "Acme Corp",
    "businessType": "retail",
    "role": "manager",
    "plan": "pro",
    "isActive": true,
    "lastLogin": "2024-01-15T10:30:00Z",
    "userRoles": [...],
    "sessions": [...]
  }
}
```

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "phone": "1234567890",
  "businessName": "Acme Corp",
  "businessType": "retail",
  "plan": "basic"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": { ... }
}
```

#### Update User
```http
PUT /api/users/:id
Content-Type: application/json

{
  "name": "John Doe Updated",
  "phone": "9876543210",
  "plan": "pro",
  "isActive": true
}
```

#### Delete User (Soft Delete)
```http
DELETE /api/users/:id
```

### Bulk Operations

#### Bulk Create Users
```http
POST /api/users/bulk/create
Content-Type: application/json

{
  "users": [
    {
      "name": "User 1",
      "email": "user1@example.com",
      "password": "password123"
    },
    {
      "name": "User 2",
      "email": "user2@example.com",
      "password": "password123"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk user creation completed",
  "data": {
    "created": [...],
    "failed": [
      {
        "email": "duplicate@example.com",
        "reason": "User already exists"
      }
    ]
  }
}
```

#### Bulk Update Users
```http
PUT /api/users/bulk/update
Content-Type: application/json

{
  "updates": [
    {
      "id": "uuid1",
      "plan": "pro"
    },
    {
      "id": "uuid2",
      "isActive": false
    }
  ]
}
```

#### Bulk Deactivate Users
```http
POST /api/users/bulk/deactivate
Content-Type: application/json

{
  "userIds": ["uuid1", "uuid2", "uuid3"]
}
```

### Role Management

#### Get User Roles
```http
GET /api/users/:id/roles
```

#### Assign Role to User
```http
POST /api/users/:id/roles
Content-Type: application/json

{
  "roleId": "role-uuid"
}
```

#### Remove Role from User
```http
DELETE /api/users/:id/roles/:roleId
```

### Search

#### Search Users
```http
GET /api/users/search?query=john
```

## Web Views

### User List View
**URL:** `/users`

Features:
- Paginated user list
- Search and filtering
- Bulk selection
- Quick actions (view, edit, delete)

### Create/Edit User Form
**URLs:** 
- Create: `/users/new`
- Edit: `/users/:id/edit`

Features:
- Form validation
- Business information fields
- Plan selection
- Status management (edit mode)

### User Detail View
**URL:** `/users/:id`

Features:
- Complete user information
- Assigned roles display
- Active sessions list
- Quick edit access

## Permissions Required

All endpoints require authentication and specific permissions:

| Endpoint | Permission | Action | Resource |
|----------|-----------|--------|----------|
| GET /api/users | ✓ | read | user |
| GET /api/users/:id | ✓ | read | user |
| POST /api/users | ✓ | create | user |
| PUT /api/users/:id | ✓ | update | user |
| DELETE /api/users/:id | ✓ | delete | user |
| POST /api/users/bulk/* | ✓ | create/update/delete | user |
| GET /api/users/:id/roles | ✓ | read | user |
| POST /api/users/:id/roles | ✓ | update | user |
| DELETE /api/users/:id/roles/:roleId | ✓ | update | user |

## Audit Logging

All user operations are automatically logged with the following information:

- User ID (who performed the action)
- Action type (CREATE_USER, UPDATE_USER, DELETE_USER, etc.)
- Entity type (user)
- Entity ID (affected user ID)
- Details (old and new values for updates)
- IP address
- User agent
- Timestamp

Example audit log entry:
```json
{
  "id": "audit-uuid",
  "userId": "admin-uuid",
  "action": "UPDATE_USER",
  "entity": "user",
  "entityId": "user-uuid",
  "details": {
    "oldValues": { "plan": "basic" },
    "newValues": { "plan": "pro" }
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Caching Strategy

The module implements cache-aside pattern with Redis:

### Cache Keys
- User list: `user:list:{filters}`
- User detail: `user:{userId}`
- RBAC permissions: `rbac:{userId}:*`

### Cache TTL
- User list: 1 minute (SHORT)
- User detail: 1 hour (MEDIUM)

### Cache Invalidation
- On user create: Invalidate all user list caches
- On user update: Invalidate user detail and list caches
- On user delete: Invalidate user detail and list caches
- On role assignment: Invalidate user detail and RBAC caches

## Testing

Run the test suite:

```bash
cd server
npm test -- user-management.test.ts
```

Test coverage includes:
- ✅ User CRUD operations
- ✅ Pagination and filtering
- ✅ Search functionality
- ✅ Bulk operations
- ✅ Role management
- ✅ Validation and error handling
- ✅ Permission checks
- ✅ Audit logging

## Usage Examples

### Creating a User with Role Assignment

```typescript
// 1. Create user
const createResponse = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'securepassword',
    businessName: 'Smith Enterprises',
    businessType: 'retail',
    plan: 'pro'
  })
});

const { data: user } = await createResponse.json();

// 2. Assign role
await fetch(`/api/users/${user.id}/roles`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    roleId: 'manager-role-id'
  })
});
```

### Bulk User Import

```typescript
const users = [
  { name: 'User 1', email: 'user1@example.com', password: 'pass123' },
  { name: 'User 2', email: 'user2@example.com', password: 'pass123' },
  { name: 'User 3', email: 'user3@example.com', password: 'pass123' }
];

const response = await fetch('/api/users/bulk/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ users })
});

const { data } = await response.json();
console.log(`Created: ${data.created.length}, Failed: ${data.failed.length}`);
```

### Searching and Filtering Users

```typescript
// Search by name or email
const searchResponse = await fetch('/api/users/search?query=john', {
  credentials: 'include'
});

// Filter by role and status
const filterResponse = await fetch('/api/users?role=manager&isActive=true&page=1&limit=20', {
  credentials: 'include'
});
```

## Integration with Other Modules

### RBAC Integration
- Uses `requirePermission` middleware for access control
- Integrates with Role and Permission models
- Supports role assignment and removal

### Audit Integration
- Uses `auditLog` middleware for automatic logging
- Logs all create, update, and delete operations
- Captures before/after states for updates

### Session Management
- Displays active sessions in user detail view
- Integrates with session cleanup service
- Tracks user login activity

### Cache Integration
- Uses Redis for performance optimization
- Implements cache warming for frequently accessed data
- Automatic cache invalidation on updates

## Future Enhancements

Potential improvements for future iterations:

1. **Advanced Filtering**
   - Filter by multiple roles
   - Date range filters (created, last login)
   - Custom field filters

2. **User Import/Export**
   - CSV import with validation
   - Excel export with formatting
   - Template download

3. **User Activity Dashboard**
   - Login history visualization
   - Activity timeline
   - Usage statistics

4. **Advanced Bulk Operations**
   - Bulk role assignment
   - Bulk preference updates
   - Scheduled bulk operations

5. **User Notifications**
   - Welcome emails
   - Password reset
   - Account status changes

## Troubleshooting

### Common Issues

**Issue:** Users not appearing in list
- Check RBAC permissions (need `read:user`)
- Verify user is active (`isActive: true`)
- Check cache invalidation

**Issue:** Cannot create user
- Verify email is unique
- Check password meets requirements (min 6 characters)
- Ensure `create:user` permission

**Issue:** Bulk operations failing
- Check array format in request body
- Verify all required fields present
- Review failed items in response

## Support

For issues or questions:
1. Check the test suite for usage examples
2. Review audit logs for operation history
3. Check Redis cache for performance issues
4. Consult RBAC documentation for permission setup

## License

Part of NexaERP - Comprehensive ERP Enhancement Project
