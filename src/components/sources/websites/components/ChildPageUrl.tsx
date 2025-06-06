
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { getFullUrl } from '../utils/childPageUtils';

interface ChildPageUrlProps {
  url: string;
}

const ChildPageUrl: React.FC<ChildPageUrlProps> = ({ url }) => {
  const fullUrl = getFullUrl(url);

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm font-medium text-gray-900 truncate" title={fullUrl}>
        {fullUrl}
      </p>
      <ExternalLink 
        className="w-3 h-3 text-gray-400 cursor-pointer hover:text-gray-600 flex-shrink-0" 
        onClick={() => window.open(fullUrl, '_blank')}
      />
    </div>
  );
};

export default ChildPageUrl;
