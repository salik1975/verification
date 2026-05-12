import axios from 'axios';

// Create axios instance with base configuration
export const apiClient = axios.create({
  // Apply default base URL for all API requests
  baseURL: import.meta.env.VITE_API_BACKEND_URL,
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints configuration
export const API_ENDPOINTS = {
  // Document processing
  UPLOAD_DOCUMENT: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/upload`,
  EXTRACT_FACE: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/face`,
  VERIFY_FACE: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/verify_face`,
  VERIFY_PHRASE: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/verify_phrase`,
  LIVENESS: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/api/liveness`,

  // Configuration
  CONFIDENCE_THRESHOLDS: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/fetchconfidencecode`,
  CRITICAL_FIELDS: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/displaycriticalfield`,
  POST_VERIFICATION_LOG: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/insert-logs`,
  UPDATE_VERIFICATION_LOG: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/update-log`,
  GET_VERIFICATION_LOGS: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/retrieve-logs`,
  GET_VERIFICATION_LOGS_COUNT: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/retrieve-logs-count`,
  GET_USER_VERIFICATION_COUNT: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/user-verification-count`,
  CHECK_SUBSCRIPTION_LIMIT: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/check-subscription-limit`,
  DOCUMENT_DETAIL: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/document-detail`,
  CONFIG_STORE: `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/config-store`,
};

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);