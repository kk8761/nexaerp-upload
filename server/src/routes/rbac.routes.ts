import express from 'express';
import rbacService from '../services/rbac.service';
import { requirePermission } from '../middleware/rbac.middleware';
import { auditLog } from '../middleware/audit.middleware';

const router = express.Router();

/**
 * Role Management Routes
 */

// Get all roles
router.get('/roles', requirePermission('read', 'role'), async (_req, res) => {
  try {
    const roles = await rbacService.getAllRoles();
    res.json({ success: true, data: roles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get role by ID
router.get('/roles/:id', requirePermission('read', 'role'), async (req, res): Promise<void> => {
  try {
    const role = await rbacService.getRoleById(req.params.id);
    if (!role) {
      res.status(404).json({ success: false, message: 'Role not found' });
      return;
    }
    res.json({ success: true, data: role });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create role
router.post('/roles', 
  requirePermission('create', 'role'),
  auditLog('CREATE', 'role'),
  async (req, res): Promise<void> => {
  try {
    const { name, description, parentId, isSystem } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: 'Role name is required' });
      return;
    }

    const role = await rbacService.createRole({
      name,
      description,
      parentId,
      isSystem,
    });

    res.status(201).json({ success: true, data: role });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update role
router.put('/roles/:id', 
  requirePermission('update', 'role'),
  auditLog('UPDATE', 'role'),
  async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    const role = await rbacService.updateRole(req.params.id, {
      name,
      description,
      parentId,
    });

    res.json({ success: true, data: role });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete role
router.delete('/roles/:id', 
  requirePermission('delete', 'role'),
  auditLog('DELETE', 'role'),
  async (req, res) => {
  try {
    // Fetch role before deletion for audit log
    const role = await rbacService.getRoleById(req.params.id);
    
    await rbacService.deleteRole(req.params.id);
    
    res.json({ success: true, message: 'Role deleted successfully', data: role });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Permission Management Routes
 */

// Get all permissions
router.get('/permissions', requirePermission('read', 'permission'), async (_req, res) => {
  try {
    const permissions = await rbacService.getAllPermissions();
    res.json({ success: true, data: permissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign permission to role
router.post('/roles/:roleId/permissions', 
  requirePermission('update', 'role'),
  auditLog('CREATE', 'role_permission'),
  async (req, res): Promise<void> => {
  try {
    const { action, resource } = req.body;

    if (!action || !resource) {
      res.status(400).json({ 
        success: false, 
        message: 'Action and resource are required' 
      });
      return;
    }

    const rolePermission = await rbacService.assignPermissionToRole({
      roleId: req.params.roleId,
      action,
      resource,
    });

    res.status(201).json({ success: true, data: rolePermission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove permission from role
router.delete(
  '/roles/:roleId/permissions/:permissionId',
  requirePermission('update', 'role'),
  auditLog('DELETE', 'role_permission'),
  async (req, res) => {
    try {
      await rbacService.removePermissionFromRole(
        req.params.roleId,
        req.params.permissionId
      );
      res.json({ success: true, message: 'Permission removed from role' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * User Role Assignment Routes
 */

// Get user roles
router.get('/users/:userId/roles', requirePermission('read', 'user'), async (req, res) => {
  try {
    const roles = await rbacService.getUserRoles(req.params.userId);
    res.json({ success: true, data: roles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign role to user
router.post('/users/:userId/roles', 
  requirePermission('update', 'user'),
  auditLog('CREATE', 'user_role'),
  async (req, res): Promise<void> => {
  try {
    const { roleId } = req.body;

    if (!roleId) {
      res.status(400).json({ success: false, message: 'Role ID is required' });
      return;
    }

    const userRole = await rbacService.assignRoleToUser(req.params.userId, roleId);
    res.status(201).json({ success: true, data: userRole });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove role from user
router.delete(
  '/users/:userId/roles/:roleId',
  requirePermission('update', 'user'),
  auditLog('DELETE', 'user_role'),
  async (req, res) => {
    try {
      await rbacService.removeRoleFromUser(req.params.userId, req.params.roleId);
      res.json({ success: true, message: 'Role removed from user' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
