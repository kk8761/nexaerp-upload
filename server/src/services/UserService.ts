/**
 * User Service
 * Business logic for user operations
 */

import User, { IUser } from '../models/User';
import bcrypt from 'bcryptjs';

export interface CreateUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'manager' | 'user';
}

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'manager' | 'user';
  isActive?: boolean;
}

class UserService {
  async createUser(data: CreateUserDTO): Promise<IUser> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = new User({
      ...data,
      password: hashedPassword,
    });

    return await user.save();
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId).select('-password');
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    const user = await User.findOne({ email }).exec();
    return user as IUser | null;
  }

  async updateUser(userId: string, data: UpdateUserDTO): Promise<IUser | null> {
    const user = await User.findByIdAndUpdate(userId, data, {
      new: true,
      runValidators: true,
    }).select('-password');

    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(userId);
    return result !== null;
  }

  async getAllUsers(page = 1, limit = 10): Promise<{ users: IUser[]; total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find().select('-password').skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    return { users, total };
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

export default new UserService();
