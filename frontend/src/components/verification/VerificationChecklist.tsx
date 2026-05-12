import { useDriverLicense } from "@/pages/context/DriverLicenseContext";
import { CheckCircledIcon, CircleIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { useEffect, useState, useCallback } from "react";

interface VerificationChecklistProps {
  phoneOtpVerified?: boolean;
}

export function VerificationChecklist({ phoneOtpVerified }: VerificationChecklistProps) {
  const [animate, setAnimate] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [data, setData] = useState([
    { label: "ID verified", key: "idVerified", value: null },
    { label: "Critical fields", key: "critical", value: null },
    { label: "Liveness check", key: "liveness", value: null },
    { label: "Live photo check", key: "photo", value: null },
    { label: "Live Phrase check", key: "phrase", value: null },
    { label: "Phone verification", key: "phone", value: null },
  ]);

  const { livenessStatus, compareResult, criticalFieldResult, phraseMatch } = useDriverLicense();

  const updateValue = useCallback((key: string, value: boolean | null) => {
    setData(prev => prev.map(item => 
      item.key === key ? { ...item, value } : item
    ));
  }, []);

  useEffect(() => {
    if (criticalFieldResult !== null) {
      updateValue("critical", criticalFieldResult);
    }
  }, [criticalFieldResult, updateValue]);

  useEffect(() => {
    if (livenessStatus !== null) {
      updateValue("liveness", livenessStatus);
    }
  }, [livenessStatus, updateValue]);

  useEffect(() => {
    if (compareResult !== null) {
      updateValue("photo", compareResult);
    }
  }, [compareResult, updateValue]);

  useEffect(() => {
    if (phraseMatch !== null) {
      updateValue("phrase", phraseMatch);
    }
  }, [phraseMatch, updateValue]);

  useEffect(() => {
    if (phoneOtpVerified !== undefined) {
      updateValue("phone", phoneOtpVerified);
    }
  }, [phoneOtpVerified, updateValue]);

  useEffect(() => {
    const allButIdVerified = data.filter(item => item.key !== 'idVerified');
    const allEvaluated = allButIdVerified.every(item => item.value !== null);
    const allPassed = allButIdVerified.every(item => item.value === true);

    if (allEvaluated) {
      setIsVerified(allPassed);
      updateValue("idVerified", allPassed);
      setAnimate(true);
    } else {
      setIsVerified(null);
      updateValue("idVerified", null);
    }
  }, [data, updateValue]);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  const getStatusIcon = (value: boolean | null) => {
    if (value === null) return <CircleIcon className="w-5 h-5 text-gray-400 opacity-50" />;
    return value ? (
      <CheckCircledIcon className={`w-5 h-5 text-green-500 ${animate ? "scale-125" : "scale-100"} transition-transform`} />
    ) : (
      <CrossCircledIcon className="w-5 h-5 text-red-500" />
    );
  };

  const getLabelClass = (value: boolean | null) => {
    if (value === null) return "text-sm font-medium text-gray-400 opacity-50";
    return "text-sm font-medium";
  };

  return (
    <div className="flex items-center justify-around gap-4">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {getStatusIcon(item.value)}
          <span className={getLabelClass(item.value)}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
