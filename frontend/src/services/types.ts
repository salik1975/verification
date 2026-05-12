// Document processing types
export interface DocumentField {
  content?: string;
  value?: string;
  confidence: number;
}

export interface DocumentData {
  type: string;
  documentType: string;
  analyzeResult: {
    documents: Array<{
      fields: Record<string, DocumentField>;
    }>;
  };
}

export interface FaceExtractionResponse {
  face_filename?: string;
}

export interface FaceVerificationRequest {
  images?: string[];
  image?: File;
  file_name?: string;
}

export interface FaceVerificationResponse {
  verified: boolean;
  distance: number;
  threshold: number;
}

// Configuration types
export interface ConfidenceThreshold {
  fromconfidence: number;
  toconfidence: number;
  colorcodetailwind: string;
  colorcode_hex: string;
  hoverDescription: string;
}

export interface CriticalField {
  FieldKey: string;
  FieldLabelToDisplay: string;
  Weightage: number | null;
}

export interface ConfigResponse<T> {
  status: string;
  data: T;
}

export interface DocumentType {
  Id: number;
  DocumentType: string;
  Description: string;
}

// Face verification API response shapes
export interface FaceVerificationResult {
  verified: boolean;
  distance: number;
  threshold: number;
}

export interface FaceVerificationApiResponse {
  results: FaceVerificationResult[];
}

// Document detail row structure returned by /document-detail
export interface DocumentDetail {
  Id: number;
  DocId: number;
  FieldKey: string;
  FieldLabelToDisplay: string;
  isCritical: boolean;
}

export interface ConfigStoreRow {
  key_name: string;
  value: string;
  description: string;
  is_available?: boolean; // Whether this config is available for the current tenant
}