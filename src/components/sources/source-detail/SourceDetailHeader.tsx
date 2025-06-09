
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Globe, FileText, File, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SourceDetailHeaderProps {
  source: any;
  isEditing: boolean;
  onBackClick: () => void;
  onDeleteClick: () => void;
  isPageSource?: boolean;
}

const SourceDetailHeader: React.FC<SourceDetailHeaderProps> = ({
  source,
  isEditing,
  onBackClick,
  onDeleteClick,
  isPageSource = false
}) => {
  const getStatusBadge = () => {
    if (!source.status) return null;
    
    const statusColors = {
      'completed': 'bg-green-100 text-green-800',
      'processing': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'failed': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={statusColors[source.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {source.status}
      </Badge>
    );
  };

  const getSourceIcon = () => {
    if (isPageSource) {
      return <FileText className="h-5 w-5 text-blue-600" />;
    }
    
    switch (source.source_type) {
      case 'website':
        return <Globe className="h-5 w-5 text-blue-600" />;
      case 'text':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      case 'file':
        return <File className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSourceTypeLabel = () => {
    if (isPageSource) return 'Page';
    
    switch (source.source_type) {
      case 'website':
        return 'Website';
      case 'text':
        return 'Text';
      case 'file':
        return 'File';
      case 'qa':
        return 'Q&A';
      default:
        return 'Source';
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackClick}
            className="mt-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sources
          </Button>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {getSourceIcon()}
              <h1 className="text-2xl font-bold text-gray-900">
                {source.title || source.url || 'Untitled'}
              </h1>
              {getStatusBadge()}
              <Badge variant="outline">{getSourceTypeLabel()}</Badge>
            </div>

            <div className="space-y-1">
              {source.url && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">URL:</span> {source.url}
                </p>
              )}
              {isPageSource && source.parent_source_id && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Parent Source:</span> {source.parent_source_id}
                </p>
              )}
              {source.created_at && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(source.created_at).toLocaleDateString()}
                </p>
              )}
              {source.completed_at && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Completed:</span>{' '}
                  {new Date(source.completed_at).toLocaleDateString()}
                </p>
              )}
              {isPageSource && source.content_size && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Content Size:</span>{' '}
                  {Math.round(source.content_size / 1024)} KB
                </p>
              )}
              {isPageSource && source.chunks_created && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Chunks Created:</span> {source.chunks_created}
                </p>
              )}
              {isPageSource && source.processing_time_ms && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Processing Time:</span>{' '}
                  {Math.round(source.processing_time_ms / 1000)}s
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteClick}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SourceDetailHeader;
