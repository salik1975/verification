import React from "react";
import { VerificationProvider } from "@/components/contexts/VerificationContext";
import { DriverLicenseProvider } from "./context/DriverLicenseContext";
import { VerificationContent } from "./verification/VerificationContent";

const Verification = () => {
  return (
    <VerificationProvider>
      <DriverLicenseProvider>
        <VerificationContent />
      </DriverLicenseProvider>
    </VerificationProvider>
  );
};

export default Verification;
