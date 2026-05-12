
import React from "react";
import { Button } from "@/components/ui/button";
import { Video, AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CameraAccessProps {
  error: string | null;
  isLoadingCamera: boolean;
  onStartCamera: () => void;
  videoButton: boolean;
}

export function CameraAccess({ error, isLoadingCamera, onStartCamera ,videoButton}: CameraAccessProps) {
  const { t } = useTranslation();

  return (
    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center bg-muted/50">
      <div className="flex flex-col items-center justify-center gap-8">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mt-2">
          <Video className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2 mb-6">
          <p className="text-xs text-muted-foreground">{t("verify.camera.position.face")}</p>
          <p className="text-sm text-foreground font-medium">
            {t("verify.upload.mandatory")}
          </p>
          {error && (
            <Alert variant="destructive" className="mt-3 text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <Button 
          onClick={onStartCamera} 
          disabled={!videoButton || isLoadingCamera}
          className="w-full flex items-center gap-2"
        >
          <Video className="w-4 h-4" />
          {isLoadingCamera ? "Starting Camera..." : "Capture Video"}
        </Button>
      </div>
    </div>
  );
}
