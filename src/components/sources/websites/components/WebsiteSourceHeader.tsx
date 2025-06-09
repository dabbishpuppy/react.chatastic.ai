
import React, { useState } from 'react';
import { AgentSource } from '@/types/rag';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface WebsiteSourceHeaderProps {
  source: AgentSource;
  onEdit: (sourceId: string, newUrl: string) => void;
}

export const WebsiteSourceHeader: React.FC<WebsiteSourceHeaderProps> = ({
  source,
  onEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(source.url || '');

  const handleEdit = () => {
    if (isEditing) {
      onEdit(source.id, editUrl);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditUrl(source.url || '');
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <input
          type="url"
          value={editUrl}
          onChange={(e) => setEditUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="Enter website URL"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleEdit}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-medium text-gray-900 truncate text-sm">
          {source.title || source.url || 'Untitled'}
        </h3>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
};
