import { useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { useDriverLicense } from "@/pages/context/DriverLicenseContext";

interface Document {
  type: string;
  typeConfidence: number;
  documentNumber: string;
  documentNumberConfidence: number;
  name: string;
  nameConfidence: number;
  dateOfBirth: string;
  dateOfBirthConfidence: number;
  expiryDate: string;
  expiryDateConfidence: number;
  imageUrl: string;
  country: string;
  countryConfidence: number;
  issueDate: string;
  issueDateConfidence: number;
  documentType: string;
  documentTypeConfidence: number;
  issuingAuthority: string;
  issuingAuthorityConfidence: number;
  mrz: string;
  mrzConfidence: number;
  nationality: string;
  nationalityConfidence: number;
  placeOfBirth: string;
  placeOfBirthConfidence: number;
  sex: string;
  sexConfidence: number;
}

interface PassportStepProps {
  passport: Document | null;
  onPassportChange: (passport: Document | null) => void;
}

// ← Replace this with your real upload URL
// const UPLOAD_URL = "http://localhost:2009/upload"
// const UPLOAD_URL = "https://kognitools.kognitoai.com/projects/acufi/micro/us-passport/upload"
// const UPLOAD_URL = `${import.meta.env.VITE_API_BASE_URL}/upload`;
const UPLOAD_URL = `${import.meta.env.VITE_API_BACKEND_URL}/api/v1/upload`;


export function PassportStep({ passport, onPassportChange }: PassportStepProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { setDriverLicenseData } = useDriverLicense();

  const [loading, setLoading] = useState(false);

  const getColorClass = (value: number) => {
  if (value <= 0.5) return "text-red-500";
  if (value <= 0.8) return "text-orange-500";
  return "text-green-500";
};

  const handlePassportUpload = (file: File) => {
    // Create a local base64 preview while waiting for server response
    const reader = new FileReader();
    reader.onload = () => {
      const previewBase64 = reader.result as string;

      // Build FormData and send to server
      const formData = new FormData();
      formData.append("file", file);

      setLoading(true);

      axios
        .post(UPLOAD_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((response) => {
          // Expecting server to return JSON:
          // {
          //   type: "Passport",
          //   documentNumber: "P98765432",
          //   name: "John Doe",
          //   dateOfBirth: "15/05/1985",
          //   expiryDate: "10/06/2030"
          // }
          const response_data = response.data;
          const data = JSON.parse(response_data);
          setDriverLicenseData(JSON.parse(response.data));
          const fields=data.analyzeResult.documents[0].fields;


          const newPassport: Document = {
            type: fields.CountryRegion.content+" Passport",
            typeConfidence: fields.CountryRegion.confidence,
            documentNumber: fields.DocumentNumber.content,
            documentNumberConfidence: fields.DocumentNumber.confidence,
            name: fields.FirstName.content + " " + fields.LastName.content,
            nameConfidence: fields.FirstName.confidence,
            dateOfBirth: fields.DateOfBirth.content,
            dateOfBirthConfidence: fields.DateOfBirth.confidence,
            expiryDate: fields.DateOfExpiration.content,
            expiryDateConfidence: fields.DateOfExpiration.confidence,
            imageUrl: previewBase64,
            country: fields.CountryRegion.content,
            countryConfidence: fields.CountryRegion.confidence,
            issueDate: fields.DateOfIssue.content,
            issueDateConfidence: fields.DateOfIssue.confidence,
            documentType: fields.DocumentType.content,
            documentTypeConfidence: fields.DocumentType.confidence,
            issuingAuthority: fields.IssuingAuthority.content,
            issuingAuthorityConfidence: fields.IssuingAuthority.confidence,
            mrz: fields.MachineReadableZone.content,
            mrzConfidence: fields.MachineReadableZone.confidence,
            nationality: fields.Nationality.content,
            nationalityConfidence: fields.Nationality.confidence,
            placeOfBirth: fields.PlaceOfBirth.content,
            placeOfBirthConfidence: fields.PlaceOfBirth.confidence,
            sex: fields.Sex.content,
            sexConfidence: fields.Sex.confidence,
          };

          onPassportChange(newPassport);
          toast({
            title: "Passport Uploaded",
            description: "Document data extracted successfully",
          });
        })
        .catch((error) => {
          console.error("Error uploading passport:", error);
          toast({
            title: "Upload Failed",
            description:
              "There was an error uploading or processing the document. Please try again.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    };

    reader.readAsDataURL(file);
  };

  // Show loader while waiting
  if (loading && !passport) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-600 rounded-full mb-4"></div>
          <p className="text-sm font-medium">Processing document...</p>
        </CardContent>
      </Card>
    );
  }

  // Once passport data exists, show image + extracted fields
  if (passport) {
    return (
     
     
        <div>
            <img
              src={passport.imageUrl}
              alt="Passport"
              className="w-full h-full object-cover rounded-md"
            />
      </div>

      

    );
  }

  // Default: show the FileUpload control
  return (
    <FileUpload
      label={t("verify.step2")}
      onFileChange={handlePassportUpload}
      accept="image/*"
    />
  );
}
