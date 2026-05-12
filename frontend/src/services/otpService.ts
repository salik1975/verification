import { apiClient } from './api';

export interface SendOTPRequest {
  phone_number: string;
  country_code: string;
}

export interface VerifyOTPRequest {
  phone_number: string;
  country_code: string;
  otp: string;
}

// New email OTP interfaces
export interface SendEmailOTPRequest {
  email: string;
}

export interface VerifyEmailOTPRequest {
  email: string;
  otp: string;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  data?: {
    phone_number?: string;
    email?: string;
    expires_in?: string;
    verified_at?: string;
  };
}

export interface OTPStatusResponse {
  success: boolean;
  data: {
    phone_number: string;
    has_otp: boolean;
    is_expired?: boolean;
    attempts?: number;
    expires_at?: string;
    remaining_attempts?: number;
  };
}

export interface EmailOTPStatusResponse {
  success: boolean;
  data: {
    email: string;
    has_otp: boolean;
    is_expired?: boolean;
    attempts?: number;
    expires_at?: string;
    remaining_attempts?: number;
  };
}

export interface ResendTimerResponse {
  success: boolean;
  data: {
    can_resend: boolean;
    remaining_seconds: number;
    remaining_time: string;
  };
}

/**
 * Send OTP to the provided phone number
 */
export const sendOTP = async (request: SendOTPRequest): Promise<OTPResponse> => {
  try {
    const response = await apiClient.post('/api/v1/send-otp', request);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to send OTP');
  }
};

/**
 * Verify the OTP provided by the user
 */
export const verifyOTP = async (request: VerifyOTPRequest): Promise<OTPResponse> => {
  try {
    const response = await apiClient.post('/api/v1/verify-otp', request);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to verify OTP');
  }
};

/**
 * Send email OTP to the provided email address
 */
export const sendEmailOTP = async (request: SendEmailOTPRequest): Promise<OTPResponse> => {
  try {
    const response = await apiClient.post('/api/v1/send-email-otp', request);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to send email OTP');
  }
};

/**
 * Verify the email OTP provided by the user
 */
export const verifyEmailOTP = async (request: VerifyEmailOTPRequest): Promise<OTPResponse> => {
  try {
    const response = await apiClient.post('/api/v1/verify-email-otp', request);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to verify email OTP');
  }
};

/**
 * Get the status of OTP for a phone number (for debugging/testing)
 */
export const getOTPStatus = async (
  phoneNumber: string, 
  countryCode: string = "+1"
): Promise<OTPStatusResponse> => {
  try {
    const response = await apiClient.get(`/api/v1/otp/status/${phoneNumber}`, {
      params: { country_code: countryCode }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to get OTP status');
  }
};

/**
 * Get the remaining time before OTP can be resent
 */
export const getResendTimer = async (
  phoneNumber: string, 
  countryCode: string = "+1"
): Promise<ResendTimerResponse> => {
  try {
    const response = await apiClient.get(`/api/v1/resend-timer/${phoneNumber}`, {
      params: { country_code: countryCode }
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to get resend timer');
  }
};

/**
 * Get the remaining time before email OTP can be resent
 */
export const getEmailResendTimer = async (email: string): Promise<ResendTimerResponse> => {
  try {
    const response = await apiClient.get(`/api/v1/email-resend-timer/${email}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Failed to get email resend timer');
  }
};
