
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot,
  InputOTPSeparator 
} from "@/components/ui/input-otp";
import { useTranslation } from "@/hooks/use-translation";

interface OtpVerificationProps {
  onVerify: (otp: string) => void;
}

export function OtpVerification({ onVerify }: OtpVerificationProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = () => {
    setIsLoading(true);
    
    // Simulate OTP verification
    setTimeout(() => {
      setIsLoading(false);
      onVerify(otp);
    }, 2000);
  };

  const handleResend = () => {
    console.log("Resend OTP");
    // In a real application, this would call an API to resend an OTP
    // For now, we'll just log it
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2 text-center">
          <h3 className="text-xl font-medium">{t("verify.otp.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("verify.otp.description")}</p>
        </div>
        
        <div className="flex justify-center py-4">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSeparator />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        
        <div className="space-y-4">
          <Button 
            className="w-full" 
            onClick={handleVerify} 
            disabled={otp.length !== 6 || isLoading}
          >
            {isLoading ? "Verifying..." : t("verify.submit")}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleResend}
          >
            {t("verify.otp.resend")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
