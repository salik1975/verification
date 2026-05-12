import { useState, useEffect } from "react";
import { Upload, Video, CheckCircle2, FileText, Shield, Camera, Eye, Phone, Mail, AlertTriangle } from "lucide-react";
import { HiOutlineIdentification } from "react-icons/hi";
import { MdOutlineFace6 } from "react-icons/md";
import { FaRegIdBadge } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { ProgressStep } from "@/components/verification/ProgressStep";
import { RequirementItem } from "@/components/verification/RequirementItem";
import { ComparisonStep } from "@/components/verification/ComparisonStep";
import { PassportStep } from "@/components/verification/PassportStep";
import { DriverLicenseData } from "@/components/DriverLicenseData";
import { PassportData } from "@/components/PassportData";
import { DocumentPrompt } from "@/components/verification/DocumentPrompt";
import { FaceRecognition } from "@/components/FaceRecognition";
import { VideoCapture } from "@/components/VideoCapture";
import { VerificationService, SubscriptionLimitResponse } from "@/services/verificationService";
import { useDriverLicense } from "../context/DriverLicenseContext";
import { useDocumentType } from "../context/DocumentTypeContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { Input } from "@/components/ui/input";
import { sendOTP, verifyOTP, sendEmailOTP, verifyEmailOTP } from "@/services/otpService";
import { getVerificationConfig, VerificationConfig } from "@/services/verificationConfigService";
import { useAuth } from "@/components/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const VerificationContent = () => {
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const { criticalFieldResult, livenessStatus, compareResult, phraseMatch, idFaceExtracted, driverLicenseData, videoFace, passportData, resultData } = useDriverLicense();
  const { selectedDocumentTypeId } = useDocumentType();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [type, setType] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoButton, setVideoButton] = useState(true);
  const [livenessPhrase, setLivenessPhrase] = useState<string>("");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneOtpVerified, setPhoneOtpVerified] = useState<boolean | null>(null);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [email, setEmail] = useState('');
  const [emailOtpVerified, setEmailOtpVerified] = useState<boolean | null>(null);
  const [hasPostedLog, setHasPostedLog] = useState(false);
  const [postedSessionId, setPostedSessionId] = useState<string | null>(null);
  const [identityValidated, setIdentityValidated] = useState<boolean | null>(null);
  const [verificationConfig, setVerificationConfig] = useState<VerificationConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [subscriptionLimit, setSubscriptionLimit] = useState<SubscriptionLimitResponse | null>(null);
  const [subscriptionLimitExceeded, setSubscriptionLimitExceeded] = useState(false);

  // New OTP countdown states
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isPhoneOtpSending, setIsPhoneOtpSending] = useState(false);
  const [isEmailOtpSending, setIsEmailOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);

  const handlePassportTypeChange = (type: string) => {
    setType(type);
  };
  const handlePassportImageUrlChange = (url: string) => {
    setImageUrl(url);
    setDocumentUploaded(true);
  };
  const handleSetVideoButton = (val: boolean) => {
    setVideoButton(val);
  };

  const handleVideoCapture = (blob: Blob) => {
    setVideoBlob(blob);
    toast({
      title: t("verify.video.captured"),
      description: t("verify.video.recorded"),
    });
  };

  // Show toast notification when face verification fails (not liveness)
  useEffect(() => {
    // Only show face verification failure toast if:
    // 1. compareResult is false (verification failed)
    // 2. livenessStatus is true (liveness passed - this means it's a face match failure, not liveness failure)
    // 3. We have result data (actual face verification was attempted)
    if (compareResult === false && livenessStatus === true && resultData && resultData.length > 0) {
      // Check if the first result has a failure_reason (from microservice)
      const failureReason = resultData[0]?.failure_reason;
      const errorMessage = failureReason || "The face in your video does not match your ID photo. Please ensure you are using your own ID and try again.";

      toast({
        variant: "destructive",
        title: "Face Verification Failed",
        description: errorMessage,
      });
    }
  }, [compareResult, livenessStatus, resultData, toast]);

  const handlePhoneOtpSend = async () => {
    try {
      if (!phoneNumber.trim() || phoneNumber.length !== 10) {
        toast({
          title: t("verify.phone.invalid"),
          description: t("verify.phone.invalid_desc"),
          variant: "destructive",
        });
        return;
      }

      setIsPhoneOtpSending(true);
      await sendOTP({
        phone_number: phoneNumber,
        country_code: countryCode,
      });

      setPhoneOtpSent(true);
      setPhoneOtpVerified(null);
      setOtpCountdown(120); // 2 minutes countdown
      toast({
        title: t("verify.otp.sent"),
        description: t("verify.otp.sent_desc"),
      });
    } catch (error: any) {
      toast({
        title: t("verify.otp.failed"),
        description: error.message || t("verify.otp.failed_desc"),
        variant: "destructive",
      });
    } finally {
      setIsPhoneOtpSending(false);
    }
  };

  const handlePhoneOtpVerify = async () => {
    try {
      if (!phoneOtp.trim() || phoneOtp.length !== 6) {
        toast({
          title: t("verify.otp.invalid"),
          description: t("verify.otp.invalid_desc"),
          variant: "destructive",
        });
        return;
      }

      setIsOtpVerifying(true);
      await verifyOTP({
        phone_number: phoneNumber,
        country_code: countryCode,
        otp: phoneOtp,
      });

      setPhoneOtpVerified(true);
      setOtpCountdown(0); // Reset countdown on successful verification
      toast({
        title: t("verify.otp.verified"),
        description: t("verify.otp.verified_desc"),
      });
    } catch (error: any) {
      setPhoneOtpVerified(false);
      toast({
        title: t("verify.otp.verification_failed"),
        description: error.message || t("verify.otp.verification_failed_desc"),
        variant: "destructive",
      });
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(digitsOnly);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setPhoneOtp(digitsOnly);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleEmailOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setEmailOtp(digitsOnly);
  };

  const handleEmailOtpSend = async () => {
    try {
      if (!email.trim() || !email.includes('@')) {
        toast({
          title: t("verify.email.invalid"),
          description: t("verify.email.invalid_desc"),
          variant: "destructive",
        });
        return;
      }

      setIsEmailOtpSending(true);
      await sendEmailOTP({
        email: email.trim(),
      });

      setEmailOtpSent(true);
      setEmailOtpVerified(null);
      setOtpCountdown(120); // 2 minutes countdown
      toast({
        title: t("verify.email.otp.sent"),
        description: t("verify.email.otp.sent_desc"),
      });
    } catch (error: any) {
      toast({
        title: t("verify.email.otp.failed"),
        description: error.message || t("verify.email.otp.failed_desc"),
        variant: "destructive",
      });
    } finally {
      setIsEmailOtpSending(false);
    }
  };

  const handleEmailOtpVerify = async () => {
    try {
      if (!emailOtp.trim() || emailOtp.length !== 6) {
        toast({
          title: t("verify.otp.invalid"),
          description: t("verify.otp.invalid_desc"),
          variant: "destructive",
        });
        return;
      }

      setIsOtpVerifying(true);
      await verifyEmailOTP({
        email: email.trim(),
        otp: emailOtp.trim(),
      });

      setEmailOtpVerified(true);
      setOtpCountdown(0); // Reset countdown on successful verification
      toast({
        title: t("verify.email.otp.verified"),
        description: t("verify.email.otp.verified_desc"),
      });
    } catch (error: any) {
      setEmailOtpVerified(false);
      toast({
        title: t("verify.email.otp.verification_failed"),
        description: error.message || t("verify.email.otp.verification_failed_desc"),
        variant: "destructive",
      });
    } finally {
      setIsOtpVerifying(false);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [otpCountdown]);

  // Helper function to format countdown
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Load verification configuration and check subscription limit on component mount
  useEffect(() => {
    const loadVerificationConfig = async () => {
      try {
        setConfigLoading(true);
        const response = await getVerificationConfig();
        if (response.success && response.data) {
          setVerificationConfig(response.data);
        } else {
          console.error('Failed to load verification configuration');
          toast({
            title: t("verify.config.error"),
            description: t("verify.config.error_desc"),
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error loading verification configuration:', error);
        toast({
          title: t("verify.config.error"),
          description: t("verify.config.error_desc"),
          variant: "destructive",
        });
      } finally {
        setConfigLoading(false);
      }
    };

    const checkSubscriptionLimit = async () => {
      if (!user?.user_id) return;

      try {
        const limitResponse = await VerificationService.checkSubscriptionLimit(user.user_id);
        setSubscriptionLimit(limitResponse);

        if (!limitResponse.allowed) {
          setSubscriptionLimitExceeded(true);
          toast({
            title: "Subscription Limit Reached",
            description: limitResponse.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error checking subscription limit:', error);
        // Don't block verification if check fails, let backend handle it
      }
    };

    loadVerificationConfig();
    checkSubscriptionLimit();
  }, [toast, user?.user_id]);

  // Verification logic - dynamic based on enabled features
  useEffect(() => {
    if (configLoading || !verificationConfig) {
      return; // Wait for configuration to load
    }

    // Build dynamic verification checks based on enabled features
    const enabledChecks: { [key: string]: boolean | null } = {};
    const enabledCheckResults: (boolean | null)[] = [];
    
    // Document upload and critical fields check
    if (verificationConfig.ENABLE_DOCUMENT_UPLOAD?.value) {
      enabledChecks.DocumentVerification = criticalFieldResult;
      enabledCheckResults.push(criticalFieldResult);
    }
    
    // Critical fields check (separate from document upload)
    if (verificationConfig.ENABLE_CRITICAL_FIELDS_CHECK?.value) {
      enabledChecks.CriticalFieldsVerification = criticalFieldResult;
      enabledCheckResults.push(criticalFieldResult);
    }
    
    // Liveness check
    if (verificationConfig.ENABLE_LIVENESS_CHECK?.value) {
      enabledChecks.LivenessVerification = livenessStatus;
      enabledCheckResults.push(livenessStatus);
    }
    
    // Video face capture
    if (verificationConfig.ENABLE_VIDEO_FACE?.value) {
      enabledChecks.VideoFaceVerification = livenessStatus;
      enabledCheckResults.push(livenessStatus);
    }
    
    // Face match
    if (verificationConfig.ENABLE_FACE_MATCH?.value) {
      enabledChecks.PhotoVerification = compareResult;
      enabledCheckResults.push(compareResult);
    }
    
    // Live phrase verification
    if (verificationConfig.ENABLE_LIVE_PHRASE?.value) {
      enabledChecks.LivePhraseVerification = phraseMatch;
      enabledCheckResults.push(phraseMatch);
    }
    
    // Phrase verification
    if (verificationConfig.ENABLE_PHRASE_VERIFICATION?.value) {
      enabledChecks.PhraseVerification = phraseMatch;
      enabledCheckResults.push(phraseMatch);
    }
    
    // OTP verification - use OR logic: either phone OR email passing is enough
    const phoneOtpEnabled = verificationConfig.ENABLE_PHONE_OTP?.value;
    const emailOtpEnabled = verificationConfig.ENABLE_EMAIL_OTP?.value;
    const otpEnabled = verificationConfig.ENABLE_OTP_VERIFICATION?.value;

    if (otpEnabled || phoneOtpEnabled || emailOtpEnabled) {
      // Track the actual verification results for logging purposes
      if (phoneOtpEnabled || otpEnabled) {
        enabledChecks.PhoneVerification = phoneOtpVerified;
      }
      if (emailOtpEnabled || otpEnabled) {
        enabledChecks.EmailVerification = emailOtpVerified;
      }

      // For the overall check, use OR logic: either one passing is enough
      // If neither has been attempted (both null), result is null (pending)
      // If either one passed, result is true (passed)
      // If both were attempted and both failed, result is false (failed)
      const atLeastOnePassed = phoneOtpVerified === true || emailOtpVerified === true;
      const bothPending = phoneOtpVerified === null && emailOtpVerified === null;
      const bothFailed = phoneOtpVerified === false && emailOtpVerified === false;

      // Only mark as failed if both were attempted and failed
      // Otherwise, if at least one passed, it's success
      // If neither attempted yet, it's pending (null)
      let otpOverallResult: boolean | null;
      if (atLeastOnePassed) {
        otpOverallResult = true;
      } else if (bothPending) {
        otpOverallResult = null;
      } else if (bothFailed) {
        otpOverallResult = false;
      } else {
        // One is null (not attempted) and the other is false (failed)
        // Keep it pending until either one passes or user gives up
        otpOverallResult = null;
      }

      enabledCheckResults.push(otpOverallResult);
    }

    // If no features are enabled, default to true
    if (enabledCheckResults.length === 0) {
      setIdentityValidated(true);
      return;
    }

    const allPassed = enabledCheckResults.every(result => result === true);
    const allEvaluated = enabledCheckResults.every(result => result !== null && result !== undefined);

    if (allEvaluated) {
      setIdentityValidated(allPassed);

      if (!hasPostedLog) {
        // First time posting the verification log
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

        // Generate a SessionID for this verification
        const sessionId = crypto.randomUUID();

        const payload = {
          SessionID: sessionId,
          DocumentTypeID: documentTypeId,
          ExtractedName: extractedName,
          ExtractedDocNumber: extractedDocNumber,
          ExtractedInfoJson: extractedInfoJson,
          ...enabledChecks, // Only include enabled verification checks
          FaceSnapshotsJson: videoFace ? JSON.stringify(videoFace) : undefined,
          FinalVerification: allPassed,
          CreatedOn: new Date().toISOString(),
          CreatedBy: user?.username || "frontend",
          LastModifiedOn: new Date().toISOString(),
          LastModifiedBy: user?.username || "frontend",
          IsActive: true,
          UserID: user?.user_id || null
        };
        VerificationService.postVerificationLog(payload)
          .then(response => {
            // Store the SessionID so we can update this record later
            setPostedSessionId(sessionId);
          })
          .catch(async (error: Error & { status?: number }) => {
            console.error('Failed to send verification log:', error);
            if (error.status === 402) {
              setSubscriptionLimitExceeded(true);
              if (user?.user_id) {
                try {
                  const limitResponse = await VerificationService.checkSubscriptionLimit(user.user_id);
                  setSubscriptionLimit(limitResponse);
                } catch (e) {
                }
              }
              toast({
                title: "Subscription Limit Reached",
                description: error.message || "You have reached your subscription limit. Please upgrade to continue.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Error",
                description: "Failed to save verification result. Please try again.",
                variant: "destructive",
              });
            }
          });
        setHasPostedLog(true);
      } else if (postedSessionId) {
        // Already posted a log, but user may have completed another OTP type
        // Update the existing log with the new OTP verification results
        const updatePayload: { [key: string]: any } = {
          LastModifiedOn: new Date().toISOString(),
          LastModifiedBy: user?.username || "frontend",
        };

        // Update PhoneVerification if it changed
        if (enabledChecks.PhoneVerification !== undefined) {
          updatePayload.PhoneVerification = enabledChecks.PhoneVerification;
        }
        // Update EmailVerification if it changed
        if (enabledChecks.EmailVerification !== undefined) {
          updatePayload.EmailVerification = enabledChecks.EmailVerification;
        }
        // Update FinalVerification
        updatePayload.FinalVerification = allPassed;

        VerificationService.updateVerificationLog(postedSessionId, updatePayload)
          .then(response => {
            // Log updated successfully
          })
          .catch(error => {
            console.error('Failed to update verification log:', error);
          });
      }
    } else {
      setIdentityValidated(null);
      // Don't reset hasPostedLog - once posted, we update instead of creating new
    }
  }, [criticalFieldResult, livenessStatus, compareResult, phraseMatch, phoneOtpVerified, emailOtpVerified, driverLicenseData, videoFace, selectedDocumentTypeId, hasPostedLog, postedSessionId, passportData, resultData, verificationConfig, configLoading, user]);

  if (configLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("verify.loading")}</p>
        </div>
      </div>
    );
  }

  if (subscriptionLimitExceeded && subscriptionLimit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Subscription Limit Reached</AlertTitle>
            <AlertDescription className="mt-2">
              {subscriptionLimit.message}
            </AlertDescription>
          </Alert>

          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="text-4xl font-bold text-destructive">{subscriptionLimit.reports_used ?? 0}</div>
              <div className="text-sm text-muted-foreground">of {subscriptionLimit.max_reports ?? 'N/A'} reports used</div>
            </div>

            {subscriptionLimit.max_reports && (
              <div className="w-full bg-muted rounded-full h-3 mb-4">
                <div
                  className="bg-destructive h-3 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            )}

            <p className="text-muted-foreground mb-6">
              You have reached your subscription limit. Please upgrade your subscription or contact your administrator to continue using identity verification.
            </p>

            <Button
              onClick={() => window.location.href = '/usage-dashboard'}
              className="w-full"
            >
              View Subscription Details
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Subscription Warning Banner */}
      {subscriptionLimit && subscriptionLimit.remaining !== null && subscriptionLimit.remaining <= 10 && subscriptionLimit.remaining > 0 && (
        <Alert className="mx-6 mt-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">Low on Reports</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            You have {subscriptionLimit.remaining} verification reports remaining in your subscription.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="bg-accent text-accent-foreground px-6 py-6 rounded-lg mr-6 mt-4">
        <div className="flex justify-between items-start">
          <div>
                      <h1 className="text-2xl font-semibold mb-2 text-white">{t("verify.title")}</h1>
          <p className="text-white">{t("verify.description")}</p>
          </div>
          <Button variant="secondary" className="bg-gray-600 hover:bg-gray-500 text-white border-0">
            Submit Log
          </Button>
        </div>

        {/* Progress Steps - Dynamic based on enabled features */}
        <div className="mt-8 bg-card rounded-lg p-6 mb-[-4rem]">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            {/* Document Scanned - only if document upload is enabled */}
            {verificationConfig?.ENABLE_DOCUMENT_UPLOAD?.value && (
              <ProgressStep icon={CheckCircle2} title={t("verify.document.scanned")} completed={documentUploaded} />
            )}

            {/* ID Face Extracted - only if face-related features are enabled */}
            {(verificationConfig?.ENABLE_FACE_MATCH?.value ||
              verificationConfig?.ENABLE_LIVENESS_CHECK?.value ||
              verificationConfig?.ENABLE_VIDEO_FACE?.value) && (
              <ProgressStep icon={CheckCircle2} title={t("verify.id.face.extracted")} completed={idFaceExtracted} />
            )}

            {/* Face Matched - only if face match or liveness is enabled */}
            {(verificationConfig?.ENABLE_FACE_MATCH?.value ||
              verificationConfig?.ENABLE_LIVENESS_CHECK?.value) && (
              <ProgressStep icon={CheckCircle2} title={t("verify.face.matched")} completed={compareResult} failed={compareResult === false} />
            )}

            {/* OTP Verified - only if OTP verification is enabled (and no document features) */}
            {verificationConfig?.ENABLE_OTP_VERIFICATION?.value &&
             !verificationConfig?.ENABLE_DOCUMENT_UPLOAD?.value && (
              <ProgressStep icon={CheckCircle2} title={t("verify.otp.verified") || "OTP Verified"} completed={phoneOtpVerified || emailOtpVerified} />
            )}

            {/* Identity Validated - always shown as final step */}
            <ProgressStep
              icon={CheckCircle2}
              title={t("verify.identity.validated")}
              completed={identityValidated === true}
              failed={identityValidated === false}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 mt-8 mr-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto border border-border rounded-lg p-6 bg-card">
          
          {/* Show message if no verification features are enabled */}
          {!verificationConfig?.ENABLE_DOCUMENT_UPLOAD?.value && 
           !verificationConfig?.ENABLE_LIVENESS_CHECK?.value && 
           !verificationConfig?.ENABLE_FACE_MATCH?.value && 
           !verificationConfig?.ENABLE_PHRASE_VERIFICATION?.value && 
           !verificationConfig?.ENABLE_OTP_VERIFICATION?.value && 
           !verificationConfig?.ENABLE_CRITICAL_FIELDS_CHECK?.value && 
           !verificationConfig?.ENABLE_VIDEO_FACE?.value && 
           !verificationConfig?.ENABLE_LIVE_PHRASE?.value && (
            <div className="col-span-2 text-center py-12">
              <div className="text-muted-foreground">
                <h3 className="text-lg font-medium mb-2">{t("verify.no.features")}</h3>
                <p>All verification features are currently disabled. Please enable at least one verification method in the configuration.</p>
              </div>
            </div>
          )}
          
          {/* Step 1: Verify Document ID */}
          {verificationConfig?.ENABLE_DOCUMENT_UPLOAD?.value && (
            <div className="border border-border rounded-lg p-4 h-fit">
              <div className="flex items-center gap-3 mb-4">
                <HiOutlineIdentification className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-bold text-foreground">{t("verify.step1.title")}</h2>
              </div>
              <div className="border-b border-border mb-4 -mx-4 px-4"></div>
              <PassportStep
                passport={imageUrl}
                onTypeChange={handlePassportTypeChange}
                onImageUrlChange={handlePassportImageUrlChange}
                onSetVideoButton={handleSetVideoButton}
                onPhraseExtracted={setLivenessPhrase}
              />

              {documentUploaded && (
                <div className="mt-6">
                  {type === "driving_license" && <DriverLicenseData />}
                  {type === "passport" && <PassportData />}
                  {(!type || (type !== "driving_license" && type !== "passport")) && <DocumentPrompt />}
                </div>
              )}

              {!documentUploaded && (
                <div className="mt-6">
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {t("verify.requirements.title")}
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <RequirementItem text={t("verify.requirements.clear")} />
                      <RequirementItem text={t("verify.requirements.corners")} />
                      <RequirementItem text={t("verify.requirements.no_glare")} />
                      <RequirementItem text={t("verify.requirements.valid")} />
                    </div>
                  </div>
                </div>
              )}


            </div>
          )}

          {/* Step 2: ID Face Verification */}
          {(verificationConfig?.ENABLE_LIVENESS_CHECK?.value || 
            verificationConfig?.ENABLE_FACE_MATCH?.value || 
            verificationConfig?.ENABLE_PHRASE_VERIFICATION?.value ||
            verificationConfig?.ENABLE_VIDEO_FACE?.value) && (
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <MdOutlineFace6 className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-bold text-foreground">{t("verify.step2.title")}</h2>
              </div>
              <div className="border-b border-border mb-4 -mx-4 px-4"></div>
              
              {/* Video Capture - only if liveness check or video face is enabled */}
              {(verificationConfig?.ENABLE_LIVENESS_CHECK?.value || verificationConfig?.ENABLE_VIDEO_FACE?.value) && (
                <VideoCapture
                  promptText={livenessPhrase || t("verify.face.verification.desc")}
                  onCaptureComplete={handleVideoCapture}
                  videoButton={videoButton}
                />
              )}

              {/* Face Recognition - only if face match is enabled */}
              {verificationConfig?.ENABLE_FACE_MATCH?.value && documentUploaded && idFaceExtracted && (
                <div className="mt-6">
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      {t("verify.face.comparison.title")}
                    </h3>
                    <FaceRecognition />
                  </div>
                </div>
              )}

              {/* Face Comparison Analysis */}
              <div className="mt-6">
                <div className="border border-border rounded-lg p-6 bg-card">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    {t("verify.face.analysis.title")}
                  </h3>
                  <div className="flex justify-between items-center mt-4">
                    {verificationConfig?.ENABLE_DOCUMENT_UPLOAD?.value && (
                      <ComparisonStep title={t("verify.id.photo.extraction.title")} completed={idFaceExtracted} />
                    )}
                    {(verificationConfig?.ENABLE_LIVENESS_CHECK?.value || verificationConfig?.ENABLE_VIDEO_FACE?.value) && (
                      <ComparisonStep title={t("verify.liveness.detection.title")} completed={compareResult} failed={compareResult === false} />
                    )}
                    {(verificationConfig?.ENABLE_PHRASE_VERIFICATION?.value || verificationConfig?.ENABLE_LIVE_PHRASE?.value) && (
                      <ComparisonStep title={t("verify.live.phrase.check.title")} completed={phraseMatch} failed={phraseMatch === false} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact Verification */}
          {verificationConfig?.ENABLE_OTP_VERIFICATION?.value && (
            <div className="col-span-2 border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <FaRegIdBadge className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-bold text-foreground">{t("verify.step3.title")}</h2>
              </div>
              <div className="border-b border-border mb-4 -mx-4 px-4"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone Verification */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium text-foreground mb-4">{t("verify.phone.verification")}</h3>
                  {!phoneOtpSent ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <select
                          className="border-2 border-gray-300 rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                        >
                          <option value="+1">🇺🇸 USA (+1)</option>
                          <option value="+1">🇨🇦 Canada (+1)</option>
                          <option value="+91">🇮🇳 India (+91)</option>
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            type="tel"
                            placeholder="Enter Your Phone Number"
                            value={phoneNumber}
                            onChange={handlePhoneNumberChange}
                            className="pl-10 shadow-md"
                          />
                        </div>
                        <Button
                          onClick={handlePhoneOtpSend}
                          disabled={!phoneNumber.trim() || phoneNumber.length !== 10 || isPhoneOtpSending}
                          className="shadow-md"
                        >
                          {isPhoneOtpSending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : !phoneOtpVerified ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <select
                          className="border-2 border-gray-300 rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                          value={countryCode}
                          disabled
                        >
                          <option value="+1">🇺🇸 USA (+1)</option>
                          <option value="+1">🇨🇦 Canada (+1)</option>
                          <option value="+91">🇮🇳 India (+91)</option>
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            type="tel"
                            placeholder="Enter Your Phone Number"
                            value={phoneNumber}
                            disabled
                            className="pl-10 shadow-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Input
                          type="text"
                          placeholder={t("verify.otp.placeholder")}
                          value={phoneOtp}
                          onChange={handleOtpChange}
                          className="shadow-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handlePhoneOtpVerify}
                          disabled={!phoneOtp.trim() || phoneOtp.length !== 6 || isOtpVerifying}
                          className="flex-1 shadow-md"
                        >
                          {isOtpVerifying ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Verifying...
                            </>
                          ) : (
                            t("verify.verify.otp")
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPhoneOtpSent(false);
                            setPhoneOtp('');
                            setOtpCountdown(0);
                            setPhoneOtpVerified(null);
                          }}
                          className="flex-1 shadow-md"
                        >
                          Back
                        </Button>
                      </div>
                      {/* Resend OTP section */}
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">
                          Didn't receive the code?
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePhoneOtpSend}
                          disabled={otpCountdown > 0 || isPhoneOtpSending}
                          className="shadow-md"
                        >
                          {otpCountdown > 0 ? (
                            `Resend in ${formatCountdown(otpCountdown)}`
                          ) : (
                            t("verify.resend.otp")
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{t("verify.verification.completed")}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Phone: {countryCode} {phoneNumber}
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Verification */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium text-foreground mb-4">{t("verify.email.verification")}</h3>
                  {!emailOtpSent ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            type="email"
                            placeholder={t("verify.email.placeholder")}
                            value={email}
                            onChange={handleEmailChange}
                            className="pl-10 shadow-md"
                          />
                        </div>
                        <Button
                          onClick={handleEmailOtpSend}
                          disabled={!email.trim() || !email.includes('@') || isEmailOtpSending}
                          className="shadow-md"
                        >
                          {isEmailOtpSending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            t("verify.send.otp")
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : !emailOtpVerified ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="email"
                          placeholder="Enter Your Email"
                          value={email}
                          disabled
                          className="pl-10 shadow-sm"
                        />
                      </div>
                      <div className="flex justify-center">
                        <Input
                          type="text"
                          placeholder="Enter Email OTP"
                          value={emailOtp}
                          onChange={handleEmailOtpChange}
                          className="shadow-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleEmailOtpVerify}
                          disabled={!emailOtp.trim() || emailOtp.length !== 6 || isOtpVerifying}
                          className="flex-1 shadow-md"
                        >
                          {isOtpVerifying ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Verifying...
                            </>
                          ) : (
                            "Verify"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEmailOtpSent(false);
                            setEmailOtp('');
                            setOtpCountdown(0);
                            setEmailOtpVerified(null);
                          }}
                          className="flex-1 shadow-md"
                        >
                          Back
                        </Button>
                      </div>
                      {/* Resend OTP section */}
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">
                          Didn't receive the code?
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEmailOtpSend}
                          disabled={otpCountdown > 0 || isEmailOtpSending}
                          className="shadow-md"
                        >
                          {otpCountdown > 0 ? (
                            `Resend in ${formatCountdown(otpCountdown)}`
                          ) : (
                            "Resend OTP"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Email verification completed!</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Email: {email}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
