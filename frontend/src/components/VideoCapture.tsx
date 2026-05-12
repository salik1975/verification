import React, { useRef, useState, useEffect, useCallback, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useVideoRecording } from "@/hooks/useVideoRecording";
import { CameraAccess } from "./video/CameraAccess";
import { VerificationContext } from './contexts/VerificationContext';
import { useDriverLicense } from "@/pages/context/DriverLicenseContext";
import { verifyFaceImages } from "./verifyFaceImages";
import { useAppearance } from "@/components/contexts/AppearanceContext";
import { useToast } from "@/hooks/use-toast";

interface VideoCaptureProps {
  promptText: string;
  onCaptureComplete: (videoBlob: Blob) => void;
  onPhotoCapture?: (photoDataUrl: string) => void;
  videoButton: boolean;
  onLivenessStart?: () => void;
}

// LivenessPhraseModal component (moved here)
function LivenessPhraseModal({ phrase }: { phrase: string }) {
  const { appearance } = useAppearance();
  const { t } = useTranslation();
  
  // Add shake animation styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0) scale(1); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px) scale(1.02); }
        20%, 40%, 60%, 80% { transform: translateX(2px) scale(1.02); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return (
    <div className="fixed top-16 left-0 w-full flex justify-center z-50 pointer-events-none" style={{ paddingLeft: '280px' }}>
      <div 
        className="bg-white/90 dark:bg-gray-900/90 shadow-lg rounded-lg px-12 py-6 max-w-2xl text-center pointer-events-auto animate-pulse"
        style={{
          border: `4px solid #ef4444`,
          boxShadow: `0 6px 25px rgba(239, 68, 68, 0.4)`,
          animation: 'shake 2s ease-in-out infinite',
        }}
      >
        <div className="flex flex-col items-center">
          <span className="font-medium mb-3 text-gray-700 dark:text-gray-200 text-lg">{t("verify.video.please.repeat")}</span>
          <span 
            className="font-bold text-2xl mb-3"
            style={{ color: appearance.primaryColor }}
          >
            "{phrase}"
          </span>
          <span className="font-semibold text-green-600 text-lg">{t("verify.video.read.aloud")}</span>
        </div>
      </div>
    </div>
  );
}

// Simple horizontal progress bar for countdown
function HorizontalCountdownBar({ progress, color }) {
  const remaining = 1 - progress; // 1 = full, 0 = empty

  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${remaining * 100}%`,
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}80`,
        }}
      />
    </div>
  );
}

export function VideoCapture({ promptText, onCaptureComplete, onPhotoCapture, videoButton }: VideoCaptureProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    stream,
    error,
    isLoadingCamera,
    videoRef,
    startCamera,
    resetCapture,
    isRecording,
    countdown,
  } = useVideoRecording();

  const [recordingCountdown, setRecordingCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const livenessStartedRef = useRef(false);

  const verificationContext = useContext(VerificationContext);
  const sessionId = verificationContext?.sessionId;

  const guidanceMessages = [
    t("verify.video.face.camera"),
    t("verify.video.turn.left.right"),
    t("verify.video.nod.up.down"),
    t("verify.video.return.center")
  ];
  const [guidanceStep, setGuidanceStep] = useState(0);

  const [livenessVerified, setLivenessVerified] = useState(false);
  const [checkingLiveness, setCheckingLiveness] = useState(false);
  const [livenessError, setLivenessError] = useState<string | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);

  const { setLivenessStatus, setVideoFace, idFace, setResultData, setCompareResult, setcriticalFieldResult, setPhraseMatch, driverLicenseData, passportData } = useDriverLicense();

  const countdownProgress = recordingCountdown !== null ? ((10 - recordingCountdown) / 10) * 100 : 0;

  // Function to extract user name from document data
  const extractUserName = useCallback(() => {
    const dataSource = passportData || driverLicenseData;
    if (!dataSource?.analyzeResult?.documents?.[0]?.fields) return null;
    
    const fields = dataSource.analyzeResult.documents[0].fields;
    
    // Try different field combinations for name
    if (fields.FirstName?.content && fields.LastName?.content) {
      return `${fields.FirstName.content} ${fields.LastName.content}`;
    }
    if (fields.name?.content) {
      return fields.name.content;
    }
    if (fields.Name?.content) {
      return fields.Name.content;
    }
    return null;
  }, [passportData, driverLicenseData]);

  // Function to call verify_phrase endpoint
  const callVerifyPhrase = useCallback(async (userName: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BACKEND_URL}/api/v1/verify_phrase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          session_id: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set verify phrase: ${response.status}`);
      }

      const data = await response.json();
      return data.phrase;
    } catch (error) {
      console.error('Error setting verify phrase:', error);
      return null;
    }
  }, [sessionId]);

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video?.srcObject) {
      const tracks = (video.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    }
  }, [videoRef]);

  const checkLiveness = useCallback(() => {
    if (!stream) return;

    recordedChunksRef.current = [];
    let options = {};
    if (window.MediaRecorder && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      options = { mimeType: 'video/webm;codecs=vp8' };
    } else if (window.MediaRecorder && MediaRecorder.isTypeSupported('video/webm')) {
      options = { mimeType: 'video/webm' };
    } else {
      options = {};
    }
    const recorder = new MediaRecorder(stream, options);
    recorderRef.current = recorder;
    setRecordingCountdown(10);

    let guidanceStepIndex = 0;
    setGuidanceStep(guidanceStepIndex);
    const guidanceTimer = setInterval(() => {
      guidanceStepIndex++;
      setGuidanceStep(guidanceStepIndex);
      if (guidanceStepIndex >= guidanceMessages.length) clearInterval(guidanceTimer);
    }, 2500);

    recorder.ondataavailable = e => {
      if (e.data.size) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setCheckingLiveness(true);
      setRecordingCountdown(null);

      // Freeze last frame
      try {
        const video = videoRef.current;
        if (video && video.srcObject) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setLastFrameUrl(canvas.toDataURL('image/png'));
          }
        }
      } catch (e) {
        setLastFrameUrl(null);
      }

      // Extract user name and set verify phrase before liveness check
      const userName = extractUserName();

      if (userName) {
        const phraseResult = await callVerifyPhrase(userName);
      }

      // Wait a bit to ensure all chunks are collected
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Validate blob size before sending
      if (recordedChunksRef.current.length === 0) {
        setLivenessError("No video data recorded. Please try again.");
        setCheckingLiveness(false);
        return;
      }

      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      
      // Validate blob size (minimum 1KB)
      if (blob.size < 1024) {
        setLivenessError("Video file is too small. Please try again.");
        setCheckingLiveness(false);
        return;
      }

      const formData = new FormData();
      formData.append('video', blob, 'liveness.webm'); // Always use this filename
      if (sessionId) formData.append('session_id', sessionId);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`${import.meta.env.VITE_API_BACKEND_URL}/api/v1/api/liveness`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Liveness failed (${res.status}): ${await res.text()}`);

        const json = await res.json();
        if (json.success) {
          setLivenessStatus(true);
          setLivenessVerified(true);
          setLivenessError(null);
          setVideoFace(json.initial_frame_data);
          setPhraseMatch(json.phrase_match);

          const base64Images = [idFace, ...json.initial_frame_data.slice(0, 3)];
          verifyFaceImages(base64Images).then(result => {
           if (result && Array.isArray(result.results)) {
              setResultData(result.results);
              const allVerified = result.results.every(r => r.verified);
              setCompareResult(allVerified);
              // Toast is shown in VerificationContent.tsx
            } else {
              setCompareResult(false);
              setResultData([]);
              // Toast is shown in VerificationContent.tsx
            }
          }).catch(err => {
            setCompareResult(false);
            setResultData([]);
            // Toast is shown in VerificationContent.tsx
          });
        } else {
          setLivenessStatus(false);
          setCompareResult(false);

          // IMPORTANT: Update phrase match status even when liveness fails
          setPhraseMatch(json.phrase_match || false);

          // Extract failure reasons from response
          const failureReasons = json.failure_reasons || [];
          const errorMessage = failureReasons.length > 0
            ? failureReasons.join('. ') + '.'
            : t("verify.video.liveness.failed");

          setLivenessError(errorMessage);

          // Show toast notification with specific failure reasons
          toast({
            variant: "destructive",
            title: t("verify.video.liveness.failed"),
            description: errorMessage,
          });
        }

        stopCamera();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setLivenessStatus(false);
          setLivenessError(err instanceof Error ? err.message : 'Liveness check failed');
        }
        stopCamera();
      } finally {
        setCheckingLiveness(false);
      }
    };

    recorder.start();
    setCheckingLiveness(true);

    countdownIntervalRef.current = setInterval(() => {
      setRecordingCountdown(prev => {
        if (!prev || prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      if (recorder.state === 'recording') {
        // Request final data chunk before stopping
        recorder.requestData();
        recorder.stop();
      }
      clearInterval(countdownIntervalRef.current);
    }, 10000);
  }, [stream, stopCamera, idFace, setLivenessStatus, setVideoFace, setResultData, setCompareResult, guidanceMessages.length, sessionId]);

  useEffect(() => {
    const video = videoRef.current;
    if (stream && video && !video.srcObject) {
      video.srcObject = stream;
      if (!livenessStartedRef.current) {
        livenessStartedRef.current = true;
        checkLiveness();
      }
    }

    return () => {
      stopCamera();
      if(countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
  }, [stream, checkLiveness, stopCamera, videoRef]);

  const resetLiveness = () => {
    abortControllerRef.current?.abort();
    setLivenessVerified(false);
    setLivenessError(null);
    setRecordingCountdown(null);
    setLivenessStatus(false);
    setVideoFace([]);
    setResultData([]);
    setCompareResult(false);
    resetCapture();
    livenessStartedRef.current = false;
    setLastFrameUrl(null);

    clearInterval(countdownIntervalRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();

    stopCamera();
  };

  // Start camera as before
  const startLiveness = startCamera;

  const [smoothProgress, setSmoothProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const countdownStartRef = useRef<number | null>(null);

  // Smooth progress animation for inner arc
  useEffect(() => {
    // Only set the start time when countdown starts
    if (recordingCountdown !== null && countdownStartRef.current === null) {
      countdownStartRef.current = performance.now();
    }
    const totalDuration = 10000; // 10 seconds
    function animate(now: number) {
      if (countdownStartRef.current === null) return;
      const elapsed = now - countdownStartRef.current;
      let progress = Math.min(elapsed / totalDuration, 1);
      setSmoothProgress(progress);
      if (progress < 1 && recordingCountdown !== null) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else if (progress >= 1) {
        // Ensure progress reaches 100% when countdown completes
        setSmoothProgress(1);
      }
    }
    if (recordingCountdown !== null) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    // Cleanup: reset when countdown ends
    if (recordingCountdown === null) {
      setSmoothProgress(0);
      countdownStartRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [recordingCountdown]);

  const { appearance } = useAppearance();
  // Use accent color from appearance context (fallback to primary color if not set)
  const accentColor = appearance.accentColor || appearance.primaryColor || "#6478CF";

  return (
    <div className="w-full mx-auto">
      <div className="p-1 space-y-2">
        {/* Show phrase modal only during liveness recording */}
        {promptText && recordingCountdown !== null && (
          <LivenessPhraseModal phrase={promptText} />
        )}
        {!stream && !livenessVerified && !livenessError ? (
          <CameraAccess
            error={error}
            isLoadingCamera={isLoadingCamera}
            onStartCamera={startLiveness}
            videoButton={videoButton}
          />
        ) : (
          <div className="space-y-2">
            {/* Video container */}
            <div className="relative">
              <div className="relative bg-black rounded-md overflow-hidden h-[200px]">
                <div className="w-full h-full">
                  {/* Show last frame image if processing, else show video */}
                  {checkingLiveness && lastFrameUrl && !recordingCountdown ? (
                    <img
                      src={lastFrameUrl}
                      alt="Last frame"
                      className="w-full h-full object-cover rounded-md"
                      style={{ position: 'absolute', top: 0, left: 0 }}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${livenessVerified || livenessError ? 'hidden' : ''}`}
                    />
                  )}
                {/* Numeric countdown at right, vertically centered */}
                {recordingCountdown !== null && (
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 z-20 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full shadow-lg">
                    <span className="text-white font-bold text-2xl tracking-wider" style={{ fontVariantNumeric: 'tabular-nums' }}>{recordingCountdown}</span>
                    <span className="text-white text-xs font-medium opacity-70">{t("verify.video.sec")}</span>
                  </div>
                )}
                {recordingCountdown !== null && (
                  <div className="absolute top-3 left-3 flex items-center">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 dark:bg-red-700"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 dark:bg-red-700"></span>
                    </span>
                    <span className="ml-2 text-white text-sm font-medium">{t("verify.video.rec")}</span>
                  </div>
                )}
                {checkingLiveness && !recordingCountdown && !livenessVerified && !livenessError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white text-center">
                      <div className="flex justify-center mb-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium">{t("verify.video.processing")}</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={resetLiveness}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              </div>

              {/* Horizontal countdown bar below video */}
              {recordingCountdown !== null && (
                <div className="mt-2">
                  <HorizontalCountdownBar progress={smoothProgress} color={accentColor || "#6478CF"} />
                </div>
              )}

              {/* Guidance message below countdown bar */}
              {recordingCountdown !== null && guidanceStep < guidanceMessages.length && (
                <div className="mt-3 text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 animate-pulse">
                    {guidanceMessages[guidanceStep]}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
