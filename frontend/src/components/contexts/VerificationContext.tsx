
import React, {
  createContext,
  useState,
  useContext,
  ReactNode
} from 'react';
import { formatForDateInput, cleanAddress } from '@/lib/utils';
import { LicenseInfo, VerificationState, VerificationContextType } from '@/types/verification';
import { VerificationService } from '@/services';
import { v4 as uuidv4 } from 'uuid';

// ─── Initial State ────────────────────────────────────────────────────────────

const defaultLicenseInfo: LicenseInfo = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  issue_date: '',
  expiry_date: '',
  gender: '',
  license_number: '',
  address: '',
  file_name:''
};

const initialState: VerificationState = {
  currentStep: 1,
  licenseImage: null,
  licenseInfo: defaultLicenseInfo,
  selfieImage: null,
  matchPercentage: null,
  isVerified: null,
  loading: false,
  error: null,
  extractedFaceFilename: null
};

const initialSessionId = uuidv4();

// ─── Context & Provider ───────────────────────────────────────────────────────

const VerificationContext = createContext<
  VerificationContextType | undefined
>(undefined);

export const VerificationProvider: React.FC<{ children: ReactNode }> = ({
  children
}) => {
  const [state, setState] = useState<VerificationState>(initialState);
  const [sessionId] = useState(initialSessionId);

  const goToStep = (step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const setLicenseImage = (image: string | null) => {
    setState(prev => ({ ...prev, licenseImage: image, error: null }));
  };

  const updateLicenseInfo = (info: Partial<LicenseInfo>) => {
    setState(prev => ({
      ...prev,
      licenseInfo: { ...prev.licenseInfo, ...info }
    }));
  };

  const setSelfieImage = (image: string | null) => {
    setState(prev => ({ ...prev, selfieImage: image, error: null }));
  };

  const verifyIdentity = async () => {
    // Pause in debugger as soon as this fn is invoked

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { selfieImage} = state;

      if (!selfieImage) {
        throw new Error('Missing selfie image or extracted face filename');
      }
  
      // Convert data URL → Blob → File

      const base64Response = await fetch(selfieImage);
      const blob = await base64Response.blob();
      const selfieFile = new File([blob], 'selfie.png', { type: 'image/png' });

      // Build FormData
      const formData = new FormData();
      formData.append('image', selfieFile);

      formData.append('file_name', state.licenseInfo.file_name)
      
  
      // Hit verification service
      const data = await VerificationService.verifyFaceWithFile(selfieFile, state.licenseInfo.file_name);

      // Destructure returned payload
      const { verified, distance, threshold } = data;
  
      // Update state based on response
      setState(prev => ({
        ...prev,
        isVerified: verified,
        matchPercentage: distance,
        loading: false,
        currentStep: 5,
      }));
    } catch (error: unknown) {
      // Break here if something goes wrong
      
      console.error('🔴 Verification failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };
  

  const resetVerification = () => {
    setState(initialState);
  };

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const setExtractedFaceFilename = (filename: string | null) => {
    setState(prev => ({ ...prev, extractedFaceFilename: filename }));
  };

  const setExtractedFields = (
    fields: LicenseInfo,
    extractedFaceFilename: string | null = null
  ) => {
    const formattedFields: LicenseInfo = {
      ...fields,
      date_of_birth: formatForDateInput(fields.date_of_birth),
      expiry_date: formatForDateInput(fields.expiry_date),
      issue_date: formatForDateInput(fields.issue_date),
      address: cleanAddress(fields.address)
    };

    setState(prev => ({
      ...prev,
      licenseInfo: formattedFields,
      extractedFaceFilename,
      loading: false,
      currentStep: 3,
      error: null
    }));
  };

  return (
    <VerificationContext.Provider
      value={{
        state,
        goToStep,
        setLicenseImage,
        updateLicenseInfo,
        setSelfieImage,
        verifyIdentity,
        resetVerification,
        setLoading,
        setError,
        setExtractedFields,
        setExtractedFaceFilename,
        sessionId // <-- provide sessionId
      }}
    >
      {children}
    </VerificationContext.Provider>
  );
};

const useVerification = () => {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error(
      'useVerification must be used within a VerificationProvider'
    );
  }
  return context;
};

export { useVerification };
export { VerificationContext };
