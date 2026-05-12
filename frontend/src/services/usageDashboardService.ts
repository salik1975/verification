import { apiClient } from './api';

// Types for enhanced session data - updated to match backend response
export interface EnhancedSessionResponse {
  user_id: number;
  name: string;
  username: string;
  email: string;
  roles: string[];
  tenant_id?: number;
  tenant_name?: string;
  subscription_tier?: string;
  subscription_service?: string;
  max_reports?: number;
  reports_used?: number;
  subscription_start_date?: string;
  subscription_end_date?: string;
  days_remaining?: number;
  monthly_price?: number;
  subscription_status?: string;
}

export interface DashboardData {
  subscription_info: {
    tier: string;
    service: string;
    max_reports: number;
    used_reports: number;
    start_date: string;
    end_date: string;
    days_left: number;
    is_active: boolean;
    price: number;
  };
  usage_stats: {
    total_reports: number;
    document_reports: number;
    sms_reports: number;
    email_reports: number;
    weekly_average: number;
  };
  daily_usage: Array<{
    date: string;
    reports: number;
  }>;
  dashboard_metrics: {
    [key: string]: any;
  };
}

// API endpoints
const USAGE_DASHBOARD_ENDPOINTS = {
  SESSION: '/api/v1/auth/session',
  USER_DASHBOARD: '/api/v1/tenant-management/user-dashboard-data',
};

export const usageDashboardService = {
  /**
   * Get enhanced session data with tenant subscription info
   */
  async getEnhancedSession(token: string): Promise<EnhancedSessionResponse> {
    try {
      const response = await apiClient.get(USAGE_DASHBOARD_ENDPOINTS.SESSION, {
        params: { token }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching enhanced session:', error);
      throw error;
    }
  },

  /**
   * Get comprehensive dashboard data for the current user from backend
   */
  async getDashboardData(userId: number, daysBack: number = 30): Promise<DashboardData> {
    try {
      const response = await apiClient.get(USAGE_DASHBOARD_ENDPOINTS.USER_DASHBOARD, {
        params: { user_id: userId, days_back: daysBack }
      });

      const data = response.data;

      // Transform backend response to DashboardData format
      return {
        subscription_info: {
          tier: data.subscription_info.tier,
          service: data.subscription_info.service,
          max_reports: data.subscription_info.max_reports,
          used_reports: data.subscription_info.used_reports,
          start_date: data.subscription_info.start_date,
          end_date: data.subscription_info.end_date,
          days_left: data.subscription_info.days_left,
          is_active: data.subscription_info.is_active,
          price: data.subscription_info.price
        },
        usage_stats: {
          total_reports: data.usage_stats.total_reports,
          document_reports: data.usage_stats.document_reports,
          sms_reports: data.usage_stats.sms_reports,
          email_reports: data.usage_stats.email_reports,
          weekly_average: data.usage_stats.weekly_average
        },
        daily_usage: data.daily_usage || [],
        dashboard_metrics: data.dashboard_metrics || {}
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  /**
   * Transform session data to dashboard format
   * This creates dashboard data from the session response
   */
  transformSessionToDashboard(session: EnhancedSessionResponse): DashboardData {
    // Create subscription info from session data
    const subscription_info = {
      tier: session.subscription_tier || 'Silver',
      service: session.subscription_service || 'Complete Bundle',
      max_reports: session.max_reports || 300,
      used_reports: session.reports_used || 0,
      start_date: session.subscription_start_date || '2024-01-01',
      end_date: session.subscription_end_date || '2025-09-20',
      days_left: session.days_remaining || 18,
      is_active: session.subscription_status === 'active',
      price: session.monthly_price || 250
    };

    // Create usage stats (using mock data for now since we don't have detailed stats)
    const usage_stats = {
      total_reports: session.reports_used || 0,
      document_reports: Math.floor((session.reports_used || 0) * 0.7),
      sms_reports: Math.floor((session.reports_used || 0) * 0.2),
      email_reports: Math.floor((session.reports_used || 0) * 0.1),
      weekly_average: Math.floor((session.reports_used || 0) / 4)
    };

    // Daily usage data - empty since backend doesn't provide daily breakdown yet
    // This will show "Not enough data" in the charts
    const daily_usage: Array<{ date: string; reports: number }> = [];

    return {
      subscription_info,
      usage_stats,
      daily_usage,
      dashboard_metrics: {}
    };
  },

  /**
   * Transform dashboard data to match the existing UI structure
   * This ensures backward compatibility with the current UsageDashboard component
   */
  transformToLegacyFormat(dashboardData: DashboardData) {
    const { subscription_info, usage_stats, daily_usage, dashboard_metrics } = dashboardData;

    // Transform subscription info to match existing interface
    const subscriptionInfo = {
      tier: subscription_info.tier,
      service: subscription_info.service,
      maxReports: subscription_info.max_reports,
      usedReports: subscription_info.used_reports,
      startDate: subscription_info.start_date,
      endDate: subscription_info.end_date,
      daysLeft: subscription_info.days_left,
      isActive: subscription_info.is_active,
      price: subscription_info.price
    };

    // Transform usage stats to match existing interface
    const usageStatsLegacy = {
      totalReports: usage_stats.total_reports,
      documentReports: usage_stats.document_reports,
      smsReports: usage_stats.sms_reports,
      emailReports: usage_stats.email_reports,
      monthlyTrend: 0, // Will be calculated if we have historical data
      weeklyAverage: usage_stats.weekly_average
    };

    // Transform daily usage for charts (convert to existing format)
    const usageData = daily_usage.map(day => ({
      date: day.date,
      reports: day.reports,
      type: 'document' as const // Default type for compatibility
    }));

    return {
      subscriptionInfo,
      usageStats: usageStatsLegacy,
      usageData,
      dashboardMetrics: dashboard_metrics
    };
  },

  /**
   * Check if user has specific role for role-based access control
   */
  hasRole(session: EnhancedSessionResponse, role: string): boolean {
    return session.roles.includes(role);
  },

  /**
   * Check if user is product owner (highest access level)
   */
  isProductOwner(session: EnhancedSessionResponse): boolean {
    return this.hasRole(session, 'product_owner');
  },

  /**
   * Check if user is admin (limited access level)
   */
  isAdmin(session: EnhancedSessionResponse): boolean {
    return this.hasRole(session, 'admin');
  },

  /**
   * Check if user is operator (basic access level)
   */
  isOperator(session: EnhancedSessionResponse): boolean {
    return this.hasRole(session, 'operator');
  },

  /**
   * Get user's access level for dashboard features
   * New hierarchy: product_owner > admin > operator
   */
  getUserAccessLevel(session: EnhancedSessionResponse): 'product_owner' | 'admin' | 'operator' | 'none' {
    if (this.hasRole(session, 'product_owner')) return 'product_owner';
    if (this.hasRole(session, 'admin')) return 'admin';
    if (this.hasRole(session, 'operator')) return 'operator';
    return 'none';
  },

  /**
   * Check if user can access all pages (product_owner only)
   */
  canAccessAllPages(session: EnhancedSessionResponse): boolean {
    return this.isProductOwner(session);
  },

  /**
   * Check if user can access admin pages (product_owner and admin)
   */
  canAccessAdminPages(session: EnhancedSessionResponse): boolean {
    return this.isProductOwner(session) || this.isAdmin(session);
  },

  /**
   * Check if user can access specific admin pages (product_owner and admin)
   * Admin can only access: verification, manage-id, manage-configuration, usage-dashboard, verification-logs
   */
  canAccessSpecificAdminPages(session: EnhancedSessionResponse): boolean {
    return this.isProductOwner(session) || this.isAdmin(session);
  },

  /**
   * Check if user can access operator pages (all roles)
   */
  canAccessOperatorPages(session: EnhancedSessionResponse): boolean {
    return this.isProductOwner(session) || this.isAdmin(session) || this.isOperator(session);
  }
};
