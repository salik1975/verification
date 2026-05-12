import { createContext, useContext, useState, ReactNode } from "react";

interface DocumentTypeContextType {
  selectedDocumentTypeId: number | null;
  setSelectedDocumentTypeId: (id: number | null) => void;
}

const DocumentTypeContext = createContext<DocumentTypeContextType | undefined>(undefined);

export const DocumentTypeProvider = ({ children }: { children: ReactNode }) => {
  const [selectedDocumentTypeId, setSelectedDocumentTypeId] = useState<number | null>(null);

  return (
    <DocumentTypeContext.Provider value={{ selectedDocumentTypeId, setSelectedDocumentTypeId }}>
      {children}
    </DocumentTypeContext.Provider>
  );
};

export const useDocumentType = () => {
  const context = useContext(DocumentTypeContext);
  if (!context) {
    throw new Error("useDocumentType must be used within a DocumentTypeProvider");
  }
  return context;
}; 