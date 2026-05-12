import { apiClient, API_ENDPOINTS } from './api';
import { DocumentData, FaceExtractionResponse } from './types';

export class DocumentService {
  /**
   * Upload and process document (Driver License or Passport)
   */
  static async uploadDocument(file: File, sessionId: string): Promise<DocumentData> {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('session_id', sessionId);

    const response = await apiClient.post(API_ENDPOINTS.UPLOAD_DOCUMENT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data; // Already parsed by axios
  }

  /**
   * Extract face from document
   */
  static async extractFace(file: File, sessionId: string): Promise<FaceExtractionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('session_id', sessionId);

    const response = await apiClient.post(API_ENDPOINTS.EXTRACT_FACE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data; // Already parsed by axios
  }
}