import { useState, useRef, useContext } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { useDriverLicense } from "@/pages/context/DriverLicenseContext";
import { DocumentService } from "@/services";
import { VerificationContext } from '../contexts/VerificationContext';

interface Document {
  imageUrl: string;
}

interface PassportStepProps {
  passport: string | null;
  onTypeChange: (type: string) => void;
  onImageUrlChange: (imageUrl: string) => void;
  onSetVideoButton: (value: boolean) => void;
  onPhraseExtracted?: (phrase: string) => void;
}


export function PassportStep({ passport, onTypeChange, onImageUrlChange, onSetVideoButton, onPhraseExtracted }: PassportStepProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { setDriverLicenseData, setPassportData, setIdFace, setcriticalFieldResult, setIdFaceExtracted } = useDriverLicense();
  const verificationContext = useContext(VerificationContext);
  const sessionId = verificationContext?.sessionId;

  const [loading, setLoading] = useState(false);
  const [isReuploading, setIsReuploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getColorClass = (value: number) => {
    if (value <= 0.5) return "text-red-500";
    if (value <= 0.8) return "text-orange-500";
    return "text-green-500";
  };

  const resetStates = () => {
    onImageUrlChange("");
    onTypeChange("");
    onSetVideoButton(false);
    setDriverLicenseData(null);
    setPassportData(null);
    setIdFace(null);
    setcriticalFieldResult(false);
  };

  const handlePassportUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const previewBase64 = reader.result as string;

      setLoading(true);
      if (isReuploading) {
        resetStates();
      }

      try {
        // Upload and process document
        let data;
        try {
          data = await DocumentService.uploadDocument(file, sessionId);
          console.log(data);
        } catch (docError: any) {
          // Handle document upload/analysis errors specifically
          const docErrorMessage = docError?.response?.data?.detail || "Failed to process document. Please try again.";
          throw {
            step: "document",
            status: docError?.response?.status,
            message: docErrorMessage,
            originalError: docError
          };
        }

        // If phrase is present in response, call onPhraseExtracted
        if (data.phrase && typeof data.phrase === 'string' && data.phrase.trim() && onPhraseExtracted) {
          onPhraseExtracted(data.phrase);
        }

        // Support both new and old backend response formats
        const extraction = data.extraction_result || data;
        let analyzeResult = extraction.analyzeResult;
        
        // If analyzeResult is a string (legacy backend), try to parse it
        if (analyzeResult && typeof analyzeResult === 'string') {
          try {
            analyzeResult = JSON.parse(analyzeResult);
          } catch (e) {
            console.error("Failed to parse analyzeResult as JSON:", analyzeResult);
            throw new Error("Invalid response format: analyzeResult is not valid JSON");
          }
        }

        // Check if analyzeResult exists and has the expected structure
        if (!analyzeResult) {
          console.error("Missing analyzeResult in response:", data);
          throw new Error("Invalid response format: analyzeResult is missing");
        }

        // Check if documents array exists and is valid
        if (!analyzeResult.documents || !Array.isArray(analyzeResult.documents) || analyzeResult.documents.length === 0) {
          console.error("Invalid documents array in analyzeResult:", analyzeResult);
          throw new Error("Invalid response format: documents array is missing or empty");
        }

        // Use analyzeResult for the rest of the logic
        data.analyzeResult = analyzeResult;
        
        onTypeChange(data.type);
        
        // Extract face from document FIRST before showing document data
        // This ensures we don't show document details if face extraction fails
        let faceData;
        try {
          faceData = await DocumentService.extractFace(file, sessionId);
          console.log("Face extraction successful:", faceData);
        } catch (faceError: any) {
          // Handle face extraction errors specifically
          const faceErrorMessage = faceError?.response?.data?.detail || "Failed to extract face from document. Please try again.";
          throw {
            step: "face",
            status: faceError?.response?.status,
            message: faceErrorMessage,
            originalError: faceError
          };
        }

        /*
         * faceData is expected to look like:
         *   { face_filename: "data:image/jpeg;base64,..." }  (or contains a URL / base64 string)
         * We only need the actual image string for rendering & verification,
         * so store that directly instead of JSON-stringifying the whole object.
         */
        if (faceData && typeof faceData === 'object' && 'face_filename' in faceData) {
          const { face_filename } = faceData as { face_filename?: string };
          if (face_filename) {
            setIdFace(face_filename);
            setIdFaceExtracted(true);
          }
        } else {
          // Fallback: if backend already returns raw string
          // (e.g. base64 without wrapping object)
          // just use it directly.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setIdFace(faceData as any);
        }

        // Only update UI state after face extraction succeeds
        if (data.type === "passport") {
          // Ensure documentType is set for passport
          if (!data.documentType) {
            data.documentType = data.type === "passport" ? "US_PASSPORT" : "UNKNOWN";
          }
          setPassportData(data);
        } else if (data.type === "driving_license") {
          if (!data.documentType) {
            data.documentType = data.type === "driving_license" ? "US_DRIVING_LICENSE" : "UNKNOWN";
          }
          setDriverLicenseData(data);
        } else {
          throw new Error("Unsupported document type");
        }
        onSetVideoButton(true);
        onImageUrlChange(previewBase64);
        setcriticalFieldResult(true);
      } catch (error: any) {
        setcriticalFieldResult(false);
        console.error("Error uploading document:", error);

        // Determine error title and message based on which step failed
        let errorTitle = "Error";
        let errorMessage = "Failed to process document. Please try again.";

        if (error?.step === "document") {
          // Document upload/analysis error
          errorTitle = "Document Processing Failed";
          errorMessage = error?.message || "We couldn't process your document. Please ensure it's a valid US or Canadian Driver's License or Passport.";
        } else if (error?.step === "face") {
          // Face extraction error
          errorTitle = "Face Not Detected";
          errorMessage = error?.message || "No face detected in the uploaded image. Please upload a clear photo with a visible face.";
        } else {
          // Generic error (fallback)
          errorMessage = error?.response?.data?.detail || error?.message || errorMessage;
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setIsReuploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReupload = () => {
    setIsReuploading(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset input to allow selecting same file again
      fileInputRef.current.click();
    }
  };

  // Show loader during initial upload or re-upload
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center h-[200px]">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-600 rounded-full mb-4"></div>
          <p className="text-sm font-medium">
            {isReuploading ? "Processing new document..." : "Processing document..."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show the uploaded document if available and not loading
  if (passport) {
    return (
      <div className="relative h-[200px]">
        {/* Re-upload button at bottom right */}
       <div className="relative h-full">
          <img
            src={passport}
            alt="Document"
            className="w-full h-full object-contain rounded-md"
          />

          {/* Cross icon at top-right corner */}
          <button
            onClick={resetStates}
            className="absolute top-2 right-2 bg-white text-black rounded-full w-7 h-7 flex items-center justify-center shadow hover:bg-gray-200 transition"
            title="Remove"
          >
            ✕
          </button>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handlePassportUpload(e.target.files[0]);
              }
            }}
            accept="image/*"
            className="hidden"
          />
        </div>

       
      </div>
    );
  }

  // Default: show the FileUpload control
  return (
    <FileUpload
      label="Upload Driver's License/Passport"
      onFileChange={handlePassportUpload}
      accept="image/*"
    />
  );
}