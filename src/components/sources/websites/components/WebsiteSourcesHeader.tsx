
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface WebsiteSourcesHeaderProps {
  sourcesCount: number;
  allCurrentPageSelected: boolean;
  onSelectAll: () => void;
}

const WebsiteSourcesHeader: React.FC<WebsiteSourcesHeaderProps> = ({
  sourcesCount,
  allCurrentPageSelected,
  onSelectAll
}) => {
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Website Sources ({sourcesCount})
        </h3>
        {sourcesCount > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allCurrentPageSelected}
                onCheckedChange={onSelectAll}
                aria-controls="website-sources-list"
              />
              <label className="text-sm text-gray-600">
                Select all
              </label>
            </div>
            {allCurrentPageSelected && sourcesCount > 0 && (
              <span className="text-sm text-blue-600">
                All {sourcesCount} items on this page are selected
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteSourcesHeader;
