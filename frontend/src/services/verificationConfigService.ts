import { apiClient } from './api';

export interface VerificationConfig {
  [key: string]: {
    value: boolean;
    description: string;
  };
}

export interface VerificationConfigResponse {
  success: boolean;
  message: string;
  data?: VerificationConfig;
}

export interface UpdateVerificationConfigRequest {
  config_key: string;
  config_value: string;
}

/**
 * Get verification configuration settings from the backend
 * Uses token to get tenant-specific configs
 */
export const getVerificationConfig = async (): Promise<VerificationConfigResponse> => {
  try {
    // Get token from user object in localStorage for tenant-specific config
    const userStr = localStorage.getItem('user');
    let token: string | null = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token || null;
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    const url = token
      ? `/api/v1/verification-config?token=${encodeURIComponent(token)}`
      : '/api/v1/verification-config';
    const response = await apiClient.get(url);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to get verification configuration');
  }
};

/**
 * Update a specific verification configuration setting
 */
export const updateVerificationConfig = async (
  request: UpdateVerificationConfigRequest
): Promise<VerificationConfigResponse> => {
  try {
    const response = await apiClient.put('/api/v1/verification-config', request);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to update verification configuration');
  }
};

/**
 * Get a specific verification configuration value
 */
export const getVerificationConfigValue = async (configKey: string): Promise<boolean> => {
  try {
    const response = await getVerificationConfig();
    if (response.success && response.data && response.data[configKey]) {
      return response.data[configKey].value;
    }
    return false; // Default to false if not found
  } catch (error) {
    console.error(`Error getting config value for ${configKey}:`, error);
    return false; // Default to false on error
  }
};

/**
 * Check if a specific verification feature is enabled
 */
export const isVerificationFeatureEnabled = async (featureKey: string): Promise<boolean> => {
  return await getVerificationConfigValue(featureKey);
};
