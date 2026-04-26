/**
 * User Management Service
 * Business logic for user CRUD operations with RBAC integration
 * Requirements: 5.1, 30.2
 */

import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import { getOrSetCache, invalidateCache, invalidateCachePattern, CACHE_TTL, CACHE_PREFIX } from './cache.service';

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
  plan?: string;
}

export interface UpdateUserDTO {
  name?: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
  plan?: string;
  isActive?: boolean;
  preferences?: any;
}

export interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

export class UserManagementService {
  /**
   * Get users with pagination and filtering
   */
  static async getUsers(filters: UserFilters) {
    const { page, limit, search, role, isActive } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search filter (name or email)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Legacy role filter
    if (role) {
      where.role = role;
    }

    // Active status filter
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const cacheKey = `${CACHE_PREFIX.USER}list:${JSON.stringify({ page, limit, search, role, isActive })}`;

    return getOrSetCache(
      cacheKey,
      async () => {
        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            skip,
            take: limit,
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              businessName: true,
              businessType: true,
              role: true,
              plan: true,
              isActive: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
              userRoles: {
                include: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                      description: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }),
          prisma.user.count({ where })
        ]);

        return {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        };
      },
      CACHE_TTL.SHORT
    );
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    const cacheKey = `${CACHE_PREFIX.USER}${userId}`;

    return getOrSetCache(
      cacheKey,
      async () => {
        return await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            businessName: true,
            businessType: true,
            role: true,
            plan: true,
            isActive: true,
            lastLogin: true,
            preferences: true,
            createdAt: true,
            updatedAt: true,
            userRoles: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    description: true
                  }
                }
              }
            },
            sessions: {
              where: {
                expiresAt: {
                  gt: new Date()
                }
              },
              select: {
                id: true,
                sessionToken: true,
                ipAddress: true,
                userAgent: true,
                lastActivity: true,
                createdAt: true
              },
              orderBy: { lastActivity: 'desc' }
            }
          }
        });
      },
      CACHE_TTL.MEDIUM
    );
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });
  }

  /**
   * Create new user
   */
  static async createUser(data: CreateUserDTO) {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone,
        businessName: data.businessName,
        businessType: data.businessType || 'grocery',
        plan: data.plan || 'free'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        businessName: true,
        businessType: true,
        role: true,
        plan: true,
        isActive: true,
        createdAt: true
      }
    });

    // Invalidate user list cache
    await invalidateCachePattern(`${CACHE_PREFIX.USER}list:*`);

    return user;
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, data: UpdateUserDTO) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: data.phone,
        businessName: data.businessName,
        businessType: data.businessType,
        plan: data.plan,
        isActive: data.isActive,
        preferences: data.preferences
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        businessName: true,
        businessType: true,
        role: true,
        plan: true,
        isActive: true,
        preferences: true,
        updatedAt: true
      }
    });

    // Invalidate caches
    await invalidateCache(`${CACHE_PREFIX.USER}${userId}`);
    await invalidateCachePattern(`${CACHE_PREFIX.USER}list:*`);
    await invalidateCachePattern(`rbac:${userId}:*`);

    return user;
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
      });

      // Invalidate caches
      await invalidateCache(`${CACHE_PREFIX.USER}${userId}`);
      await invalidateCachePattern(`${CACHE_PREFIX.USER}list:*`);
      await invalidateCachePattern(`rbac:${userId}:*`);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Bulk create users
   */
  static async bulkCreateUsers(users: CreateUserDTO[]) {
    const created: any[] = [];
    const failed: any[] = [];

    for (const userData of users) {
      try {
        // Check if user already exists
        const existing = await this.getUserByEmail(userData.email);
        if (existing) {
          failed.push({
            email: userData.email,
            reason: 'User already exists'
          });
          continue;
        }

        const user = await this.createUser(userData);
        created.push(user);
      } catch (error: any) {
        failed.push({
          email: userData.email,
          reason: error.message || 'Unknown error'
        });
      }
    }

    return { created, failed };
  }

  /**
   * Bulk update users
   */
  static async bulkUpdateUsers(updates: Array<{ id: string } & UpdateUserDTO>) {
    const updated: any[] = [];
    const failed: any[] = [];

    for (const updateData of updates) {
      try {
        const { id, ...data } = updateData;
        const user = await this.updateUser(id, data);
        updated.push(user);
      } catch (error: any) {
        failed.push({
          id: updateData.id,
          reason: error.message || 'Unknown error'
        });
      }
    }

    return { updated, failed };
  }

  /**
   * Bulk deactivate users
   */
  static async bulkDeactivateUsers(userIds: string[]) {
    const result = await prisma.user.updateMany({
      where: {
        id: {
          in: userIds
        }
      },
      data: {
        isActive: false
      }
    });

    // Invalidate caches
    for (const userId of userIds) {
      await invalidateCache(`${CACHE_PREFIX.USER}${userId}`);
      await invalidateCachePattern(`rbac:${userId}:*`);
    }
    await invalidateCachePattern(`${CACHE_PREFIX.USER}list:*`);

    return result;
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(userId: string, roleId: string) {
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    // Invalidate caches
    await invalidateCache(`${CACHE_PREFIX.USER}${userId}`);
    await invalidateCachePattern(`rbac:${userId}:*`);

    return userRole;
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(userId: string, roleId: string) {
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId
        }
      }
    });

    // Invalidate caches
    await invalidateCache(`${CACHE_PREFIX.USER}${userId}`);
    await invalidateCachePattern(`rbac:${userId}:*`);
  }

  /**
   * Get user roles
   */
  static async getUserRoles(userId: string) {
    return await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: {
              include: {
                permission: {
                  select: {
                    id: true,
                    action: true,
                    resource: true,
                    description: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Search users by name or email
   */
  static async searchUsers(query: string) {
    return await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ],
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        businessName: true
      },
      take: 10
    });
  }
}
