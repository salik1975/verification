import { apiClient } from './api';

// Types matching the backend schemas
export interface SubscriptionTier {
  tier_id: number;
  tier_name: string;
  max_reports: number;
  is_active: boolean;
  created_on?: string;
}

export interface SubscriptionService {
  service_id: number;
  service_name: string;
  service_description?: string;
  is_active: boolean;
  created_on?: string;
}

export interface SubscriptionPricing {
  pricing_id: number;
  tier_id: number;
  service_id: number;
  price_usd: number;
  is_active: boolean;
  created_on?: string;
  tier?: SubscriptionTier;
  service?: SubscriptionService;
}

export interface SubscriptionPlanResponse {
  tiers: SubscriptionTier[];
  services: SubscriptionService[];
  pricing_matrix: { [tier_id: number]: { [service_id: number]: number } };
}

export interface PricingPlan {
  tier: SubscriptionTier;
  service: SubscriptionService;
  totalPrice: number;
}

// API endpoints
const SUBSCRIPTION_ENDPOINTS = {
  PLANS: '/api/v1/subscription-management/plans',
  PRICING: '/api/v1/subscription-management/pricing',
  TIERS: '/api/v1/subscription-management/tiers',
  SERVICES: '/api/v1/subscription-management/services',
};

// Service functions
export const subscriptionService = {
  // Get all subscription plans (for frontend display)
  async getSubscriptionPlans(): Promise<SubscriptionPlanResponse> {
    try {
      const response = await apiClient.get(SUBSCRIPTION_ENDPOINTS.PLANS);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error);
      throw error;
    }
  },

  // Get pricing for specific tier-service combination
  async getPricingForPlan(tierId: number, serviceId: number): Promise<number> {
    try {
      const response = await apiClient.get(`${SUBSCRIPTION_ENDPOINTS.PRICING}/${tierId}/${serviceId}`);
      return response.data.price;
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      throw error;
    }
  },

  // Admin functions for managing subscriptions
  async getSubscriptionTiers(activeOnly: boolean = true): Promise<SubscriptionTier[]> {
    try {
      const response = await apiClient.get(SUBSCRIPTION_ENDPOINTS.TIERS, {
        params: { active_only: activeOnly }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch subscription tiers:', error);
      throw error;
    }
  },

  async getSubscriptionServices(activeOnly: boolean = true): Promise<SubscriptionService[]> {
    try {
      const response = await apiClient.get(SUBSCRIPTION_ENDPOINTS.SERVICES, {
        params: { active_only: activeOnly }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch subscription services:', error);
      throw error;
    }
  },

  async getAllPricing(activeOnly: boolean = true): Promise<SubscriptionPricing[]> {
    try {
      const response = await apiClient.get(SUBSCRIPTION_ENDPOINTS.PRICING, {
        params: { active_only: activeOnly }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch subscription pricing:', error);
      throw error;
    }
  },

  // Create functions
  async createSubscriptionTier(tier: Omit<SubscriptionTier, 'tier_id' | 'created_on'>): Promise<SubscriptionTier> {
    try {
      const response = await apiClient.post(SUBSCRIPTION_ENDPOINTS.TIERS, tier);
      return response.data;
    } catch (error) {
      console.error('Failed to create subscription tier:', error);
      throw error;
    }
  },

  async createSubscriptionService(service: Omit<SubscriptionService, 'service_id' | 'created_on'>): Promise<SubscriptionService> {
    try {
      const response = await apiClient.post(SUBSCRIPTION_ENDPOINTS.SERVICES, service);
      return response.data;
    } catch (error) {
      console.error('Failed to create subscription service:', error);
      throw error;
    }
  },

  async createSubscriptionPricing(pricing: Omit<SubscriptionPricing, 'pricing_id' | 'created_on' | 'tier' | 'service'>): Promise<SubscriptionPricing> {
    try {
      const response = await apiClient.post(SUBSCRIPTION_ENDPOINTS.PRICING, pricing);
      return response.data;
    } catch (error) {
      console.error('Failed to create subscription pricing:', error);
      throw error;
    }
  },

  // Update functions
  async updateSubscriptionTier(tierId: number, updates: Partial<SubscriptionTier>): Promise<SubscriptionTier> {
    try {
      const response = await apiClient.put(`${SUBSCRIPTION_ENDPOINTS.TIERS}/${tierId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update subscription tier:', error);
      throw error;
    }
  },

  async updateSubscriptionService(serviceId: number, updates: Partial<SubscriptionService>): Promise<SubscriptionService> {
    try {
      const response = await apiClient.put(`${SUBSCRIPTION_ENDPOINTS.SERVICES}/${serviceId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update subscription service:', error);
      throw error;
    }
  },

  async updateSubscriptionPricing(pricingId: number, updates: Partial<SubscriptionPricing>): Promise<SubscriptionPricing> {
    try {
      const response = await apiClient.put(`${SUBSCRIPTION_ENDPOINTS.PRICING}/${pricingId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update subscription pricing:', error);
      throw error;
    }
  },

  // Delete functions
  async deleteSubscriptionTier(tierId: number): Promise<void> {
    try {
      await apiClient.delete(`${SUBSCRIPTION_ENDPOINTS.TIERS}/${tierId}`);
    } catch (error) {
      console.error('Failed to delete subscription tier:', error);
      throw error;
    }
  },

  async deleteSubscriptionService(serviceId: number): Promise<void> {
    try {
      await apiClient.delete(`${SUBSCRIPTION_ENDPOINTS.SERVICES}/${serviceId}`);
    } catch (error) {
      console.error('Failed to delete subscription service:', error);
      throw error;
    }
  },

  async deleteSubscriptionPricing(pricingId: number): Promise<void> {
    try {
      await apiClient.delete(`${SUBSCRIPTION_ENDPOINTS.PRICING}/${pricingId}`);
    } catch (error) {
      console.error('Failed to delete subscription pricing:', error);
      throw error;
    }
  },
};

export default subscriptionService;
