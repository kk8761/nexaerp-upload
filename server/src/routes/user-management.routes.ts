/**
 * User Management Routes
 * API routes for user CRUD operations with RBAC
 * Requirements: 5.1, 30.2
 */

import { Router } from 'express';
import { UserManagementController } from '../controllers/user-management.controller';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = Router();

// ─── User CRUD Operations ──────────────────────────────────

/**
 * GET /api/users
 * Get all users with pagination and filtering
 */
router.get(
  '/',
  requirePermission('read', 'user'),
  UserManagementController.getUsers
);

/**
 * GET /api/users/search
 * Search users by name or email
 */
router.get(
  '/search',
  requirePermission('read', 'user'),
  UserManagementController.searchUsers
);

/**
 * GET /api/users/:id
 * Get single user by ID
 */
router.get(
  '/:id',
  requirePermission('read', 'user'),
  UserManagementController.getUserById
);

/**
 * POST /api/users
 * Create new user
 */
router.post(
  '/',
  requirePermission('create', 'user'),
  auditLog('CREATE_USER', 'user'),
  UserManagementController.createUser
);

/**
 * PUT /api/users/:id
 * Update user
 */
router.put(
  '/:id',
  requirePermission('update', 'user'),
  auditLog('UPDATE_USER', 'user'),
  UserManagementController.updateUser
);

/**
 * DELETE /api/users/:id
 * Delete user (soft delete)
 */
router.delete(
  '/:id',
  requirePermission('delete', 'user'),
  auditLog('DELETE_USER', 'user'),
  UserManagementController.deleteUser
);

// ─── Bulk Operations ───────────────────────────────────────

/**
 * POST /api/users/bulk/create
 * Bulk create users
 */
router.post(
  '/bulk/create',
  requirePermission('create', 'user'),
  auditLog('BULK_CREATE_USERS', 'user'),
  UserManagementController.bulkCreateUsers
);

/**
 * PUT /api/users/bulk/update
 * Bulk update users
 */
router.put(
  '/bulk/update',
  requirePermission('update', 'user'),
  auditLog('BULK_UPDATE_USERS', 'user'),
  UserManagementController.bulkUpdateUsers
);

/**
 * POST /api/users/bulk/deactivate
 * Bulk deactivate users
 */
router.post(
  '/bulk/deactivate',
  requirePermission('delete', 'user'),
  auditLog('BULK_DEACTIVATE_USERS', 'user'),
  UserManagementController.bulkDeactivateUsers
);

// ─── Role Management ───────────────────────────────────────

/**
 * GET /api/users/:id/roles
 * Get user roles
 */
router.get(
  '/:id/roles',
  requirePermission('read', 'user'),
  UserManagementController.getUserRoles
);

/**
 * POST /api/users/:id/roles
 * Assign role to user
 */
router.post(
  '/:id/roles',
  requirePermission('update', 'user'),
  auditLog('ASSIGN_ROLE', 'user'),
  UserManagementController.assignRole
);

/**
 * DELETE /api/users/:id/roles/:roleId
 * Remove role from user
 */
router.delete(
  '/:id/roles/:roleId',
  requirePermission('update', 'user'),
  auditLog('REMOVE_ROLE', 'user'),
  UserManagementController.removeRole
);

export default router;
