import { apiClient } from './api';
import type { DocumentType } from './types';

// Endpoint path for fetching available document types
const DOCUMENT_TYPES_ENDPOINT = `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/document-types/`;

export class DocumentTypeService {
  /**
   * Fetch the list of supported document types.
   *
   * Returns an array of objects in the form:
   *   [{ DocumentType: string, Description: string }, ...]
   */
  static async getDocumentTypes(): Promise<DocumentType[]> {
    const response = await apiClient.get<DocumentType[]>(DOCUMENT_TYPES_ENDPOINT);
    return response.data;
  }
} 