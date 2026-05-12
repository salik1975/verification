import { useDriverLicense } from "@/pages/context/DriverLicenseContext";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState, useContext } from "react";
import { ConfigService } from "@/services";
import { VerificationContext } from './contexts/VerificationContext';

interface ConfidenceThreshold {
  fromconfidence: number;
  toconfidence: number;
  colorcodetailwind: string;
  colorcode_hex: string;
  hoverDescription: string;
}

interface FieldCompactProps {
  label: string;
  value: string | number | undefined;
  confidence: number | undefined;
  inline?: boolean;
}


const FieldCompact = ({ 
  label, 
  value, 
  confidence, 
  inline = true 
}: FieldCompactProps) => {
  const [thresholds, setThresholds] = useState<ConfidenceThreshold[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadThresholds = async () => {
      const data = await ConfigService.getConfidenceThresholds();
      setThresholds(data);
      setLoading(false);
    };
    loadThresholds();
  }, []);

  const getConfidenceBgClass = (): string => {
    if (confidence === undefined) return "bg-gray-100";
    
    for (const threshold of thresholds) {
      if (confidence * 100 >= threshold.fromconfidence && confidence * 100 <= threshold.toconfidence) {
        return threshold.colorcodetailwind;
      }
    }
    return "bg-gray-100";
  };

  const getHoverDescription = (): string => {
    if (confidence === undefined) return "No confidence data available";
    
    for (const threshold of thresholds) {
      if (confidence * 100 >= threshold.fromconfidence && confidence * 100 <= threshold.toconfidence) {
        return threshold.hoverDescription;
      }
    }
    return "No description available";
  };

  if (loading) {
    return (
      <div className={`flex ${inline ? 'justify-between' : 'flex-col'} items-start gap-2`}>
        <span className="text-foreground">{label}:</span>
        <span className="font-bold text-foreground px-1 rounded bg-gray-100">
          Loading...
        </span>
      </div>
    );
  }

  const bgClass = getConfidenceBgClass();
  const hoverText = getHoverDescription();

  if (!inline) {
    return (
      <div className="flex flex-col gap-1 col-span-2">
        <span className="text-foreground dark:text-black">{label}:</span>
        <span 
          className={`font-bold text-foreground dark:text-black px-1 py-0.5 rounded ${bgClass}`}
          title={hoverText}
        >
          {value || "-"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-foreground dark:text-black whitespace-nowrap ">{label}:</span>
      <span 
        className={`font-bold text-foreground dark:text-black text-right px-1 rounded break-words max-w-[60%] ${bgClass}`}
        title={hoverText}
      >
        {value || "-"}
      </span>
    </div>
  );
};

export function PassportData({ data: propData, onLoaded }: { data?: any; onLoaded?: () => void } = {}) {
  // Only use context if no data prop is provided
  const passportData = propData ? undefined : useDriverLicense().passportData;
  const dataSource = propData || passportData;

  const [criticalFields, setCriticalFields] = useState<any[]>([]);
  useEffect(() => {
    const fetchCriticalFields = async () => {
      if (!dataSource) return;
      try {
        if (onLoaded) onLoaded();
      } catch (err) {
        if (onLoaded) onLoaded();
      }
    };
    fetchCriticalFields();
  }, [dataSource, onLoaded]);

  if (!dataSource) {
    if (onLoaded) onLoaded();
    return null;
  }

  const data = dataSource.analyzeResult?.documents?.[0] || dataSource;
  const fields = data.fields;

  const newPassport = {
    type: fields.CountryRegion.content + " Passport",
    typeConfidence: fields.CountryRegion.confidence,
    documentNumber: fields.DocumentNumber.content,
    documentNumberConfidence: fields.DocumentNumber.confidence,
    name: fields.FirstName.content + " " + fields.LastName.content,
    nameConfidence: fields.FirstName.confidence,
    dateOfBirth: fields.DateOfBirth.content,
    dateOfBirthConfidence: fields.DateOfBirth.confidence,
    expiryDate: fields.DateOfExpiration.content,
    expiryDateConfidence: fields.DateOfExpiration.confidence,
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

  return (
    <Card className="h-full flex flex-col overflow-hidden  p-0" style={{backgroundColor:"#e6e6ef"}}>
      <div className="w-full px-4 pt-1 pb-1.5 border-b border-border -mt-px" style={{backgroundColor:"#e6e6ef"}}>
        <h3 className="text-[1.05rem] font-medium text-center leading-tight underline dark:text-black">
          Passport - {newPassport.country}
        </h3>
      </div>
      <CardContent className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <FieldCompact label="Document Number" value={newPassport.documentNumber} 
            confidence={newPassport.documentNumberConfidence} />
          <FieldCompact label="Full Name" value={newPassport.name} 
            confidence={newPassport.nameConfidence} />
          <FieldCompact label="Date of Birth" value={newPassport.dateOfBirth} 
            confidence={newPassport.dateOfBirthConfidence} />
          <FieldCompact label="Nationality" value={newPassport.nationality} 
            confidence={newPassport.nationalityConfidence} />
          <FieldCompact label="Place of Birth" value={newPassport.placeOfBirth} 
            confidence={newPassport.placeOfBirthConfidence} />
          <FieldCompact label="Gender" value={newPassport.sex} 
            confidence={newPassport.sexConfidence} />
          <FieldCompact label="Expiration Date" value={newPassport.expiryDate} 
            confidence={newPassport.expiryDateConfidence} />
          <FieldCompact label="Issue Date" value={newPassport.issueDate} 
            confidence={newPassport.issueDateConfidence} />
          <FieldCompact label="Issuing Authority" value={newPassport.issuingAuthority} 
            confidence={newPassport.issuingAuthorityConfidence} />
          <FieldCompact label="MRZ" value={newPassport.mrz} 
            confidence={newPassport.mrzConfidence} inline={false} />
        </div>
      </CardContent>
    </Card>
  );
}