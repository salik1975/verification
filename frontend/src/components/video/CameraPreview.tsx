
import React from "react";
import { Button } from "@/components/ui/button";

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isLoadingCamera: boolean;
  countdown: number | null;
  isRecording: boolean;
  promptText: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancel: () => void;
}

export function CameraPreview({
  videoRef,
  isLoadingCamera,
  countdown,
  isRecording,
  promptText,
  onStartRecording,
  onStopRecording,
  onCancel,
}: CameraPreviewProps) {
  return (
    <>
      <div className="relative overflow-hidden rounded-lg aspect-video bg-black">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover"
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />
        
        {isLoadingCamera && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-white">Loading camera...</span>
          </div>
        )}
        
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-6xl font-bold text-white">{countdown}</span>
          </div>
        )}
        
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
            <div className="size-2 rounded-full bg-white animate-pulse" />
            <span className="text-sm font-medium">Recording</span>
          </div>
        )}
        
        {!isRecording && countdown === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-4">
            <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-lg max-w-xs text-center">
              <p className="font-medium mb-2">Please read out loud:</p>
              <p className="text-primary font-bold">"{promptText}"</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-center gap-4">
        {!isRecording && countdown === null ? (
          <>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onStartRecording}>
              Start Recording
            </Button>
          </>
        ) : isRecording ? (
          <Button variant="destructive" onClick={onStopRecording}>
            Stop Recording
          </Button>
        ) : null}
      </div>
    </>
  );
}
