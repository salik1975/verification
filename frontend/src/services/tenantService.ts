import { apiClient } from './api';

// Types matching the backend response structure
export interface TenantUser {
  user_id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  last_login: string;
  is_active: boolean;
}

export interface Tenant {
  tenant_id: number;
  name: string;
  subscription_tier: string;
  subscription_service: string;
  onboarding_date: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  reports_used: number;
  max_reports: number;
  is_active: boolean;
  admin_users: number;
  operator_users: number;
  total_users: number;
  monthly_price: number;
  days_left: number;
  status: 'active' | 'expired' | 'expiring_soon';
  users: TenantUser[];
}

export interface TenantSummary {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  monthly_revenue: number;
  total_reports_used: number;
}

export interface TenantsResponse {
  status: string;
  tenants: Tenant[];
  summary: TenantSummary;
}

export interface TenantUsersResponse {
  status: string;
  tenant_id: number;
  tenant_name: string;
  users: TenantUser[];
  total_users: number;
}

export interface CreateTenantRequest {
  name: string;
  subscription_tier_id?: number;
  subscription_service_id?: number;
}

export interface CreateTenantResponse {
  status: string;
  message: string;
  tenant_id: number;
}

// Tenant Onboarding Types
export interface TenantOnboardingRequest {
  tenant_name: string;
  admin_name: string;
  admin_email: string;
  admin_username: string;
  admin_password: string;
  subscription_tier_id: number;
  subscription_service_id: number;
  subscription_start_date: string;
  company_website?: string;
  phone_number?: string;
  address?: string;
}

export interface TenantOnboardingResponse {
  status: string;
  message: string;
  tenant_id: number;
  user_id: number;
  tenant_name: string;
  admin_username: string;
  admin_email: string;
  subscription_tier: string;
  subscription_service: string;
  monthly_price: number;
  max_reports: number;
  subscription_end_date: string;
}

export interface TenantOnboardingValidationError {
  field: string;
  message: string;
}

export interface TenantOnboardingValidationResponse {
  status: string;
  errors: TenantOnboardingValidationError[];
}

// API endpoints
const TENANT_ENDPOINTS = {
  TENANTS: '/api/v1/tenant-management/tenants', // Consolidated endpoint
  TENANT_USERS: (tenantId: number) => `/api/v1/tenant-management/tenants/${tenantId}/users`,
  CREATE_TENANT: '/api/v1/tenant-management/tenants',
  ONBOARD_TENANT: '/api/v1/tenant-management/onboard',
  VALIDATE_ONBOARDING: '/api/v1/tenant-management/onboard/validate',
};

// Transform backend data to match frontend interface
const transformTenantData = (backendTenant: any): Tenant => {
  return {
    tenant_id: backendTenant.tenant_id,
    name: backendTenant.name,
    subscription_tier: backendTenant.subscription_tier,
    subscription_service: backendTenant.subscription_service,
    onboarding_date: backendTenant.onboarding_date,
    subscription_start_date: backendTenant.subscription_start_date,
    subscription_end_date: backendTenant.subscription_end_date,
    reports_used: backendTenant.reports_used,
    max_reports: backendTenant.max_reports,
    is_active: backendTenant.is_active,
    admin_users: backendTenant.admin_users,
    operator_users: backendTenant.operator_users,
    total_users: backendTenant.total_users,
    monthly_price: backendTenant.monthly_price,
    days_left: backendTenant.days_left,
    status: backendTenant.status,
    users: backendTenant.users.map((user: any): TenantUser => ({
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      last_login: user.last_login,
      is_active: user.is_active,
    })),
  };
};

// Service functions
export const tenantService = {
  // ============================================================================
  // TENANT MANAGEMENT
  // ============================================================================
  
  async getTenants(
    skip: number = 0,
    limit: number = 100,
    includeUsers: boolean = true,
    activeOnly: boolean = false
  ): Promise<{ tenants: Tenant[]; summary: TenantSummary }> {
    try {
      // Use the consolidated endpoint with detailed=true for full functionality
      const response = await apiClient.get(TENANT_ENDPOINTS.TENANTS, {
        params: {
          skip,
          limit,
          include_users: includeUsers,
          active_only: activeOnly,
          detailed: true, // Get detailed tenant information
        },
      });

      const data: TenantsResponse = response.data;
      
      if (data.status !== 'success') {
        throw new Error('Failed to fetch tenants from backend');
      }

      return {
        tenants: data.tenants.map(transformTenantData),
        summary: data.summary,
      };
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw error;
    }
  },

  async getTenantUsers(tenantId: number): Promise<TenantUser[]> {
    try {
      const response = await apiClient.get(TENANT_ENDPOINTS.TENANT_USERS(tenantId));
      
      const data: TenantUsersResponse = response.data;
      
      if (data.status !== 'success') {
        throw new Error(`Failed to fetch users for tenant ${tenantId}`);
      }

      return data.users.map((user: any): TenantUser => ({
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        last_login: user.last_login,
        is_active: user.is_active,
      }));
    } catch (error) {
      console.error(`Error fetching tenant users for ${tenantId}:`, error);
      throw error;
    }
  },

  async createTenant(tenantData: CreateTenantRequest): Promise<CreateTenantResponse> {
    try {
      const response = await apiClient.post(TENANT_ENDPOINTS.CREATE_TENANT, tenantData);
      
      const data: CreateTenantResponse = response.data;
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to create tenant');
      }

      return data;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  },

  // ============================================================================
  // TENANT ONBOARDING
  // ============================================================================

  async validateTenantOnboarding(onboardingData: TenantOnboardingRequest): Promise<TenantOnboardingValidationResponse> {
    try {
      const response = await apiClient.post(TENANT_ENDPOINTS.VALIDATE_ONBOARDING, onboardingData);
      
      const data: TenantOnboardingValidationResponse = response.data;
      
      return data;
    } catch (error: any) {
      console.error('Error validating tenant onboarding:', error);
      
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        return error.response.data;
      }
      
      // Handle other errors
      throw error;
    }
  },

  async onboardTenant(onboardingData: TenantOnboardingRequest): Promise<TenantOnboardingResponse> {
    try {
      const response = await apiClient.post(TENANT_ENDPOINTS.ONBOARD_TENANT, onboardingData);
      
      const data: TenantOnboardingResponse = response.data;
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'Failed to onboard tenant');
      }

      return data;
    } catch (error: any) {
      console.error('Error onboarding tenant:', error);
      
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        throw new Error('Validation failed: ' + error.response.data.errors.map((e: any) => e.message).join(', '));
      }
      
      // Handle other errors
      throw error;
    }
  },

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  // Transform frontend Tenant interface to backend-compatible format for legacy compatibility
  transformToLegacyFormat(tenant: Tenant): any {
    return {
      id: tenant.tenant_id,
      name: tenant.name,
      subscriptionTier: tenant.subscription_tier,
      subscriptionService: tenant.subscription_service,
      onboardingDate: tenant.onboarding_date?.split('T')[0] || '', // Convert ISO to date string
      subscriptionStartDate: tenant.subscription_start_date?.split('T')[0] || '',
      subscriptionEndDate: tenant.subscription_end_date?.split('T')[0] || '',
      reportsUsed: tenant.reports_used,
      maxReports: tenant.max_reports,
      isActive: tenant.is_active,
      adminUsers: tenant.admin_users,
      operatorUsers: tenant.operator_users,
      totalUsers: tenant.total_users,
      monthlyPrice: tenant.monthly_price,
      daysLeft: tenant.days_left,
      status: tenant.status,
      users: tenant.users.map(user => ({
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.last_login?.split('T')[0] || '', // Convert ISO to date string
        isActive: user.is_active,
      })),
    };
  },

  // Calculate usage percentage
  getUsagePercentage(used: number, max: number): number {
    return Math.min((used / max) * 100, 100);
  },

  // Get status badge info
  getStatusInfo(daysLeft: number) {
    if (daysLeft < 0) {
      return { status: 'expired', variant: 'destructive', text: 'Expired' };
    } else if (daysLeft <= 5) {
      return { status: 'expiring_soon', variant: 'warning', text: 'Expiring Soon' };
    } else {
      return { status: 'active', variant: 'default', text: 'Active' };
    }
  },
};

export default tenantService;
