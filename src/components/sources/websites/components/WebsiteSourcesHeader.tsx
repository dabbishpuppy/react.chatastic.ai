
import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
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
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">Website Sources</CardTitle>
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
    </CardHeader>
  );
};

export default WebsiteSourcesHeader;
