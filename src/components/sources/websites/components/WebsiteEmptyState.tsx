
import React from 'react';

interface WebsiteEmptyStateProps {
  loading: boolean;
  error: string | null;
  hasParentSources: boolean;
}

const WebsiteEmptyState: React.FC<WebsiteEmptyStateProps> = ({ loading, error, hasParentSources }) => {
  if (loading || error || hasParentSources) {
    return null;
  }

  return (
    <div className="text-center text-gray-500 p-8">
      <p>No website sources found</p>
      <p className="text-sm mt-1">Add your first website source using the form above</p>
    </div>
  );
};

export default WebsiteEmptyState;
