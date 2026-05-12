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

interface CriticalField {
  FieldKey: string;
  FieldLabelToDisplay: string;
  Weightage: number | null;
}

interface FieldCompactProps {
  label: string;
  value: string | number | undefined;
  confidence: number | undefined;
  inline?: boolean;
}


// Predefined fallback thresholds in case API fails
const FALLBACK_THRESHOLDS: ConfidenceThreshold[] = [
  {
    fromconfidence: 90,
    toconfidence: 100,
    colorcodetailwind: "bg-green-100",
    colorcode_hex: "#dcfce7",
    hoverDescription: "High confidence"
  },
  {
    fromconfidence: 70,
    toconfidence: 89,
    colorcodetailwind: "bg-blue-100",
    colorcode_hex: "#dbeafe",
    hoverDescription: "Medium confidence"
  },
  {
    fromconfidence: 0,
    toconfidence: 69,
    colorcodetailwind: "bg-red-100",
    colorcode_hex: "#fee2e2",
    hoverDescription: "Low confidence"
  },
  {
    fromconfidence: 0,
    toconfidence: 69,
    colorcodetailwind: "bg-yellow-100",
    colorcode_hex: "#fee2e2",
    hoverDescription: "Low confidence"
  }
];

const FieldCompact = ({ label, value, confidence, inline = true }: FieldCompactProps) => {
  const [thresholds, setThresholds] = useState<ConfidenceThreshold[]>(FALLBACK_THRESHOLDS);

  useEffect(() => {
    const loadThresholds = async () => {
      const apiThresholds = await ConfigService.getConfidenceThresholds();
      setThresholds(apiThresholds.length > 0 ? apiThresholds : FALLBACK_THRESHOLDS);
    };
    loadThresholds();
  }, []);

  const getConfidenceStyle = () => {
    if (confidence === undefined || confidence === null) {
      return {
        bgClass: "bg-gray-100",
        hoverText: "No confidence data available"
      };
    }

    // Ensure confidence is between 0-100 (handle both 0-1 and 0-100 scales)
    const confidencePercent = confidence <= 1 ? confidence * 100 : confidence;
    
    const matchedThreshold = thresholds.find(t => 
      confidencePercent >= t.fromconfidence && confidencePercent <= t.toconfidence
    );

    return {
      bgClass: matchedThreshold?.colorcodetailwind || "bg-gray-100",
      hoverText: matchedThreshold?.hoverDescription || "Confidence: " + confidencePercent.toFixed(0) + "%"
    };
  };

  const { bgClass, hoverText } = getConfidenceStyle();

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
      <span className="text-foreground dark:text-black whitespace-nowrap">{label}:</span>
      <span 
        className={`font-bold text-foreground dark:text-black text-right px-1 rounded break-words max-w-[60%] ${bgClass}`} 
        title={hoverText}
      >
        {value || "-"}
      </span>
    </div>
  );
};

export function DriverLicenseData({ data: propData, onLoaded }: { data?: any; onLoaded?: () => void } = {}) {
  // Only use context if no data prop is provided
  const driverLicenseData = propData ? undefined : useDriverLicense().driverLicenseData;
  const [criticalFields, setCriticalFields] = useState<CriticalField[]>([]);
  const verificationContext = useContext(VerificationContext);
  const sessionId = verificationContext?.sessionId;

  // Use propData if provided, else context
  const dataSource = propData || driverLicenseData;

  useEffect(() => {
    const fetchCriticalFields = async () => {
      if (!dataSource) return;
      try {
        const fields = await ConfigService.getCriticalFields(dataSource.documentType);
        setCriticalFields(fields);
        if (onLoaded) onLoaded();
      } catch (err) {
        console.error("Error fetching critical fields:", err);
        if (onLoaded) onLoaded();
      }
    };
    fetchCriticalFields();
  }, [dataSource, onLoaded]);

  if (!dataSource) return null;

  const data = dataSource.analyzeResult?.documents?.[0] || dataSource;

  return (
    <Card className="h-full flex flex-col overflow-hidden p-0" style={{backgroundColor:"#e6e6ef"}}>
      <div className="w-full px-4 pt-1 pb-1.5 border-b border-border -mt-px" style={{backgroundColor:"#e6e6ef"}}>
        <h3 className="text-[1.05rem] font-medium text-center leading-tight underline dark:text-black">
          Driver License - {dataSource.documentType === "US_DRIVING_LICENSE" ? "USA" : "CANADA"}
        </h3>
      </div>
      <CardContent className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ...criticalFields.filter(f => f.FieldKey !== "Address"),
            ...criticalFields.filter(f => f.FieldKey === "Address")
          ].map((field) => {
            const fieldData = data.fields?.[field.FieldKey];
            if (!fieldData) return null;

            return (
              <FieldCompact
                key={field.FieldKey}
                label={field.FieldLabelToDisplay}
                value={fieldData.content || fieldData.value}
                confidence={fieldData.confidence}
                inline={field.FieldKey !== "Address"}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}