import { API_ENDPOINTS } from './api';
import { FaceVerificationRequest, FaceVerificationResponse, FaceVerificationApiResponse } from './types';

// Define VerificationLogCreate type if not already present
export interface VerificationLogCreate {
  SessionID?: string;
  DocumentTypeID: string;
  ExtractedName?: string;
  ExtractedDocNumber?: string;
  ExtractedInfoJson?: string;
  DocumentVerification?: boolean;
  LivenessVerification?: boolean;
  PhotoVerification?: boolean;
  PhraseVerification?: boolean;
  PhoneVerification?: boolean;
  EmailVerification?: boolean;
  FaceSnapshotsJson?: string;
  FinalVerification?: boolean;
  CreatedOn?: string;
  CreatedBy?: string;
  LastModifiedOn?: string;
  LastModifiedBy?: string;
  IsActive?: boolean;
  UserID?: number;
  // Tenant information (added by backend)
  tenant_name?: string;
  tenant_id?: number | null;
}

export interface VerificationLogsParams {
  skip?: number;
  limit?: number;
  document_type_id?: string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface VerificationLogsResponse {
  logs: VerificationLogCreate[];
  total_count: number;
}

export interface UserVerificationCountResponse {
  user_id: number;
  verification_count: number;
}

export interface SubscriptionLimitResponse {
  allowed: boolean;
  remaining: number | null;
  max_reports: number | null;
  reports_used: number | null;
  message: string;
}

export class VerificationService {
  /**
   * Verify face images for identity matching
   */
  static async verifyFaceImages(images: string[]): Promise<FaceVerificationApiResponse | null> {
    try {
      const response = await fetch(API_ENDPOINTS.VERIFY_FACE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images }),
      });

      if (!response.ok) {
        throw new Error('Face verification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Face verification error:', error);
      return null;
    }
  }

  /**
   * Verify face with uploaded image and filename
   */
  static async verifyFaceWithFile(
    image: File,
    fileName: string
  ): Promise<FaceVerificationResponse> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('file_name', fileName);

    const response = await fetch(API_ENDPOINTS.VERIFY_FACE, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Post a verification log to the backend
   */
  static async postVerificationLog(payload: VerificationLogCreate): Promise<any> {
    const response = await fetch(API_ENDPOINTS.POST_VERIFICATION_LOG, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = new Error('Failed to post verification log') as Error & { status?: number };
      error.status = response.status;

      try {
        const errorData = await response.json();
        if (errorData.detail?.message) {
          error.message = errorData.detail.message;
        }
      } catch {
      }

      throw error;
    }

    return response.json();
  }

  /**
   * Update an existing verification log by SessionID
   */
  static async updateVerificationLog(sessionId: string, payload: Partial<VerificationLogCreate>): Promise<any> {
    const response = await fetch(`${API_ENDPOINTS.UPDATE_VERIFICATION_LOG}/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to update verification log');
    }

    return response.json();
  }

  /**
   * Get authentication token from localStorage
   */
  private static getAuthToken(): string | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.token || null;
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Fetch verification logs from the backend with pagination and filtering
   */
  static async fetchVerificationLogs(params: VerificationLogsParams = {}): Promise<VerificationLogsResponse> {
    const {
      skip = 0,
      limit = 50,
      document_type_id,
      user_id,
      start_date,
      end_date,
      sort_by = 'CreatedOn',
      sort_order = 'desc'
    } = params;

    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      token,
      skip: skip.toString(),
      limit: limit.toString(),
      sort_by,
      sort_order
    });

    if (document_type_id) {
      queryParams.append('document_type_id', document_type_id);
    }
    if (user_id) {
      queryParams.append('user_id', user_id.toString());
    }
    if (start_date) {
      queryParams.append('start_date', start_date);
    }
    if (end_date) {
      queryParams.append('end_date', end_date);
    }

    // Fetch logs
    const logsResponse = await fetch(`${API_ENDPOINTS.GET_VERIFICATION_LOGS}?${queryParams}`);
    if (!logsResponse.ok) throw new Error('Failed to fetch verification logs');
    const logs = await logsResponse.json();

    // Fetch total count
    const countResponse = await fetch(`${API_ENDPOINTS.GET_VERIFICATION_LOGS_COUNT}?${queryParams}`);
    if (!countResponse.ok) throw new Error('Failed to fetch verification logs count');
    const { total_count } = await countResponse.json();

    return { logs, total_count };
  }

  /**
   * Get verification count for a specific user within a date range
   */
  static async getUserVerificationCount(
    user_id: number,
    start_date?: string,
    end_date?: string
  ): Promise<UserVerificationCountResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const queryParams = new URLSearchParams({
      token,
      user_id: user_id.toString()
    });

    if (start_date) {
      queryParams.append('start_date', start_date);
    }
    if (end_date) {
      queryParams.append('end_date', end_date);
    }

    const response = await fetch(`${API_ENDPOINTS.GET_USER_VERIFICATION_COUNT}?${queryParams}`);
    if (!response.ok) throw new Error('Failed to fetch user verification count');
    
    return response.json();
  }

  /**
   * Legacy method for backward compatibility - fetches first 50 logs
   */
  static async getVerificationLogs(): Promise<VerificationLogCreate[]> {
    const response = await this.fetchVerificationLogs({ limit: 50 });
    return response.logs;
  }

  /**
   * Check if user has remaining reports in their subscription
   * Should be called before starting verification to warn user
   */
  static async checkSubscriptionLimit(userId: number): Promise<SubscriptionLimitResponse> {
    const response = await fetch(`${API_ENDPOINTS.CHECK_SUBSCRIPTION_LIMIT}?user_id=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to check subscription limit');
    }
    return response.json();
  }
}