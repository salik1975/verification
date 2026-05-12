// components/DocumentTypeFilter.tsx
import React from "react";

interface Props {
  selected: string | null;
  onSelect: (value: string | null) => void;
}

const DOCUMENT_TYPES = [
  { label: "All Types", value: null, key: "all" },  
  { label: "US Driver License", value: "1", key: "us_dl" },
  { label: "US Passport", value: "2", key: "us_passport" },
  { label: "Canada Driver License", value: "3", key: "can_dl" },
  { label: "Canada Passport", value: "4", key: "can_passport" },
];

export const DocumentTypeFilter: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <div className="mb-2 mt-1">
      <select
        value={selected || ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="border border-gray-300 rounded px-2 py-1 text-xs w-24"
      >
        {DOCUMENT_TYPES.map((doc) => (
          <option key={doc.key} value={doc.value || ""}>
            {doc.label}
          </option>
        ))}
      </select>
    </div>
  );
};
