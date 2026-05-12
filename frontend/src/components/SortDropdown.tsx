import { ChevronDown, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
interface SortDropdownProps {
  type: "date" | "document";
  onSelect: (order: "asc" | "desc") => void;
  onClose?: () => void;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({ type, onSelect, onClose }) => {
  const handleClick = (order: "asc" | "desc") => {
    onSelect(order);
    if (onClose) onClose();
  };

  return (
    <div className="absolute z-10 mt-2 w-40 bg-white border border-gray-200 rounded shadow-md">
      {type === "date" ? (
        <>
          <button
            className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
            onClick={() => handleClick("desc")}
          >
            <ArrowDownWideNarrow className="w-4 h-4 mr-2" />
            Sort by Latest
          </button>
          <button
            className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
            onClick={() => handleClick("asc")}
          >
            <ArrowUpNarrowWide className="w-4 h-4 mr-2" />
            Sort by Oldest
          </button>
        </>
      ) : (
        <>
          <button
            className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
            onClick={() => handleClick("asc")}
          >
            <ArrowUpNarrowWide className="w-4 h-4 mr-2" />
            Sort A–Z
          </button>
          <button
            className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
            onClick={() => handleClick("desc")}
          >
            <ArrowDownWideNarrow className="w-4 h-4 mr-2" />
            Sort Z–A
          </button>
        </>
      )}
    </div>
  );
};
