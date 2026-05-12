
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export function useVideoRecording() {
  const { toast } = useToast();

  // Core states
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Clean up function when component unmounts
  const stopMediaTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopMediaTracks();
      
      // Clean up any object URLs to prevent memory leaks
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl, stopMediaTracks]);

  const startCamera = async () => {
    // Reset all states at the beginning
    setError(null);
    setIsLoadingCamera(true);
    stopMediaTracks(); // Ensure any existing stream is stopped
    
    try {
      // Check browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser doesn't support camera access. Please use Chrome, Firefox, or Safari.");
      }
      
      // Request camera stream with both video and audio
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setStream(mediaStream);
      setIsLoadingCamera(false);
    } catch (error) {
      console.error("Camera access error:", error);
      handleCameraError(error);
    }
  };

  const handleCameraError = (error: unknown) => {
    setIsLoadingCamera(false);
    stopMediaTracks();
    
    let errorMessage = "Could not access camera and microphone.";
    
    if (error instanceof Error) {
      if (error.name === "NotAllowedError" || error.message.includes("denied")) {
        errorMessage = "Camera and microphone permission denied. Please allow access and try again.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No camera or microphone found on your device.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera or microphone is being used by another application.";
      } else if (error.message.includes("HTTPS")) {
        errorMessage = "Camera and microphone access requires HTTPS.";
      } else {
        errorMessage = `${error.message || "Camera and microphone access failed"}. Please try again.`;
      }
    }
    
    setError(errorMessage);
    
    toast({
      variant: "destructive",
      title: "Camera Access Failed",
      description: errorMessage,
    });
  };

  const startRecording = (onCaptureComplete: (videoBlob: Blob) => void) => {
    if (!stream) {
      setError("Camera not available. Please start camera first.");
      return;
    }
    
    // Start countdown
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount === null || prevCount <= 1) {
          clearInterval(countdownInterval);
          
          // Start recording after countdown finishes
          try {
            chunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            
            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                chunksRef.current.push(e.data);
              }
            };
            
            mediaRecorder.onstop = () => {
              const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
              
              // Create a preview URL for the recorded video
              const videoURL = URL.createObjectURL(videoBlob);
              setVideoPreviewUrl(videoURL);
              setIsReviewOpen(true);
              
              // Pass the blob to parent component
              onCaptureComplete(videoBlob);
            };
            
            mediaRecorder.start();
            setIsRecording(true);
            
            // Auto stop after 10 seconds
            setTimeout(() => {
              if (mediaRecorderRef.current?.state === "recording") {
                stopRecording();
              }
            }, 10000);
          } catch (error) {
            console.error("Error starting recording:", error);
            setError("Could not start video recording. Please try again.");
          }
          
          return null;
        }
        return prevCount - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Recording Complete",
        description: "Your verification video has been recorded",
      });
    }
  };

  // Reset to initial state if user wants to try again
  const resetCapture = () => {
    stopMediaTracks();
    setIsReviewOpen(false);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    setStream(null);
    setError(null);
  };

  return {
    // States
    isRecording,
    stream,
    countdown,
    error,
    isLoadingCamera,
    isReviewOpen,
    videoPreviewUrl,
    
    // Refs
    videoRef,
    
    // Actions
    startCamera,
    startRecording,
    stopRecording,
    resetCapture,
    setIsReviewOpen,
  };
}
