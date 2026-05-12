import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAppearance } from "@/components/contexts/AppearanceContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DocumentTypeService, DocumentDetailService, type DocumentType, type DocumentDetail } from "@/services";
import { useDocumentType } from "./context/DocumentTypeContext";
import { CreditCard, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/services/api";

export default function ManageId() {
  const { themeColor } = useThemeColor();
  const { appearance } = useAppearance();
  const navigate = useNavigate();
  const { setSelectedDocumentTypeId } = useDocumentType();
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null);
  const [details, setDetails] = useState<DocumentDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [initialCheckedItems, setInitialCheckedItems] = useState<Record<number, boolean>>({});
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
  const [editedLabels, setEditedLabels] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const getManageButtonStyle = (themeColor: string) => {
    // Use custom primary color if available, otherwise fall back to theme colors
    const primaryColor = appearance.primaryColor;
    
    if (primaryColor && primaryColor !== '#6478CF') {
      // Create gradient using the custom primary color
      return {
        background: `linear-gradient(0deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        color: "white",
        border: "none",
        padding: "8px 16px",
        fontSize: "0.85em",
        boxShadow: `
          inset 0 2px 4px rgba(255, 255, 255, 0.4),
          inset 0 -2px 4px rgba(0, 0, 0, 0.2),
          0 0.7em 1.5em -0.5em ${primaryColor}99
        `,
      };
    }
    
    // Fall back to theme-based colors
    switch (themeColor) {
      case "green":
        return {
          background: "linear-gradient(0deg, #4cae4f 0%, #6ec16e 100%)",
          color: "white",
          border: "none",
          padding: "8px 16px",
          fontSize: "0.85em",
        };
      case "purple":
        return {
          background: "linear-gradient(0deg, #a029a4 0%, #c954cc 100%)",
          color: "white",
          border: "none",
          padding: "8px 16px",
          fontSize: "0.85em",
        };
      default:
        return {
          background: "linear-gradient(0deg, #6478cf 0%, #8492e6 100%)",
          color: "white",
          border: "none",
          padding: "8px 16px",
          fontSize: "0.85em",
        };
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await DocumentTypeService.getDocumentTypes();
        const documentTypesArray = Array.isArray(data) ? data : [];
        setDocumentTypes(documentTypesArray);
        
        // Select the first document type by default if available
        if (documentTypesArray.length > 0 && !selectedDocumentType) {
          setSelectedDocumentType(documentTypesArray[0]);
          setSelectedDocumentTypeId(documentTypesArray[0].Id);
        }
      } catch (error) {
        setDocumentTypes([]);
        console.error('Failed to fetch document types:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch details when a document type is selected
  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedDocumentType) return;
      
      setDetailsLoading(true);
      try {
        const detailsData = await DocumentDetailService.getDetails(selectedDocumentType.Id);
        setDetails(detailsData);
        
        // Initialize checked state based on isCritical values
        const initialCheckedState = detailsData.reduce((acc, item) => {
          acc[item.Id] = item.isCritical;
          return acc;
        }, {} as Record<number, boolean>);
        setCheckedItems(initialCheckedState);
        setInitialCheckedItems(initialCheckedState);
        setEditingLabelId(null);
        setEditedLabels({});
      } catch (error) {
        console.error('Failed to fetch details:', error);
        setDetails([]);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
  }, [selectedDocumentType]);

  const handleDocumentTypeSelect = (docType: DocumentType) => {
    setSelectedDocumentType(docType);
    setSelectedDocumentTypeId(docType.Id);
    setSearchQuery(""); // Reset search when switching document types
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
    if (!selectedDocumentType) return;
    
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
      
      // Refresh data
      const detailsData = await DocumentDetailService.getDetails(selectedDocumentType.Id);
      setDetails(detailsData);
      const initialCheckedState = detailsData.reduce((acc, item) => {
        acc[item.Id] = item.isCritical;
        return acc;
      }, {} as Record<number, boolean>);
      setCheckedItems(initialCheckedState);
      setInitialCheckedItems(initialCheckedState);
      setEditingLabelId(null);
      setEditedLabels({});
    } catch (err) {
      toast({ title: "Failed to save changes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Filter details based on search query
  const filteredDetails = details.filter((item) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      item.FieldKey.toLowerCase().includes(searchLower) ||
      item.FieldLabelToDisplay.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-accent text-accent-foreground px-6 py-6 rounded-lg mr-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold mb-2 text-white">Manage ID Document</h1>
            <p className="text-white">Manage document types and their configuration</p>
          </div>
        </div>

        {/* Sub Header */}
        <div className="mt-8 bg-card rounded-lg p-6 mb-[-4rem]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Document Type Verification</h2>
              <p className="text-sm text-muted-foreground">Manage document types and their configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 mt-8 mr-6">
        <div className="max-w-7xl mx-auto border border-border rounded-lg p-6 bg-card">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Document Types */}
            <div className="lg:col-span-1">
              <div className="border border-border rounded-lg bg-card p-4">
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  {selectedDocumentType ? selectedDocumentType.Description : "Document Types"}
                </h3>
                <div className="space-y-1">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : documentTypes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No document types found.</p>
                  ) : (
                    documentTypes.map((doc) => (
                      <div
                        key={doc.Id}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 relative ${
                          selectedDocumentType?.Id === doc.Id
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted/50 hover:bg-muted text-foreground'
                        }`}
                        onClick={() => handleDocumentTypeSelect(doc)}
                      >
                        <p className="text-sm font-medium">{doc.Description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Content - Fields Table */}
            <div className="lg:col-span-3">
              {selectedDocumentType ? (
                <div className="space-y-4">
                  {/* Search and Update Section */}
                  <div className="flex justify-between items-center">
                    <div className="relative w-80">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search fields..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="px-8"
                    >
                      {saving ? "Updating..." : "Update"}
                    </Button>
                  </div>

                  {/* Fields Table */}
                  <div className="border rounded-lg bg-card">
                    <Table>
                      <TableHeader className="bg-primary/10">
                        <TableRow className="border-b border-border hover:bg-transparent">
                          <TableHead className="text-primary font-semibold">Field Key</TableHead>
                          <TableHead className="text-primary font-semibold">Field Label to Display</TableHead>
                          <TableHead className="text-primary font-semibold">Critical</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailsLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                              <p className="text-muted-foreground">Loading fields...</p>
                            </TableCell>
                          </TableRow>
                        ) : filteredDetails.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6">
                              {searchQuery ? "No fields match your search." : "No fields found."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredDetails.map((item, index) => (
                            <TableRow
                              key={item.Id}
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
                                <Switch
                                  checked={checkedItems[item.Id] || false}
                                  onCheckedChange={(checked) => handleCheckboxChange(item.Id, checked)}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Select a document type to view its fields.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
