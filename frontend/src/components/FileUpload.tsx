
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";

interface FileUploadProps {
  onFileChange: (file: File) => void;
  accept?: string;
  className?: string;
  label: string;
}

export function FileUpload({ onFileChange, accept = "image/*", className, label }: FileUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileChange(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileChange(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-4 transition-colors text-center bg-muted/50",
        isDragging ? "border-primary bg-primary/5" : "border-border",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        id="file-upload"
        ref={fileInputRef}
      />
      <div className="flex flex-col items-center justify-center gap-8">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mt-2">
          <Upload className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2 mb-6">
          <p className="text-xs text-muted-foreground">{t("verify.upload.instruction")}</p>
          <p className="text-sm text-foreground font-medium">{t("verify.upload.documents")}</p>
        </div>
        <Button 
          type="button" 
          onClick={handleBrowseClick} 
          className="w-full flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>
    </div>
  );
}
