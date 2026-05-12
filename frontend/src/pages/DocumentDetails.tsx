import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useParams } from "react-router-dom";
import { DocumentDetailService, DocumentTypeService, type DocumentDetail, type DocumentType } from "@/services";
import { useDocumentType } from "./context/DocumentTypeContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/services/api";

export default function DocumentDetails() {
  const { documentType: documentTypeIdParam } = useParams<{ documentType: string }>();
  const { selectedDocumentTypeId } = useDocumentType();
  const documentTypeId = documentTypeIdParam ?? (selectedDocumentTypeId?.toString() ?? "");

  const [details, setDetails] = useState<DocumentDetail[]>([]);
  const [documentTypeInfo, setDocumentTypeInfo] = useState<DocumentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [initialCheckedItems, setInitialCheckedItems] = useState<Record<number, boolean>>({});
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
  const [editedLabels, setEditedLabels] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!documentTypeId) return;
      setLoading(true);
      try {
        // Fetch document details and document type info in parallel
        const [detailsData, documentTypesData] = await Promise.all([
          DocumentDetailService.getDetails(documentTypeId),
          DocumentTypeService.getDocumentTypes()
        ]);
        
        setDetails(detailsData);
        
        // Find the specific document type
        const docType = documentTypesData.find(dt => dt.Id.toString() === documentTypeId);
        setDocumentTypeInfo(docType || null);
        
        // Initialize checked state based on isCritical values
        const initialCheckedState = detailsData.reduce((acc, item) => {
          acc[item.Id] = item.isCritical;
          return acc;
        }, {} as Record<number, boolean>);
        setCheckedItems(initialCheckedState);
        setInitialCheckedItems(initialCheckedState); // Track initial state for change detection
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [documentTypeId]);

  // Helper to refresh data after save
  const refreshData = async () => {
    if (!documentTypeId) return;
    setLoading(true);
    try {
      const [detailsData, documentTypesData] = await Promise.all([
        DocumentDetailService.getDetails(documentTypeId),
        DocumentTypeService.getDocumentTypes()
      ]);
      setDetails(detailsData);
      const docType = documentTypesData.find(dt => dt.Id.toString() === documentTypeId);
      setDocumentTypeInfo(docType || null);
      const initialCheckedState = detailsData.reduce((acc, item) => {
        acc[item.Id] = item.isCritical;
        return acc;
      }, {} as Record<number, boolean>);
      setCheckedItems(initialCheckedState);
      setInitialCheckedItems(initialCheckedState);
      setEditingLabelId(null);
      setEditedLabels({});
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (itemId: number, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: checked
    }));
  };

  const handleLabelDoubleClick = (id: number, currentLabel: string) => {
    setEditingLabelId(id);
    setEditedLabels((prev) => ({ ...prev, [id]: currentLabel }));
  };

  const handleLabelChange = (id: number, value: string) => {
    setEditedLabels((prev) => ({ ...prev, [id]: value }));
  };

  const handleLabelBlur = () => {
    setEditingLabelId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Find only changed isCritical items
      const changedCritical = Object.entries(checkedItems).filter(
        ([id, checked]) => initialCheckedItems[Number(id)] !== checked
      );
      // Find only changed labels
      const changedLabels = Object.entries(editedLabels).filter(([id, label]) => {
        const detail = details.find((d) => d.Id === Number(id));
        return detail && detail.FieldLabelToDisplay !== label;
      });
      if (changedCritical.length === 0 && changedLabels.length === 0) {
        toast({ title: "No changes to save." });
        setSaving(false);
        return;
      }
      // Send POST for each changed isCritical item
      await Promise.all(
        changedCritical.map(([id, checked]) =>
          fetch(API_ENDPOINTS.DOCUMENT_DETAIL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Id: Number(id), isCritical: checked }),
          })
        )
      );
      // Send POST for each changed label
      await Promise.all(
        changedLabels.map(([id, label]) =>
          fetch(`${API_ENDPOINTS.DOCUMENT_DETAIL}/rename`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Id: Number(id), NewFieldToDisplay: label }),
          })
        )
      );
      toast({ title: "Changes saved successfully!" });
      await refreshData();
    } catch (err) {
      toast({ title: "Failed to save changes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {documentTypeInfo ? `Document Details For ${documentTypeInfo.Description}` : 'Document Details'}
        </h1>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader className="bg-primary/10">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-primary font-semibold">
                Field Key
              </TableHead>
              <TableHead className="text-primary font-semibold">
                Field Label to Display
              </TableHead>
              <TableHead className="text-primary font-semibold">
                Critical
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6">
                  Loading...
                </TableCell>
              </TableRow>
            ) : details.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6">
                  No details found.
                </TableCell>
              </TableRow>
            ) : (
              details.map((item, index) => (
                <TableRow
                  key={index}
                  className="border-b border-border hover:bg-muted/50"
                >
                  <TableCell className="text-foreground">{item.FieldKey}</TableCell>
                  <TableCell className="text-foreground">
                    {editingLabelId === item.Id ? (
                      <input
                        type="text"
                        value={editedLabels[item.Id] ?? item.FieldLabelToDisplay}
                        onChange={e => handleLabelChange(item.Id, e.target.value)}
                        onBlur={handleLabelBlur}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleLabelBlur();
                        }}
                        autoFocus
                        className="border rounded px-2 py-1 w-full bg-background text-foreground"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => handleLabelDoubleClick(item.Id, item.FieldLabelToDisplay)}
                        className="cursor-pointer hover:underline"
                        title="Double-click to edit"
                      >
                        {editedLabels[item.Id] ?? item.FieldLabelToDisplay}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground">
                    <Checkbox 
                      checked={checkedItems[item.Id] || false}
                      onCheckedChange={(checked) => handleCheckboxChange(item.Id, checked as boolean)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}