/**
 * User Management Controller
 * Handles user CRUD operations with RBAC integration
 * Requirements: 5.1, 30.2
 */

import { Request, Response, NextFunction } from 'express';
import { UserManagementService } from '../services/user-management.service';
import { ResponseHandler } from '../utils/response';
import logger from '../utils/logger';

export class UserManagementController {
  /**
   * Get all users with pagination and filtering
   */
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const isActive = req.query.isActive as string;

      const result = await UserManagementService.getUsers({
        page,
        limit,
        search,
        role,
        isActive: isActive ? isActive === 'true' : undefined
      });

      ResponseHandler.success(res, result);
    } catch (error) {
      logger.error('Error fetching users', error);
      next(error);
    }
  }

  /**
   * Get single user by ID
   */
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const user = await UserManagementService.getUserById(id);
      if (!user) {
        ResponseHandler.notFound(res, 'User');
        return;
      }

      ResponseHandler.success(res, user);
    } catch (error) {
      logger.error('Error fetching user', error);
      next(error);
    }
  }

  /**
   * Create new user
   */
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, phone, businessName, businessType, plan } = req.body;

      // Validation
      if (!name || !email || !password) {
        ResponseHandler.validationError(res, ['Name, email, and password are required']);
        return;
      }

      // Check if user already exists
      const existingUser = await UserManagementService.getUserByEmail(email);
      if (existingUser) {
        ResponseHandler.error(res, 'User with this email already exists', 409);
        return;
      }

      const user = await UserManagementService.createUser({
        name,
        email,
        password,
        phone,
        businessName,
        businessType,
        plan
      });

      logger.info('User created successfully', { userId: user.id });
      ResponseHandler.success(res, user, 'User created successfully', 201);
    } catch (error) {
      logger.error('Error creating user', error);
      next(error);
    }
  }

  /**
   * Update user
   */
  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, phone, businessName, businessType, plan, isActive, preferences } = req.body;

      const user = await UserManagementService.updateUser(id, {
        name,
        phone,
        businessName,
        businessType,
        plan,
        isActive,
        preferences
      });

      if (!user) {
        ResponseHandler.notFound(res, 'User');
        return;
      }

      logger.info('User updated successfully', { userId: id });
      ResponseHandler.success(res, user, 'User updated successfully');
    } catch (error) {
      logger.error('Error updating user', error);
      next(error);
    }
  }

  /**
   * Delete user (soft delete by setting isActive to false)
   */
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await UserManagementService.deleteUser(id);
      if (!deleted) {
        ResponseHandler.notFound(res, 'User');
        return;
      }

      logger.info('User deleted successfully', { userId: id });
      ResponseHandler.success(res, null, 'User deleted successfully');
    } catch (error) {
      logger.error('Error deleting user', error);
      next(error);
    }
  }

  /**
   * Bulk create users
   */
  static async bulkCreateUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { users } = req.body;

      if (!Array.isArray(users) || users.length === 0) {
        ResponseHandler.validationError(res, ['Users array is required and must not be empty']);
        return;
      }

      const result = await UserManagementService.bulkCreateUsers(users);

      logger.info('Bulk user creation completed', { 
        created: result.created.length, 
        failed: result.failed.length 
      });

      ResponseHandler.success(res, result, 'Bulk user creation completed', 201);
    } catch (error) {
      logger.error('Error in bulk user creation', error);
      next(error);
    }
  }

  /**
   * Bulk update users
   */
  static async bulkUpdateUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        ResponseHandler.validationError(res, ['Updates array is required and must not be empty']);
        return;
      }

      const result = await UserManagementService.bulkUpdateUsers(updates);

      logger.info('Bulk user update completed', { 
        updated: result.updated.length, 
        failed: result.failed.length 
      });

      ResponseHandler.success(res, result, 'Bulk user update completed');
    } catch (error) {
      logger.error('Error in bulk user update', error);
      next(error);
    }
  }

  /**
   * Bulk deactivate users
   */
  static async bulkDeactivateUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        ResponseHandler.validationError(res, ['User IDs array is required and must not be empty']);
        return;
      }

      const result = await UserManagementService.bulkDeactivateUsers(userIds);

      logger.info('Bulk user deactivation completed', { count: result.count });
      ResponseHandler.success(res, result, 'Users deactivated successfully');
    } catch (error) {
      logger.error('Error in bulk user deactivation', error);
      next(error);
    }
  }

  /**
   * Assign role to user
   */
  static async assignRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      if (!roleId) {
        ResponseHandler.validationError(res, ['Role ID is required']);
        return;
      }

      const result = await UserManagementService.assignRoleToUser(id, roleId);

      logger.info('Role assigned to user', { userId: id, roleId });
      ResponseHandler.success(res, result, 'Role assigned successfully');
    } catch (error) {
      logger.error('Error assigning role to user', error);
      next(error);
    }
  }

  /**
   * Remove role from user
   */
  static async removeRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, roleId } = req.params;

      await UserManagementService.removeRoleFromUser(id, roleId);

      logger.info('Role removed from user', { userId: id, roleId });
      ResponseHandler.success(res, null, 'Role removed successfully');
    } catch (error) {
      logger.error('Error removing role from user', error);
      next(error);
    }
  }

  /**
   * Get user roles
   */
  static async getUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const roles = await UserManagementService.getUserRoles(id);

      ResponseHandler.success(res, roles);
    } catch (error) {
      logger.error('Error fetching user roles', error);
      next(error);
    }
  }

  /**
   * Search users
   */
  static async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string') {
        ResponseHandler.validationError(res, ['Search query is required']);
        return;
      }

      const users = await UserManagementService.searchUsers(query);

      ResponseHandler.success(res, users);
    } catch (error) {
      logger.error('Error searching users', error);
      next(error);
    }
  }
}
