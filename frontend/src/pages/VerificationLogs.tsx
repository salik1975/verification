import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { VerificationService, VerificationLogCreate, VerificationLogsParams } from "@/services/verificationService";
import { DocumentTypeService, type DocumentType } from "@/services";
import { DriverLicenseData } from "@/components/DriverLicenseData";
import { PassportData } from "@/components/PassportData";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAppearance } from "@/components/contexts/AppearanceContext";
import { useAuth } from "@/components/contexts/AuthContext";
import { ChevronDown, FileText, ChevronLeft, ChevronRight, Search, Download } from "lucide-react";
import { SortDropdown } from "@/components/SortDropdown";
import { DocumentTypeFilter } from "@/components/DocumentTypeFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function VerificationLogs() {
  const [logs, setLogs] = useState<VerificationLogCreate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const { themeColor } = useThemeColor();
  const { appearance } = useAppearance();
  const { user } = useAuth();
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [docSortOrder, setDocSortOrder] = useState<"asc" | "desc" | null>(null);
  const [showDocSortDropdown, setShowDocSortDropdown] = useState(false);
  const [docTypeFilter, setDocTypeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Check if user is product owner
  const isProductOwner = user?.roles?.includes('product_owner') || false;

  useEffect(() => {
    DocumentTypeService.getDocumentTypes()
      .then((data) => {
        if (Array.isArray(data)) setDocumentTypes(data);
      })
      .catch((err) => {
        console.error("Failed to fetch document types", err);
        setDocumentTypes([]);
      });
  }, []);

  const fetchLogs = async (params: VerificationLogsParams = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await VerificationService.fetchVerificationLogs({
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
        sort_by: 'CreatedOn',
        sort_order: sortOrder,
        document_type_id: docTypeFilter,
        ...params
      });
      
      setLogs(response.logs);
      setTotalCount(response.total_count);
      setTotalPages(Math.ceil(response.total_count / pageSize));
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch logs");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, sortOrder, docTypeFilter]);

  const getManageButtonStyle = (themeColor: string) => {
    // Use custom primary color if available, otherwise fall back to theme colors
    const primaryColor = appearance.primaryColor;
    
    if (primaryColor && primaryColor !== '#6478CF') {
      // Create gradient using the custom primary color
      return {
        background: `linear-gradient(0deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
        color: "white",
        border: "none",
        padding: "4px 8px",
        fontSize: "0.75em",
        boxShadow: `
          inset 0 1px 2px rgba(255, 255, 255, 0.4),
          inset 0 -1px 2px rgba(0, 0, 0, 0.2),
          0 0.3em 0.7em -0.3em ${primaryColor}99
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
          padding: "4px 8px",
          fontSize: "0.75em",
        };
      case "purple":
        return {
          background: "linear-gradient(0deg, #a029a4 0%, #c954cc 100%)",
          color: "white",
          border: "none",
          padding: "4px 8px",
          fontSize: "0.75em",
        };
      default:
        return {
          background: "linear-gradient(0deg, #6478cf 0%, #8492e6 100%)",
          color: "white",
          border: "none",
          padding: "4px 8px",
          fontSize: "0.75em",
        };
    }
  };

  // Mapping for document type IDs to string keys
  const docTypeStringMap: Record<string, string> = {
    "1": "US_DRIVING_LICENSE",
    "2": "US_PASSPORT",
    "3": "CAN_DRIVING_LICENSE",
    "4": "CAN_PASSPORT"
  };

  // Mapping for user-friendly display names
  const docTypeDisplayMap: Record<string, string> = {
    US_DRIVING_LICENSE: "US Driving License",
    US_PASSPORT: "US Passport",
    CAN_DRIVING_LICENSE: "Canada Driving License",
    CAN_PASSPORT: "Canada Passport"
  };

  const handleSort = (order: "asc" | "desc") => {
    setSortOrder(order);
    setShowSortDropdown(false);
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleDocumentSort = (order: "asc" | "desc") => {
    setDocSortOrder(order);
    setShowDocSortDropdown(false);
    const documentTypeMap: Record<number, string> = {};
    documentTypes.forEach(doc => {
      documentTypeMap[doc.Id] = doc.Description;
    });
    const sorted = [...logs].sort((a, b) => {
      const nameA = documentTypeMap[a.DocumentTypeID]?.toLowerCase() || "";
      const nameB = documentTypeMap[b.DocumentTypeID]?.toLowerCase() || "";
      return order === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    setLogs(sorted);
  };

  const handleDocumentTypeFilter = (val: string | null) => {
    setDocTypeFilter(val);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Export functionality
  const handleSelectAll = () => {
    if (selectedRows.size === filteredLogs.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredLogs.map(log => log.SessionID || '')));
    }
  };

  const handleSelectRow = (sessionId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedRows(newSelected);
  };

  const exportToCSV = () => {
    if (selectedRows.size === 0) return;

    const selectedLogs = filteredLogs.filter(log => selectedRows.has(log.SessionID || ''));
    
    // Define CSV headers
    const headers = [
      'Date Created',
      'Document Type',
      ...(isProductOwner ? ['Tenant'] : []),
      'Document Number',
      'Extracted Name',
      'Doc Verification',
      'Liveness Check',
      'Photo Compare',
      'Phrase Verification',
      'Phone Verification',
      'Email Verification',
      'Final Verification',
      'Session ID'
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...selectedLogs.map(log => {
        const { name, docNumber } = getNameAndDocNumber(log);
        const docType = documentTypeMap[log.DocumentTypeID] || "Unknown";
        
        const rowData = [
          new Date(log.CreatedOn || "").toLocaleDateString(),
          docType,
        ];
        
        // Add tenant data only for product owners
        if (isProductOwner) {
          rowData.push(log.tenant_name || "N/A");
        }
        
        const getStatusText = (val: boolean | null | undefined) =>
          val === null || val === undefined ? "N/A" : val ? "Pass" : "Fail";

        rowData.push(
          docNumber || "N/A",
          name || "N/A",
          getStatusText(log.DocumentVerification),
          getStatusText(log.LivenessVerification),
          getStatusText(log.PhotoVerification),
          getStatusText(log.PhraseVerification),
          getStatusText(log.PhoneVerification),
          getStatusText(log.EmailVerification),
          getStatusText(log.FinalVerification),
          log.SessionID || ""
        );
        
        return rowData.map(field => `"${field}"`).join(',');
      })
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `verification_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: boolean | null | undefined) => {
    // Handle null/undefined as N/A (feature not enabled/evaluated)
    if (status === null || status === undefined) {
      return (
        <Badge
          variant="secondary"
          className="text-xs px-2 py-1 rounded-full font-medium transition-all duration-200 bg-gray-400 text-white hover:bg-gray-500 shadow-md shadow-gray-400/30 border border-gray-300/20"
        >
          N/A
        </Badge>
      );
    }

    return (
      <Badge
        variant={status ? "default" : "destructive"}
        className={`text-xs px-2 py-1 rounded-full font-medium transition-all duration-200 ${
          status
            ? "bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-500/30 border border-green-400/20"
            : "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/30 border border-red-400/20"
        }`}
      >
        {status ? "Pass" : "Fail"}
      </Badge>
    );
  };

  function getNameAndDocNumber(log: any) {
    if (log.ExtractedName && log.ExtractedDocNumber) {
      return { name: log.ExtractedName, docNumber: log.ExtractedDocNumber };
    }
    if (log.ExtractedInfoJson) {
      try {
        const info = JSON.parse(log.ExtractedInfoJson);
        const fields = info.fields || {};
        const name = fields.FirstName?.content && fields.LastName?.content
          ? `${fields.FirstName.content} ${fields.LastName.content}`
          : "";
        const docNumber = fields.DocumentNumber?.content || "";
        return { name, docNumber };
      } catch {
        return { name: "", docNumber: "" };
      }
    }
    return { name: "", docNumber: "" };
  }

  function renderDetailsComponent(log: any, onLoaded: () => void) {
    const docType = docTypeStringMap[String(log.DocumentTypeID)] || "UNKNOWN";
    const parsedInfo = log.ExtractedInfoJson ? JSON.parse(log.ExtractedInfoJson) : {};
    const data = {
      analyzeResult: { documents: [parsedInfo] },
      documentType: docType
    };
    if (docType.includes("PASSPORT")) {
      return <PassportData data={data} onLoaded={onLoaded} />;
    } else {
      return <DriverLicenseData data={data} onLoaded={onLoaded} />;
    }
  }

  const documentTypeMap: Record<number, string> = {};
  documentTypes.forEach(doc => {
    documentTypeMap[doc.Id] = doc.Description;
  });

  // Filter logs based on search query
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const { name, docNumber } = getNameAndDocNumber(log);
    const docType = documentTypeMap[log.DocumentTypeID] || "Unknown";
    
    return (
      name.toLowerCase().includes(searchLower) ||
      docNumber.toLowerCase().includes(searchLower) ||
      docType.toLowerCase().includes(searchLower) ||
      (log.SessionID && log.SessionID.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-accent text-accent-foreground px-6 py-6 rounded-lg mr-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold mb-2 text-white">Verification Logs</h1>
            <p className="text-white">View and manage verification audit logs</p>
          </div>
        </div>

        {/* Sub Header */}
        <div className="mt-8 bg-card rounded-lg p-6 mb-[-4rem]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Audit Trail</h2>
              <p className="text-sm text-muted-foreground">View and manage verification audit logs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 mt-8 mr-6">
                 <div className="max-w-full mx-auto border border-border rounded-lg p-6 bg-card shadow-lg shadow-black/5">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2">Loading verification logs...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500">{error}</div>
                 ) : (
           <>
                           {/* Search and Export Section */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search logs by name, document number, type, or session ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {filteredLogs.length} of {logs.length} records
                  </div>
                </div>
                                 <div className="flex items-center gap-2">
                   <Button
                     variant={showExport ? "outline" : "default"}
                     size="sm"
                     onClick={() => {
                       if (showExport) {
                         setShowExport(false);
                         setSelectedRows(new Set());
                       } else {
                         setShowExport(true);
                       }
                     }}
                     className="flex items-center gap-2"
                     style={showExport ? undefined : getManageButtonStyle(themeColor)}
                   >
                     {showExport ? (
                       <>
                         <span>Cancel</span>
                       </>
                     ) : (
                       <>
                         <Download className="w-4 h-4" />
                         Export
                       </>
                     )}
                   </Button>
                   {showExport && selectedRows.size > 0 && (
                     <Button
                       variant="default"
                       size="sm"
                       onClick={exportToCSV}
                       className="flex items-center gap-2"
                       style={getManageButtonStyle(themeColor)}
                     >
                       <Download className="w-4 h-4" />
                       Export {selectedRows.size} Selected
                     </Button>
                   )}
                 </div>
              </div>
             
             <div className="overflow-x-auto rounded-lg border border-border/50">
               <Table className="w-full min-w-max">
                                            <TableHeader className="bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm">
                 <TableRow className="border-b-2 border-primary/20 hover:bg-transparent">
                   {showExport && (
                     <TableHead className="text-primary font-semibold w-12">
                       <Checkbox
                         checked={selectedRows.size === filteredLogs.length && filteredLogs.length > 0}
                         onCheckedChange={handleSelectAll}
                         className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                       />
                     </TableHead>
                   )}
                   <TableHead className="text-primary font-semibold relative w-24">
                     <div className="flex items-center gap-1">
                       <span className="text-xs">Date Created</span>
                       <button
                         onClick={() => setShowSortDropdown((prev) => !prev)}
                         className="text-gray-500 hover:text-gray-700"
                         title="Click to sort"
                       >
                         <ChevronDown className="w-4 h-4" />
                       </button>
                     </div>
                     {showSortDropdown && (
                       <SortDropdown
                         type="date"
                         onSelect={handleSort}
                         onClose={() => setShowSortDropdown(false)}
                       />
                     )}
                   </TableHead>
                   <TableHead className="text-primary font-semibold relative w-28">
                     <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-1">
                         <span className="text-xs">Document Type</span>
                         <button
                           onClick={() => setShowDocSortDropdown((prev) => !prev)}
                           className="text-gray-500 hover:text-gray-700"
                           title="Click to sort"
                         >
                           <ChevronDown className="w-4 h-4" />
                         </button>
                       </div>
                       <div className="flex items-center justify-between mt-1 relative">
                         <DocumentTypeFilter
                           selected={docTypeFilter}
                           onSelect={handleDocumentTypeFilter}
                         />
                         {showDocSortDropdown && (
                           <div className="absolute z-10 top-full left-0 mt-1">
                             <SortDropdown
                               type="document"
                               onSelect={handleDocumentSort}
                               onClose={() => setShowDocSortDropdown(false)}
                             />
                           </div>
                         )}
                       </div>
                     </div>
                   </TableHead>
                   {isProductOwner && (
                     <TableHead className="text-primary font-semibold w-28">
                       <span className="text-xs">Tenant</span>
                     </TableHead>
                   )}
                   <TableHead className="text-primary font-semibold w-32">
                     <span className="text-xs">Document Number</span>
                   </TableHead>
                   <TableHead className="text-primary font-semibold w-28">
                     <span className="text-xs">Extracted Name</span>
                   </TableHead>
                   <TableHead className="text-primary font-semibold w-24">
                     <span className="text-xs">Doc Verification</span>
                   </TableHead>
                   <TableHead className="text-primary font-semibold w-24">
                     <span className="text-xs">Liveness Check</span>
                   </TableHead>
                   <TableHead className="text-primary font-semibold w-24">
                     <span className="text-xs">Photo Compare</span>
                   </TableHead>
                   <TableHead className="text-primary font-semibold w-24">
                     <span className="text-xs">Phrase Verification</span>
                   </TableHead>
                   <TableHead className="text-primary font-semibold w-24">
                     <span className="text-xs">Phone Verification</span>
                   </TableHead>
                   <TableHead className="text-primary font-semibold w-24">
                     <span className="text-xs">Email Verification</span>
                   </TableHead>
                   <TableHead className="text-primary font-semibold w-24">
                     <span className="text-xs">Final Verification</span>
                   </TableHead>
                   <TableHead className="text-primary font-semibold w-20">
                     <span className="text-xs">Action</span>
                   </TableHead>
                </TableRow>
              </TableHeader>
                             <TableBody>
                   {filteredLogs.map((log, index) => {
                     const { name, docNumber } = getNameAndDocNumber(log);
                                          return (
                                               <TableRow key={log.SessionID} className={`border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md hover:translate-y-[-1px] transition-all duration-300 ease-in-out ${
                                                 index % 2 === 0 
                                                   ? "bg-background" 
                                                   : "bg-muted/20"
                                               }`}>
                   {showExport && (
                     <TableCell className="w-12">
                       <Checkbox
                         checked={selectedRows.has(log.SessionID || '')}
                         onCheckedChange={() => handleSelectRow(log.SessionID || '')}
                         className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                       />
                     </TableCell>
                   )}
                   <TableCell className="text-foreground w-24 text-xs font-medium">
                         {new Date(log.CreatedOn || "").toLocaleDateString()}
                 </TableCell>
                 <TableCell className="text-foreground w-28 text-xs font-medium">
                         {documentTypeMap[log.DocumentTypeID] || "Unknown"}
                 </TableCell>
                   {isProductOwner && (
                     <TableCell className="text-foreground w-28 text-xs font-medium">
                       {log.tenant_name || "N/A"}
                     </TableCell>
                   )}
                       <TableCell className="text-foreground font-mono text-xs w-32 font-medium">
                         {docNumber || "N/A"}
                 </TableCell>
                 <TableCell className="text-foreground w-28 text-xs font-medium">
                         {name || "N/A"}
                 </TableCell>
                       <TableCell className="w-24">{getStatusBadge(log.DocumentVerification)}</TableCell>
                       <TableCell className="w-24">{getStatusBadge(log.LivenessVerification)}</TableCell>
                       <TableCell className="w-24">{getStatusBadge(log.PhotoVerification)}</TableCell>
                       <TableCell className="w-24">{getStatusBadge(log.PhraseVerification)}</TableCell>
                       <TableCell className="w-24">{getStatusBadge(log.PhoneVerification)}</TableCell>
                       <TableCell className="w-24">{getStatusBadge(log.EmailVerification)}</TableCell>
                       <TableCell className="w-24">{getStatusBadge(log.FinalVerification)}</TableCell>
                 <TableCell className="w-20">
                                                 <Button
                           variant="ghost"
                           size="sm"
                     onClick={() => {
                             setSelectedLog(log);
                       setShowModal(true);
                     }}
                     style={getManageButtonStyle(themeColor)}
                     className="text-xs px-2 py-1"
                   >
                             Details
                           </Button>
                </TableCell>
              </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {/* Modal for detailed view */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Verification Details</h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowModal(false);
                  setSelectedLog(null);
                }}
              >
                ×
              </Button>
            </div>
            {modalLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2">Loading details...</p>
              </div>
            ) : (
              <div>
                {renderDetailsComponent(selectedLog, () => setModalLoading(false))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}