import { apiClient, API_ENDPOINTS } from './api';
import { ConfidenceThreshold, CriticalField, ConfigResponse, ConfigStoreRow } from './types';

export class ConfigService {
  /**
   * Fetch confidence threshold configurations
   */
  static async getConfidenceThresholds(): Promise<ConfidenceThreshold[]> {
    try {
      const response = await fetch(API_ENDPOINTS.CONFIDENCE_THRESHOLDS);
      const data: ConfigResponse<ConfidenceThreshold[]> = await response.json();
      
      return data.status === 'success' ? data.data : [];
    } catch (error) {
      console.error('Failed to fetch confidence thresholds:', error);
      return [];
    }
  }

  /**
   * Fetch critical fields for a document type
   */
  static async getCriticalFields(documentType: string): Promise<CriticalField[]> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CRITICAL_FIELDS, {
        documentType,
      });

      return response.data.status === 'success' ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching critical fields:', error);
      return [];
    }
  }

  /**
   * Get authentication token from localStorage
   */
  private static getAuthToken(): string | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.token;
    }
    return null;
  }

  /**
   * Fetch all config store rows (tenant-specific with global fallback)
   */
  static async getConfigStore(): Promise<ConfigStoreRow[]> {
    const token = this.getAuthToken();
    
    try {
      // If token exists, try to get tenant-specific configs
      if (token) {
        const response = await apiClient.get(API_ENDPOINTS.CONFIG_STORE, {
          params: { token }
        });
        return response.data;
      }
    } catch (error: any) {
      // If token is invalid (401), fall back to global configs
      if (error.response?.status === 401) {
        // Clear invalid token from localStorage
        localStorage.removeItem('user');
      } else {
        throw error;
      }
    }
    
    // If no token or token was invalid, get global configs
    const response = await apiClient.get(API_ENDPOINTS.CONFIG_STORE, {
      params: {}
    });
    return response.data;
  }

  /**
   * Update config store rows (tenant-specific)
   */
  static async updateConfigStore(items: ConfigStoreRow[]): Promise<ConfigStoreRow[]> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await apiClient.post(API_ENDPOINTS.CONFIG_STORE, items, {
      params: { token }
    });
    return response.data;
  }

  /**
   * Get appearance settings from config store
   */
  static async getAppearanceSettings(): Promise<{
    productLogo: string;
    productNameImage: string;
    productName: string;
    primaryColor: string;
  }> {
    const config = await this.getConfigStore();
    const appearanceConfig = {
      productLogo: '',
      productNameImage: '',
      productName: 'VeraFi.Me',
      primaryColor: '#6478CF'
    };

    config.forEach(item => {
      if (item.is_available) { // Only use available configs
        switch (item.key_name) {
          case 'PRODUCT_LOGO':
            appearanceConfig.productLogo = item.value;
            break;
          case 'PRODUCT_NAME_IMAGE':
            appearanceConfig.productNameImage = item.value;
            break;
          case 'PRODUCT_NAME':
            appearanceConfig.productName = item.value;
            break;
          case 'PRIMARY_COLOR':
            appearanceConfig.primaryColor = item.value;
            break;
        }
      }
    });

    return appearanceConfig;
  }

  /**
   * Update appearance settings
   */
  static async updateAppearanceSettings(settings: {
    productLogo?: string;
    productNameImage?: string;
    primaryColor?: string;
  }): Promise<ConfigStoreRow[]> {
    const items: ConfigStoreRow[] = [];
    
    if (settings.productLogo !== undefined) {
      items.push({
        key_name: 'PRODUCT_LOGO',
        value: settings.productLogo,
        description: 'Base64 encoded product logo image (PNG/SVG format)'
      });
    }
    
    if (settings.productNameImage !== undefined) {
      items.push({
        key_name: 'PRODUCT_NAME_IMAGE',
        value: settings.productNameImage,
        description: 'Base64 encoded product name/brand image (PNG/SVG format)'
      });
    }
    
    if (settings.primaryColor !== undefined) {
      items.push({
        key_name: 'PRIMARY_COLOR',
        value: settings.primaryColor,
        description: 'Primary color hex code for application branding'
      });
    }

    return this.updateConfigStore(items);
  }
}