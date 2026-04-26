/**
 * Base Entity Class
 * Provides common audit fields and methods for all entities
 */

export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface BaseEntityData extends AuditFields {
  id: string;
}

/**
 * Base Entity abstract class
 * All domain entities should extend this class
 */
export abstract class BaseEntity implements BaseEntityData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

  constructor(data: BaseEntityData) {
    this.id = data.id;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
  }

  /**
   * Update audit fields before save
   */
  updateAuditFields(userId?: string): void {
    this.updatedAt = new Date();
    if (userId) {
      this.updatedBy = userId;
    }
  }

  /**
   * Set creation audit fields
   */
  setCreationAuditFields(userId?: string): void {
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
    if (userId) {
      this.createdBy = userId;
      this.updatedBy = userId;
    }
  }

  /**
   * Convert entity to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
    };
  }
}

/**
 * Audit middleware for Prisma
 * Automatically sets audit fields on create and update operations
 */
export function createAuditMiddleware(userId?: string) {
  return {
    beforeCreate: (data: Record<string, unknown>) => {
      const now = new Date();
      return {
        ...data,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      };
    },
    beforeUpdate: (data: Record<string, unknown>) => {
      return {
        ...data,
        updatedAt: new Date(),
        updatedBy: userId,
      };
    },
  };
}

/**
 * Soft delete fields interface
 */
export interface SoftDeleteFields {
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;
}

/**
 * Base entity with soft delete support
 */
export abstract class SoftDeletableEntity extends BaseEntity implements SoftDeleteFields {
  deletedAt?: Date | null;
  deletedBy?: string | null;
  isDeleted: boolean;

  constructor(data: BaseEntityData & SoftDeleteFields) {
    super(data);
    this.deletedAt = data.deletedAt;
    this.deletedBy = data.deletedBy;
    this.isDeleted = data.isDeleted;
  }

  /**
   * Soft delete the entity
   */
  softDelete(userId?: string): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
    if (userId) {
      this.deletedBy = userId;
    }
    this.updateAuditFields(userId);
  }

  /**
   * Restore soft deleted entity
   */
  restore(userId?: string): void {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.updateAuditFields(userId);
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      deletedAt: this.deletedAt,
      deletedBy: this.deletedBy,
      isDeleted: this.isDeleted,
    };
  }
}
