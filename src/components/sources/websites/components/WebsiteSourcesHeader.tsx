
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import WebsiteSourceFixer from './WebsiteSourceFixer';

interface WebsiteSourcesHeaderProps {
  openModal: () => void;
  loading?: boolean;
  count?: number;
}

const WebsiteSourcesHeader: React.FC<WebsiteSourcesHeaderProps> = ({
  openModal,
  loading,
  count = 0
}) => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Website Sources</h2>
        <Button onClick={openModal} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Website
        </Button>
      </div>
      <div className="text-sm text-gray-500">
        {loading ? (
          'Loading website sources...'
        ) : (
          `${count} website source${count === 1 ? '' : 's'}`
        )}
      </div>
      
      {/* Add the fixer component */}
      <WebsiteSourceFixer />
    </div>
  );
};

export default WebsiteSourcesHeader;
