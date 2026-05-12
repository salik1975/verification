// components/FieldWithConfidence.tsx
import React from 'react';

interface FieldWithConfidenceProps {
  label: string;
  value: string;
  confidence: number;
  getColorClass: (value: number) => string;
  getBorderColorClass: (value: number) => string;
}

export const FieldWithConfidence: React.FC<FieldWithConfidenceProps> = ({
  label,
  value,
  confidence,
  getColorClass,
  getBorderColorClass,
}) => {
  return (
    <div className="relative group">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className={`rounded-md border p-1 ${getBorderColorClass(confidence)}`}>
        <p className="text-sm font-medium">{value}</p>
      </div>
      <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-gray-700 text-white text-xs p-2 rounded-md shadow-lg z-10">
        <div className="flex items-center gap-2">
          <span>Confidence:</span>
          <span className={`font-medium ${getColorClass(confidence)}`}>
            {(confidence * 100).toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
};