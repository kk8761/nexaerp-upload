/**
 * User Management Tests
 * Tests for user CRUD operations with RBAC integration
 * Requirements: 5.1, 30.2
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../server';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';

describe('User Management Module', () => {
  let authToken: string;
  let testUserId: string;
  let testRoleId: string;

  beforeAll(async () => {
    // Create a test admin user for authentication
    const hashedPassword = await bcrypt.hash('testpassword', 12);
    const adminUser = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'testadmin@example.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      }
    });

    // Create a test role
    const testRole = await prisma.role.create({
      data: {
        name: 'Test Role',
        description: 'Test role for user management tests',
        isSystem: false
      }
    });
    testRoleId = testRole.id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testadmin@example.com',
        password: 'testpassword'
      });

    authToken = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
    await prisma.role.deleteMany({ where: { name: 'Test Role' } });
    await prisma.$disconnect();
  });

  describe('GET /api/users', () => {
    it('should return paginated list of users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    it('should filter users by search query', async () => {
      const response = await request(app)
        .get('/api/users?search=admin')
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter users by active status', async () => {
      const response = await request(app)
        .get('/api/users?isActive=true')
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Cookie', authToken)
        .send({
          name: 'Test User',
          email: 'testuser@example.com',
          password: 'password123',
          phone: '1234567890',
          businessName: 'Test Business',
          businessType: 'retail',
          plan: 'basic'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe('testuser@example.com');
      
      testUserId = response.body.data.id;
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/users')
        .set('Cookie', authToken)
        .send({
          name: 'Duplicate User',
          email: 'testuser@example.com',
          password: 'password123'
        })
        .expect(409);
    });

    it('should reject missing required fields', async () => {
      await request(app)
        .post('/api/users')
        .set('Cookie', authToken)
        .send({
          email: 'incomplete@example.com'
        })
        .expect(400);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user details', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data).toHaveProperty('userRoles');
      expect(response.body.data).toHaveProperty('sessions');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Cookie', authToken)
        .expect(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user details', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Cookie', authToken)
        .send({
          name: 'Updated Test User',
          phone: '9876543210',
          plan: 'pro'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test User');
      expect(response.body.data.phone).toBe('9876543210');
      expect(response.body.data.plan).toBe('pro');
    });

    it('should deactivate user', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Cookie', authToken)
        .send({
          isActive: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });
  });

  describe('POST /api/users/:id/roles', () => {
    it('should assign role to user', async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/roles`)
        .set('Cookie', authToken)
        .send({
          roleId: testRoleId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data.role.id).toBe(testRoleId);
    });
  });

  describe('GET /api/users/:id/roles', () => {
    it('should return user roles', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/roles`)
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/users/:id/roles/:roleId', () => {
    it('should remove role from user', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUserId}/roles/${testRoleId}`)
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users by name or email', async () => {
      const response = await request(app)
        .get('/api/users/search?query=test')
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject empty search query', async () => {
      await request(app)
        .get('/api/users/search')
        .set('Cookie', authToken)
        .expect(400);
    });
  });

  describe('POST /api/users/bulk/create', () => {
    it('should bulk create users', async () => {
      const response = await request(app)
        .post('/api/users/bulk/create')
        .set('Cookie', authToken)
        .send({
          users: [
            {
              name: 'Bulk User 1',
              email: 'bulkuser1@example.com',
              password: 'password123'
            },
            {
              name: 'Bulk User 2',
              email: 'bulkuser2@example.com',
              password: 'password123'
            }
          ]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created.length).toBe(2);
      expect(response.body.data.failed.length).toBe(0);
    });
  });

  describe('POST /api/users/bulk/deactivate', () => {
    it('should bulk deactivate users', async () => {
      // Get bulk created users
      const users = await prisma.user.findMany({
        where: {
          email: {
            in: ['bulkuser1@example.com', 'bulkuser2@example.com']
          }
        }
      });

      const userIds = users.map(u => u.id);

      const response = await request(app)
        .post('/api/users/bulk/deactivate')
        .set('Cookie', authToken)
        .send({
          userIds
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should soft delete user', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user is deactivated
      const user = await prisma.user.findUnique({
        where: { id: testUserId }
      });
      expect(user?.isActive).toBe(false);
    });
  });
});
