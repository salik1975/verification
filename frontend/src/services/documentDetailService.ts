import { apiClient } from './api';
import type { DocumentDetail } from './types';

/**
 * Service to fetch details for a specific document type.
 */
export class DocumentDetailService {
  /**
   * Fetch the list of document details (critical fields / mapping) for a given document type ID.
   *
   * @param documentTypeId numeric id obtained from /document-types
   * @returns Array of document detail records
   */
  static async getDetails(documentTypeId: number | string): Promise<DocumentDetail[]> {
    const response = await apiClient.get<DocumentDetail[]>(`/api/v1/document-detail?document_type=${documentTypeId}`);
    return response.data;
  }
} 