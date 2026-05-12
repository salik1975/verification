
export interface LicenseInfo {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  issue_date: string;
  expiry_date: string;
  gender: string;
  license_number: string;
  address: string;
  file_name: string;
}

export interface VerificationState {
  currentStep: number;
  licenseImage: string | null;
  licenseInfo: LicenseInfo;
  selfieImage: string | null;
  matchPercentage: number | null;
  isVerified: boolean | null;
  loading: boolean;
  error: string | null;
  extractedFaceFilename: string | null;
}

export interface VerificationContextType {
  state: VerificationState;
  goToStep: (step: number) => void;
  setLicenseImage: (image: string | null) => void;
  updateLicenseInfo: (info: Partial<LicenseInfo>) => void;
  setSelfieImage: (image: string | null) => void;
  verifyIdentity: () => Promise<void>;
  resetVerification: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setExtractedFields: (fields: LicenseInfo, extractedFaceFilename?: string | null) => void;
  setExtractedFaceFilename: (filename: string | null) => void;
  sessionId: string;
}
