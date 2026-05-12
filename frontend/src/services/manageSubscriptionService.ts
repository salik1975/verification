import { apiClient } from './api';

// Types matching the backend schemas
export interface SubscriptionTier {
  tier_id: number;
  tier_name: string;
  max_reports: number;
  is_active: boolean;
  created_on: string;
}

export interface SubscriptionService {
  service_id: number;
  service_name: string;
  service_description: string;
  is_active: boolean;
  created_on: string;
  sub_features?: SubFeature[]; // New field for sub-features
}

export interface SubscriptionPricing {
  pricing_id: number;
  tier_id: number;
  service_id: number;
  price_usd: number;
  is_active: boolean;
  created_on: string;
}

export interface PricingPlanWithNames extends SubscriptionPricing {
  tier_name: string;
  service_name: string;
}

// Feature management interfaces
export interface SubFeature {
  sub_feature_key: string;
  sub_feature_description: string;
  main_feature_key: string;
}

export interface MainFeature {
  main_feature_key: string;
  sub_features: SubFeature[];
}

// Create/Update schemas
export interface SubscriptionTierCreate {
  tier_name: string;
  max_reports: number;
  is_active?: boolean;
}

export interface SubscriptionTierUpdate {
  tier_name?: string;
  max_reports?: number;
  is_active?: boolean;
}

export interface SubscriptionServiceCreate {
  service_name: string;
  service_description: string;
  is_active?: boolean;
  sub_feature_keys?: string[]; // New field for selected sub-features
}

export interface SubscriptionServiceUpdate {
  service_name?: string;
  service_description?: string;
  is_active?: boolean;
  sub_feature_keys?: string[]; // New field for selected sub-features
}

export interface SubscriptionPricingCreate {
  tier_id: number;
  service_id: number;
  price_usd: number;
  is_active?: boolean;
}

export interface SubscriptionPricingUpdate {
  tier_id?: number;
  service_id?: number;
  price_usd?: number;
  is_active?: boolean;
}

// Usage Statistics Interfaces
export interface UsageStatistics {
  total_reports: number;
  document_reports: number;
  sms_reports: number;
  email_reports: number;
  period_days: number;
  weekly_average: number;
}

export interface TierUsageStatistics {
  tier_id: number;
  tier_name: string;
  total_reports: number;
  active_tenants: number;
  this_month_reports: number;
}

export interface ServiceUsageStatistics {
  service_id: number;
  service_name: string;
  total_reports: number;
  active_tenants: number;
  this_month_reports: number;
}

export interface UsageStatisticsResponse {
  status: string;
  overall_stats: UsageStatistics;
  period: {
    start_date: string;
    end_date: string;
    days_back: number;
  };
}

export interface TierUsageResponse {
  status: string;
  tier_statistics: TierUsageStatistics[];
  period: {
    start_date: string;
    end_date: string;
    days_back: number;
  };
}

export interface ServiceUsageResponse {
  status: string;
  service_statistics: ServiceUsageStatistics[];
  period: {
    start_date: string;
    end_date: string;
    days_back: number;
  };
}

// API endpoints
const MANAGE_SUBSCRIPTION_ENDPOINTS = {
  // Tiers
  TIERS: '/api/v1/subscription-management/tiers',
  TIER_BY_ID: (id: number) => `/api/v1/subscription-management/tiers/${id}`,
  
  // Services
  SERVICES: '/api/v1/subscription-management/services',
  SERVICE_BY_ID: (id: number) => `/api/v1/subscription-management/services/${id}`,
  
  // Pricing
  PRICING: '/api/v1/subscription-management/pricing',
  PRICING_BY_ID: (id: number) => `/api/v1/subscription-management/pricing/${id}`,
  
  // Usage Statistics
  USAGE_STATISTICS: '/api/v1/subscription-management/usage/statistics',
  TIER_USAGE: '/api/v1/subscription-management/usage/tiers',
  SERVICE_USAGE: '/api/v1/subscription-management/usage/services',
  
  // Features
  FEATURES: '/api/v1/subscription-management/features',
  MAIN_FEATURES: '/api/v1/subscription-management/features/main',
  SUB_FEATURES: (mainFeatureKey: string) => `/api/v1/subscription-management/features/sub/${mainFeatureKey}`,
  
  // Plans
  PLANS: '/api/v1/subscription-management/plans',
  PRICING_FOR_PLAN: (tierId: number, serviceId: number) => `/api/v1/subscription-management/pricing/${tierId}/${serviceId}`,
};

// Service functions
export const manageSubscriptionService = {
  // ============================================================================
  // SUBSCRIPTION TIERS
  // ============================================================================
  
  async getSubscriptionTiers(): Promise<SubscriptionTier[]> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.TIERS);
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
      throw error;
    }
  },

  async getSubscriptionTier(tierId: number): Promise<SubscriptionTier> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.TIER_BY_ID(tierId));
      return response.data;
    } catch (error) {
      console.error(`Error fetching subscription tier ${tierId}:`, error);
      throw error;
    }
  },

  async createSubscriptionTier(tier: SubscriptionTierCreate): Promise<SubscriptionTier> {
    try {
      const response = await apiClient.post(MANAGE_SUBSCRIPTION_ENDPOINTS.TIERS, tier);
      return response.data;
    } catch (error) {
      console.error('Error creating subscription tier:', error);
      throw error;
    }
  },

  async updateSubscriptionTier(tierId: number, tier: SubscriptionTierUpdate): Promise<SubscriptionTier> {
    try {
      const response = await apiClient.put(MANAGE_SUBSCRIPTION_ENDPOINTS.TIER_BY_ID(tierId), tier);
      return response.data;
    } catch (error) {
      console.error(`Error updating subscription tier ${tierId}:`, error);
      throw error;
    }
  },

  async deleteSubscriptionTier(tierId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(MANAGE_SUBSCRIPTION_ENDPOINTS.TIER_BY_ID(tierId));
      return response.data;
    } catch (error) {
      console.error(`Error deleting subscription tier ${tierId}:`, error);
      throw error;
    }
  },

  // ============================================================================
  // SUBSCRIPTION SERVICES
  // ============================================================================
  
  async getSubscriptionServices(): Promise<SubscriptionService[]> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.SERVICES);
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription services:', error);
      throw error;
    }
  },

  async getSubscriptionService(serviceId: number): Promise<SubscriptionService> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.SERVICE_BY_ID(serviceId));
      return response.data;
    } catch (error) {
      console.error(`Error fetching subscription service ${serviceId}:`, error);
      throw error;
    }
  },

  async createSubscriptionService(service: SubscriptionServiceCreate): Promise<SubscriptionService> {
    try {
      const response = await apiClient.post(MANAGE_SUBSCRIPTION_ENDPOINTS.SERVICES, service);
      return response.data;
    } catch (error) {
      console.error('Error creating subscription service:', error);
      throw error;
    }
  },

  async updateSubscriptionService(serviceId: number, service: SubscriptionServiceUpdate): Promise<SubscriptionService> {
    try {
      const response = await apiClient.put(MANAGE_SUBSCRIPTION_ENDPOINTS.SERVICE_BY_ID(serviceId), service);
      return response.data;
    } catch (error) {
      console.error(`Error updating subscription service ${serviceId}:`, error);
      throw error;
    }
  },

  async deleteSubscriptionService(serviceId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(MANAGE_SUBSCRIPTION_ENDPOINTS.SERVICE_BY_ID(serviceId));
      return response.data;
    } catch (error) {
      console.error(`Error deleting subscription service ${serviceId}:`, error);
      throw error;
    }
  },

  // ============================================================================
  // SUBSCRIPTION PRICING
  // ============================================================================
  
  async getSubscriptionPricing(): Promise<SubscriptionPricing[]> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.PRICING);
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription pricing:', error);
      throw error;
    }
  },

  async getSubscriptionPricingById(pricingId: number): Promise<SubscriptionPricing> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.PRICING_BY_ID(pricingId));
      return response.data;
    } catch (error) {
      console.error(`Error fetching subscription pricing ${pricingId}:`, error);
      throw error;
    }
  },

  async createSubscriptionPricing(pricing: SubscriptionPricingCreate): Promise<SubscriptionPricing> {
    try {
      const response = await apiClient.post(MANAGE_SUBSCRIPTION_ENDPOINTS.PRICING, pricing);
      return response.data;
    } catch (error) {
      console.error('Error creating subscription pricing:', error);
      throw error;
    }
  },

  async updateSubscriptionPricing(pricingId: number, pricing: SubscriptionPricingUpdate): Promise<SubscriptionPricing> {
    try {
      const response = await apiClient.put(MANAGE_SUBSCRIPTION_ENDPOINTS.PRICING_BY_ID(pricingId), pricing);
      return response.data;
    } catch (error) {
      console.error(`Error updating subscription pricing ${pricingId}:`, error);
      throw error;
    }
  },

  async deleteSubscriptionPricing(pricingId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(MANAGE_SUBSCRIPTION_ENDPOINTS.PRICING_BY_ID(pricingId));
      return response.data;
    } catch (error) {
      console.error(`Error deleting subscription pricing ${pricingId}:`, error);
      throw error;
    }
  },

  // ============================================================================
  // FEATURE MANAGEMENT
  // ============================================================================
  
  async getMainFeatures(): Promise<MainFeature[]> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.MAIN_FEATURES);
      return response.data;
    } catch (error) {
      console.error('Error fetching main features:', error);
      throw error;
    }
  },

  async getSubFeatures(mainFeatureKey: string): Promise<SubFeature[]> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.SUB_FEATURES(mainFeatureKey));
      return response.data;
    } catch (error) {
      console.error(`Error fetching sub features for ${mainFeatureKey}:`, error);
      throw error;
    }
  },

  async getAllFeatures(): Promise<MainFeature[]> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.FEATURES);
      return response.data;
    } catch (error) {
      console.error('Error fetching all features:', error);
      throw error;
    }
  },

  // ============================================================================
  // USAGE STATISTICS
  // ============================================================================
  
  async getOverallUsageStatistics(daysBack: number = 30): Promise<UsageStatisticsResponse> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.USAGE_STATISTICS, {
        params: { days_back: daysBack }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching overall usage statistics:', error);
      throw error;
    }
  },

  async getTierUsageStatistics(daysBack: number = 30): Promise<TierUsageResponse> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.TIER_USAGE, {
        params: { days_back: daysBack }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching tier usage statistics:', error);
      throw error;
    }
  },

  async getServiceUsageStatistics(daysBack: number = 30): Promise<ServiceUsageResponse> {
    try {
      const response = await apiClient.get(MANAGE_SUBSCRIPTION_ENDPOINTS.SERVICE_USAGE, {
        params: { days_back: daysBack }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching service usage statistics:', error);
      throw error;
    }
  },

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  async getPricingWithNames(): Promise<PricingPlanWithNames[]> {
    try {
      const [pricing, tiers, services] = await Promise.all([
        this.getSubscriptionPricing(),
        this.getSubscriptionTiers(),
        this.getSubscriptionServices()
      ]);

      return pricing.map(p => ({
        ...p,
        tier_name: tiers.find(t => t.tier_id === p.tier_id)?.tier_name || 'Unknown',
        service_name: services.find(s => s.service_id === p.service_id)?.service_name || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching pricing with names:', error);
      throw error;
    }
  }
};

export default manageSubscriptionService;
