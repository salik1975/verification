import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { useDriverLicense } from "@/pages/context/DriverLicenseContext";
import { DocumentService } from "@/services";
import { useContext } from "react";
import { VerificationContext } from '../contexts/VerificationContext';


interface CANDriverLicense {
  type: string;
  documentNumber: string;
  documentNumberConfidence: number;
  name: string;
  nameConfidence: number;
  dateOfBirth: string;
  dateOfBirthConfidence: number;
  expiryDate: string;
  expiryDateConfidence: number;
  imageUrl: string;
  address: string;
  addressConfidence: number;
  country: string;
  countryConfidence: number;
  issueDate: string;
  issueDateConfidence: number;
  eyecolor: string;
  eyecolorConfidence: number;
  height: string;
  heightConfidence: number;
  region: string;
  regionConfidence: number;
  restrictions: string;
  restrictionsConfidence: number;
  sex: string;
  sexConfidence: number;
  weight: string;
  weightConfidence: number;
  vehicleClassification: string;
  vehicleClassificationConfidence: number;
}

interface USDriverLicense {
  type: string;
  documentNumber: string;
  documentNumberConfidence: number;
  name: string;
  nameConfidence: number;
  dateOfBirth: string;
  dateOfBirthConfidence: number;
  expiryDate: string;
  expiryDateConfidence: number;
  imageUrl: string;
  address: string;
  addressConfidence: number;
  state: string;
  stateConfidence: number;
  issueDate: string;
  issueDateConfidence: number;
  eyecolor: string;
  eyecolorConfidence: number;
  height: string;
  heightConfidence: number;
  region: string;
  regionConfidence: number;
  restrictions: string;
  restrictionsConfidence: number;
  sex: string;
  sexConfidence: number;
  weight: string;
  weightConfidence: number;
  vehicleClassification: string;
  vehicleClassificationConfidence: number;
}

interface DriverLicenseStepProps {
  driverLicense: CANDriverLicense | USDriverLicense | null;
  onDriverLicenseChange: (license: CANDriverLicense | USDriverLicense | null) => void;
}



const getColorClass = (value: number) => {
  if (value <= 0.5) return "text-red-500";
  if (value <= 0.8) return "text-orange-500";
  return "text-green-500";
};
const getBorderColorClass = (value: number) => {
  if (value <= 0.5) return "border-red-500";
  if (value <= 0.8) return "border-orange-500";
  return "border-green-500";
};


export function DriverLicenseStep({
  driverLicense,
  onDriverLicenseChange,
}: DriverLicenseStepProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { setDriverLicenseData } = useDriverLicense();
  const verificationContext = useContext(VerificationContext);
  const sessionId = verificationContext?.sessionId;

  const handleDriverLicenseUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const previewBase64 = reader.result as string;
      setLoading(true);

      try {
        let response_data;
        try {
          response_data = await DocumentService.uploadDocument(file, sessionId);
          setDriverLicenseData(response_data);
          console.log(response_data);
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

        const data = response_data.analyzeResult.documents[0];
        console.log(data);

          let newDriverLicense;
          if (response_data.documentType === "CAN_DRIVING_LICENSE") {
            newDriverLicense = {
              type: response_data.documentType,
              documentNumber: data.fields.DocumentNumber.content,
              documentNumberConfidence: data.fields.DocumentNumber.confidence,
              name: data.fields.FirstName.content + " " + data.fields.LastName.content,
              nameConfidence: data.fields.FirstName.confidence,
              dateOfBirth: data.fields.DateOfBirth.content,
              dateOfBirthConfidence: data.fields.DateOfBirth.confidence,
              expiryDate: data.fields.DateOfExpiration.content,
              expiryDateConfidence: data.fields.DateOfExpiration.confidence,
              imageUrl: previewBase64,
              address: data.fields.Address.content,
              addressConfidence: data.fields.Address.confidence,
              
          
            };
          } else if (response_data.documentType === "US_DRIVING_LICENSE") {
              newDriverLicense= {
              type: response_data.documentType,
              documentNumber: data.fields.DocumentNumber.content,
              documentNumberConfidence: data.fields.DocumentNumber.confidence,
              name: data.fields.FirstName.content + " " + data.fields.LastName.content,
              nameConfidence: data.fields.FirstName.confidence,
              dateOfBirth: data.fields.DateOfBirth.content,
              dateOfBirthConfidence: data.fields.DateOfBirth.confidence,
              expiryDate:data.fields.DateOfExpiration.content,
              expiryDateConfidence: data.fields.DateOfExpiration.confidence,
              imageUrl: previewBase64, // use the local preview
              address: data.fields.Address.content, 
              addressConfidence: data.fields.Address.confidence,
              country: data.fields.CountryRegion.content,
              countryConfidence: data.fields.CountryRegion.confidence,
              issueDate: data.fields.DateOfIssue.content,
              issueDateConfidence: data.fields.DateOfIssue.confidence,
              eyecolor: data.fields.EyeColor.content,
              eyecolorConfidence: data.fields.EyeColor.confidence,
              height: data.fields.Height.content,
              heightConfidence: data.fields.Height.confidence,
              region: data.fields.Region.value,
              regionConfidence: data.fields.Region.confidence,
              restrictions: data.fields.Restrictions.content,
              restrictionsConfidence: data.fields.Restrictions.confidence,
              sex: data.fields.Sex.content,
              sexConfidence: data.fields.Sex.confidence,
              weight: data.fields.Weight.content,
              weightConfidence: data.fields.Weight.confidence,
              vehicleClassification: data.fields.VehicleClassifications.content,
              vehicleClassificationConfidence: data.fields.VehicleClassifications.confidence,
            };
          } else {
            throw new Error("Unsupported Document Type");
          }

          onDriverLicenseChange(newDriverLicense);
          toast({
            title: "Driver's License Uploaded",
            description: "Document data extracted successfully",
          });
      } catch (error: any) {
        console.error("Upload or OCR failed:", error);

        // Determine error title and message
        let errorTitle = "Upload Failed";
        let errorMessage = "There was an error uploading the document. Please try again.";

        if (error?.step === "document") {
          // Document upload/analysis error with business-friendly message
          errorTitle = "Document Processing Failed";
          errorMessage = error?.message || "We couldn't process your document. Please ensure it's a valid US or Canadian Driver's License.";
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
      }
    };

    reader.readAsDataURL(file);
  };

    if (loading && !driverLicense) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-600 rounded-full mb-4"></div>
          <p className="text-sm font-medium">Processing document...</p>
        </CardContent>
      </Card>
    );
  }

  if (driverLicense) {
      if (driverLicense.type !== "CAN_DRIVING_LICENSE" && driverLicense.type !== "US_DRIVING_LICENSE") {
      return (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-red-500">Error: Unsupported Document Type</p>
          </CardContent>
           <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Extracted Information</h3>
            <Button variant="ghost" size="sm" onClick={() => onDriverLicenseChange(null)}>
              Re-upload
            </Button>
           </div>
        </Card>
        

      );
    }
   return (
      <div>
            <img
              src={driverLicense.imageUrl}
              alt="Driver's License"
              className="w-full h-full object-cover rounded-md"
            />
      </div>

    );

  }

  // Default state: show the FileUpload control
  return (
    <FileUpload
      label={t("verify.step1")}
      onFileChange={handleDriverLicenseUpload}
      accept="image/*"
    />
    
  );
}
