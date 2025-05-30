
import React from "react";

interface SourceTypeStatsSectionProps {
  sourcesByType: {
    text: number;
    file: number;
    website: number;
    qa: number;
  };
  currentTab?: string;
}

const SourceTypeStatsSection: React.FC<SourceTypeStatsSectionProps> = React.memo(({ 
  sourcesByType, 
  currentTab 
}) => {
  const typeLabels = {
    text: 'Text',
    file: 'Files', 
    website: 'Website',
    qa: 'Q&A'
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 font-medium mb-2">By Type</div>
      {Object.entries(sourcesByType).map(([type, count]) => (
        <div 
          key={type} 
          className={`flex justify-between items-center text-sm ${
            currentTab === type ? 'text-blue-600 font-medium' : 'text-gray-600'
          }`}
        >
          <span>{typeLabels[type as keyof typeof typeLabels]}:</span>
          <span>{count}</span>
        </div>
      ))}
    </div>
  );
});

SourceTypeStatsSection.displayName = 'SourceTypeStatsSection';

export default SourceTypeStatsSection;
