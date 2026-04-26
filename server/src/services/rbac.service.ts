import prisma from '../config/prisma';
import { invalidateCache } from './cache.service';

/**
 * RBAC Management Service
 * Provides role and permission management functionality
 */

export interface CreateRoleInput {
  name: string;
  description?: string;
  parentId?: string;
  isSystem?: boolean;
}

export interface AssignPermissionInput {
  roleId: string;
  action: string;
  resource: string;
}

export class RBACService {
  /**
   * Create a new role
   */
  async createRole(data: CreateRoleInput) {
    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        isSystem: data.isSystem || false,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return role;
  }

  /**
   * Get role by ID with permissions
   */
  async getRoleById(roleId: string) {
    return prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        parent: true,
        children: true,
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get all roles
   */
  async getAllRoles() {
    return prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        parent: true,
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Update role
   */
  async updateRole(roleId: string, data: Partial<CreateRoleInput>) {
    const role = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Invalidate cache for all users with this role
    await this.invalidateRoleCache(roleId);

    return role;
  }

  /**
   * Delete role (only non-system roles)
   */
  async deleteRole(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (role?.isSystem) {
      throw new Error('Cannot delete system role');
    }

    await this.invalidateRoleCache(roleId);

    return prisma.role.delete({
      where: { id: roleId },
    });
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(data: AssignPermissionInput) {
    // Find or create permission
    let permission = await prisma.permission.findUnique({
      where: {
        action_resource: {
          action: data.action,
          resource: data.resource,
        },
      },
    });

    if (!permission) {
      permission = await prisma.permission.create({
        data: {
          action: data.action,
          resource: data.resource,
        },
      });
    }

    // Assign permission to role
    const rolePermission = await prisma.rolePermission.create({
      data: {
        roleId: data.roleId,
        permissionId: permission.id,
      },
      include: {
        permission: true,
        role: true,
      },
    });

    await this.invalidateRoleCache(data.roleId);

    return rolePermission;
  }

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(roleId: string, permissionId: string) {
    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    await this.invalidateRoleCache(roleId);
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string) {
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // Invalidate user permission cache
    await this.invalidateUserCache(userId);

    return userRole;
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string) {
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    await this.invalidateUserCache(userId);
  }

  /**
   * Get user roles with permissions
   */
  async getUserRoles(userId: string) {
    return prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
            parent: true,
          },
        },
      },
    });
  }

  /**
   * Get all permissions
   */
  async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Invalidate cache for all users with a specific role
   */
  private async invalidateRoleCache(roleId: string) {
    const userRoles = await prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    for (const ur of userRoles) {
      await this.invalidateUserCache(ur.userId);
    }
  }

  /**
   * Invalidate all permission cache entries for a user
   */
  private async invalidateUserCache(userId: string) {
    // Invalidate all RBAC cache entries for this user
    await invalidateCache(`rbac:${userId}:*`);
  }
}

export default new RBACService();
