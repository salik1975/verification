import { useDriverLicense } from "@/pages/context/DriverLicenseContext";
import { CheckCircledIcon, CircleIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { VerificationService } from "@/services/verificationService";
import { useDocumentType } from "@/pages/context/DocumentTypeContext";
import { useAuth } from "@/components/contexts/AuthContext";

export function FinalLicenseResult() {
  const [animate, setAnimate] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [hasPostedLog, setHasPostedLog] = useState(false);

  const { livenessStatus, compareResult, criticalFieldResult, driverLicenseData, videoFace, passportData, resultData, phraseMatch } = useDriverLicense();
  const { selectedDocumentTypeId } = useDocumentType();
  const { user } = useAuth();

  useEffect(() => {
    console.log('=== FinalLicenseResult useEffect triggered ===');
    console.log('Current state values:', {
      criticalFieldResult,
      livenessStatus,
      compareResult,
      phraseMatch
    });
    
    const allPassed = criticalFieldResult && livenessStatus && compareResult && phraseMatch;
    const allEvaluated = criticalFieldResult !== null && livenessStatus !== null && compareResult !== null && phraseMatch !== null;
    
    console.log('Evaluation results:', {
      allPassed,
      allEvaluated,
      hasPostedLog
    });

    if (allEvaluated) {
      console.log('✅ All evaluations complete - setting verification status');
      setIsVerified(allPassed);
      setAnimate(true);
      if (!hasPostedLog) {
        console.log('📝 Creating verification log payload...');
        const docTypeMap: Record<string, string> = {
          US_DRIVING_LICENSE: "1",
          US_PASSPORT: "2",
          CAN_DRIVING_LICENSE: "3",
          CAN_PASSPORT: "4"
        };
        const dataSource = (passportData && passportData.analyzeResult) ? passportData : driverLicenseData;
        const documentTypeId = dataSource?.documentType ? docTypeMap[dataSource.documentType] : "1";
        const fields = dataSource?.analyzeResult?.documents?.[0]?.fields;
        const extractedName = fields?.FirstName?.content && fields?.LastName?.content
          ? `${fields.FirstName.content} ${fields.LastName.content}`
          : undefined;
        const extractedDocNumber = fields?.DocumentNumber?.content || undefined;
        const extractedInfoJson = dataSource?.analyzeResult?.documents?.[0]
          ? JSON.stringify(dataSource.analyzeResult.documents[0])
          : undefined;
        let conf1, conf2, conf3;
        if (Array.isArray(resultData) && resultData.length >= 3) {
          conf1 = resultData[0]?.distance;
          conf2 = resultData[1]?.distance;
          conf3 = resultData[2]?.distance;
        }
        console.log('Final verification payload:', {
          DocumentVerification: criticalFieldResult,
          LivenessVerification: livenessStatus,
          PhotoVerification: compareResult,
          PhraseVerification: phraseMatch,
          FinalVerification: allPassed
        });
        
        const payload = {
          DocumentTypeID: documentTypeId,
          ExtractedName: extractedName,
          ExtractedDocNumber: extractedDocNumber,
          ExtractedInfoJson: extractedInfoJson,
          DocumentVerification: criticalFieldResult,
          LivenessVerification: livenessStatus,
          PhotoVerification: compareResult,
          PhraseVerification: phraseMatch,
          FaceSnapshotsJson: videoFace ? JSON.stringify(videoFace) : undefined,
          FinalVerification: allPassed,
          CreatedOn: new Date().toISOString(),
          CreatedBy: user?.username || "frontend",
          LastModifiedOn: new Date().toISOString(),
          LastModifiedBy: user?.username || "frontend",
          IsActive: true,
          UserID: user?.user_id || null
        };
        console.log('🚀 Sending verification log to backend...');
        VerificationService.postVerificationLog(payload)
          .then(response => {
            console.log('✅ Verification log sent successfully:', response);
          })
          .catch(error => {
            console.error('❌ Failed to send verification log:', error);
          });
        setHasPostedLog(true);
      }
    } else {
      console.log('⏳ Not all evaluations complete yet...');
      setIsVerified(null);
      if (hasPostedLog) setHasPostedLog(false);
    }
  }, [criticalFieldResult, livenessStatus, compareResult, phraseMatch, driverLicenseData, videoFace, selectedDocumentTypeId, hasPostedLog, passportData, resultData]);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  console.log('🎯 FinalLicenseResult render - isVerified:', isVerified);
  if (isVerified === null) {
    console.log('❌ Component not rendering - isVerified is null');
    return null;
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-secondary rounded-lg p-4">
      <div className="flex items-center justify-center gap-2 mb-4">
        <h2 className={`text-2xl font-bold ${
          isVerified ? "text-green-500" : "text-red-500"
        }`}>
          {isVerified ? "Verification Successful" : "Verification Failed"}
        </h2>
        {isVerified ? (
          <CheckCircledIcon className={`w-8 h-8 text-green-500 ${animate ? "scale-125" : ""} transition-transform`} />
        ) : (
          <CrossCircledIcon className="w-8 h-8 text-red-500" />
        )}
      </div>
      <p className="text-sm text-gray-400">
        The verification log has been saved.
      </p>
    </div>
  );
}
