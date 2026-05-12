/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, ReactNode } from "react";

interface DriverLicenseContextType {
  driverLicenseData: any; // Replace with your actual type if needed
  setDriverLicenseData: (value: any) => void;
  passportData: any; // Replace with your actual type if needed
  setPassportData: (value: any) => void;
  idFace: string | null;
  setIdFace:(value: string | null) => void;
  idFaceExtracted: boolean;
  setIdFaceExtracted: (value: boolean) => void;
  selfiePhoto: string | null;
  setSelfiePhoto: (value: string | null) => void;
  livenessStatus: boolean;
  setLivenessStatus: (value: boolean) => void;
  compareResult: boolean;
  setCompareResult:(value: boolean) => void;
  criticalFieldResult: boolean;
  setcriticalFieldResult:(value: boolean) => void;
  // videoFace?: string | null; // Optional, if you want to include videoFace
  // setVideoFace?: (value: string | null) => void; // Optional setter for videoFace
  videoFace: any;
  setVideoFace:  (value: any) => void; // Setter for videoFace
  resultData: any; // Replace with your actual type if needed
  setResultData: (value: any) => void;
  phraseMatch: boolean;
  setPhraseMatch: (value: boolean) => void;
}

const DriverLicenseContext = createContext<DriverLicenseContextType | undefined>(undefined);

export const DriverLicenseProvider = ({ children }: { children: ReactNode }) => {
  const [driverLicenseData, setDriverLicenseData] = useState<any>(null);
  const [passportData, setPassportData] = useState<any>(null);
  const [idFace, setIdFace] = useState<string | null>(null);
  const [idFaceExtracted, setIdFaceExtracted] = useState<boolean>(false);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [livenessStatus, setLivenessStatus] = useState<boolean>(null);
  const [compareResult, setCompareResult] = useState<boolean>(null);
  const [criticalFieldResult, setcriticalFieldResult] = useState<boolean>(null);
  const [videoFace, setVideoFace] = useState<any>(null);
  const [resultData, setResultData] = useState<any>(null);
  const [phraseMatch, setPhraseMatch] = useState<boolean>(null);
  return (
    <DriverLicenseContext.Provider value={{ driverLicenseData, setDriverLicenseData, passportData, setPassportData, idFace,setIdFace, idFaceExtracted, setIdFaceExtracted, selfiePhoto, setSelfiePhoto, livenessStatus, setLivenessStatus, videoFace, setVideoFace,resultData, setResultData,compareResult,setCompareResult,criticalFieldResult,setcriticalFieldResult, phraseMatch, setPhraseMatch}}>
      {children}
    </DriverLicenseContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDriverLicense = () => {
  const context = useContext(DriverLicenseContext);
  if (!context) {
    throw new Error("useDriverLicense must be used within a DriverLicenseProvider");
  }
  return context;
};
