/**
 * User Controller
 * Handles HTTP requests for user operations
 */

import { Request, Response, NextFunction } from 'express';
import UserService, { CreateUserDTO, UpdateUserDTO } from '../services/UserService';
import { ResponseHandler } from '../utils/response';
import logger from '../utils/logger';

interface CreateUserRequest extends Request {
  body: CreateUserDTO;
}

interface UpdateUserRequest extends Request {
  body: UpdateUserDTO;
}

class UserController {
  async createUser(req: CreateUserRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName) {
        ResponseHandler.validationError(res, [
          'Email, password, firstName, and lastName are required',
        ]);
        return;
      }

      // Check if user already exists
      const existingUser = await UserService.getUserByEmail(email);
      if (existingUser) {
        ResponseHandler.error(res, 'User with this email already exists', 409);
        return;
      }

      const user = await UserService.createUser({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      logger.info('User created successfully', { userId: user._id.toString() });
      ResponseHandler.success(res, user, 'User created successfully', 201);
    } catch (error) {
      logger.error('Error creating user', error);
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const user = await UserService.getUserById(id);
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

  async updateUser(req: UpdateUserRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, role, isActive } = req.body;

      const user = await UserService.updateUser(id, {
        firstName,
        lastName,
        role,
        isActive,
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

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await UserService.deleteUser(id);
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

  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const { users, total } = await UserService.getAllUsers(page, limit);

      ResponseHandler.success(res, {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching users', error);
      next(error);
    }
  }
}

export default new UserController();
