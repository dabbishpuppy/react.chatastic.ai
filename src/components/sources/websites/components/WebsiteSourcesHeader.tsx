
import React from 'react';

interface WebsiteSourcesHeaderProps {
  loading?: boolean;
  count?: number;
}

const WebsiteSourcesHeader: React.FC<WebsiteSourcesHeaderProps> = ({
  loading,
  count = 0
}) => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Website Sources</h2>
      </div>
      <div className="text-sm text-gray-500">
        {loading ? (
          'Loading website sources...'
        ) : (
          `${count} website source${count === 1 ? '' : 's'}`
        )}
      </div>
    </div>
  );
};

export default WebsiteSourcesHeader;
