
import React from "react";

interface TotalStatsSectionProps {
  totalSources: number;
  totalSize: string;
}

const TotalStatsSection: React.FC<TotalStatsSectionProps> = React.memo(({ 
  totalSources, 
  totalSize 
}) => {
  const maxSize = "400KB"; // Free user limit

  return (
    <>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Total sources:</span>
        <span className="font-medium">{totalSources}</span>
      </div>
      
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Total size:</span>
        <span className="font-medium">{totalSize} / {maxSize}</span>
      </div>
    </>
  );
});

TotalStatsSection.displayName = 'TotalStatsSection';

export default TotalStatsSection;
