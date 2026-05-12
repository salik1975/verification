
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface DocumentCardProps {
  type: string;
  documentNumber: string;
  name?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  imageUrl: string;
  onEdit: () => void;
}

export function DocumentCard({
  type,
  documentNumber,
  name,
  dateOfBirth,
  expiryDate,
  imageUrl,
  onEdit,
}: DocumentCardProps) {
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  
  // Auto-close dialog after 3 seconds
  useEffect(() => {
    let timeoutId: number | undefined;
    
    if (isImageDialogOpen) {
      timeoutId = window.setTimeout(() => {
        setIsImageDialogOpen(false);
      }, 3000);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isImageDialogOpen]);

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">{type}</h3>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Document Number</p>
              <p className="text-sm font-medium">{documentNumber}</p>
            </div>
            {name && (
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{name}</p>
              </div>
            )}
            {dateOfBirth && (
              <div>
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <p className="text-sm font-medium">{dateOfBirth}</p>
              </div>
            )}
            {expiryDate && (
              <div>
                <p className="text-xs text-muted-foreground">Expiry Date</p>
                <p className="text-sm font-medium">{expiryDate}</p>
              </div>
            )}
          </div>

          <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <div className="aspect-[16/9] overflow-hidden rounded-md">
                <img
                  src={imageUrl}
                  alt={`${type} document`}
                  className="object-cover w-full h-full"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
