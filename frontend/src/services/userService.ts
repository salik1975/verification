import { apiClient } from './api';
import { hashPassword } from '../utils/passwordUtils';

// Types for user management
export interface User {
  user_id: number;
  name: string;
  email: string;
  role: 'product_owner' | 'admin' | 'operator';
  last_login?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'operator'; // product_owner cannot be created from frontend
  tenant_id: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'operator'; // product_owner cannot be updated from frontend
  is_active?: boolean;
}

export interface UserResponse {
  status: string;
  message?: string;
  user?: User;
  users?: User[];
  total_users?: number;
}

// API endpoints
const USER_ENDPOINTS = {
  USERS: '/api/v1/users/',
  USER_BY_ID: (userId: number) => `/api/v1/users/${userId}`,
  TENANT_USERS: (tenantId: number) => `/api/v1/tenant-management/tenants/${tenantId}/users`,
};

// Service functions
export const userService = {
  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  async getUsers(skip: number = 0, limit: number = 100): Promise<User[]> {
    try {
      const response = await apiClient.get(USER_ENDPOINTS.USERS, {
        params: { skip, limit }
      });
      
      return response.data.map((user: any): User => ({
        user_id: user.id,
        name: user.full_name || user.email,
        email: user.email,
        role: user.is_superuser ? 'admin' : 'operator',
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getUserById(userId: number): Promise<User> {
    try {
      const response = await apiClient.get(USER_ENDPOINTS.USER_BY_ID(userId));
      const user = response.data;
      
      return {
        user_id: user.id,
        name: user.full_name || user.email,
        email: user.email,
        role: user.is_superuser ? 'admin' : 'operator',
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  async getTenantUsers(tenantId: number): Promise<User[]> {
    try {
      const response = await apiClient.get(USER_ENDPOINTS.TENANT_USERS(tenantId));
      
      const data: UserResponse = response.data;
      
      if (data.status !== 'success') {
        throw new Error(`Failed to fetch users for tenant ${tenantId}`);
      }

      return data.users || [];
    } catch (error) {
      console.error(`Error fetching tenant users for ${tenantId}:`, error);
      throw error;
    }
  },

  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // Send plain text password to backend for secure hashing
      const response = await apiClient.post(USER_ENDPOINTS.USERS, {
        email: userData.email,
        full_name: userData.name,
        password: userData.password,
        is_superuser: userData.role === 'admin',
        is_active: true,
        tenant_id: userData.tenant_id,
        role: userData.role,
      });
      
      const user = response.data;
      
      return {
        user_id: user.id,
        name: user.full_name || user.email,
        email: user.email,
        role: user.is_superuser ? 'admin' : 'operator',
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async updateUser(userId: number, userData: UpdateUserRequest): Promise<User> {
    try {
      const updateData: any = {};
      
      if (userData.name) updateData.full_name = userData.name;
      if (userData.email) updateData.email = userData.email;
      if (userData.password) {
        // Send plain text password to backend for secure hashing
        updateData.password = userData.password;
      }
      if (userData.role !== undefined) {
        updateData.is_superuser = userData.role === 'admin';
        updateData.role = userData.role;
      }
      if (userData.is_active !== undefined) updateData.is_active = userData.is_active;
      
      const response = await apiClient.put(USER_ENDPOINTS.USER_BY_ID(userId), updateData);
      
      const user = response.data;
      
      return {
        user_id: user.id,
        name: user.full_name || user.email,
        email: user.email,
        role: user.is_superuser ? 'admin' : 'operator',
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  },

  async deleteUser(userId: number): Promise<void> {
    try {
      await apiClient.delete(USER_ENDPOINTS.USER_BY_ID(userId));
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  transformToLegacyFormat(user: any): User {
    return {
      user_id: user.user_id || user.id,
      name: user.name || user.full_name || user.email,
      email: user.email,
      role: user.role || (user.is_superuser ? 'admin' : 'operator'),
      last_login: user.last_login,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  },

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
