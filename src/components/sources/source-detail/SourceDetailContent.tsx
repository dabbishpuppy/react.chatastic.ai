
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, X, Edit2, Loader2, Globe, FileText, MessageSquare, Upload } from 'lucide-react';
import { AgentSource } from '@/types/rag';

interface SourceDetailContentProps {
  source: AgentSource;
  isEditing: boolean;
  editTitle: string;
  editContent: string;
  isSaving: boolean;
  onStartEdit: () => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isWebsiteSourcePage?: boolean;
}

const SourceDetailContent: React.FC<SourceDetailContentProps> = ({
  source,
  isEditing,
  editTitle,
  editContent,
  isSaving,
  onStartEdit,
  onTitleChange,
  onContentChange,
  onSave,
  onCancel,
  isWebsiteSourcePage = false
}) => {
  const getSourceIcon = () => {
    switch (source.source_type) {
      case 'website':
        return <Globe className="w-5 h-5 text-blue-600" />;
      case 'text':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'qa':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'file':
        return <Upload className="w-5 h-5 text-orange-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSourceTypeLabel = () => {
    switch (source.source_type) {
      case 'website':
        return isWebsiteSourcePage ? 'Website Page' : 'Website';
      case 'text':
        return 'Text Content';
      case 'qa':
        return 'Q&A Pair';
      case 'file':
        return 'File Upload';
      default:
        return 'Source';
    }
  };

  const getMetadataDisplay = () => {
    if (isWebsiteSourcePage && source.metadata) {
      return (
        <div className="grid grid-cols-2 gap-4 text-sm">
          {source.metadata.content_size && (
            <div>
              <span className="font-medium text-gray-600">Content Size:</span>
              <span className="ml-2">{(source.metadata.content_size / 1024).toFixed(1)} KB</span>
            </div>
          )}
          {source.metadata.chunks_created && (
            <div>
              <span className="font-medium text-gray-600">Chunks Created:</span>
              <span className="ml-2">{source.metadata.chunks_created}</span>
            </div>
          )}
          {source.metadata.processing_time_ms && (
            <div>
              <span className="font-medium text-gray-600">Processing Time:</span>
              <span className="ml-2">{source.metadata.processing_time_ms}ms</span>
            </div>
          )}
          {source.metadata.status && (
            <div>
              <span className="font-medium text-gray-600">Status:</span>
              <Badge variant="outline" className="ml-2">
                {source.metadata.status}
              </Badge>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Source Type and Metadata Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {getSourceIcon()}
            <div>
              <CardTitle className="text-lg">Source Information</CardTitle>
              <p className="text-sm text-gray-600">{getSourceTypeLabel()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {getMetadataDisplay() && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              {getMetadataDisplay()}
            </div>
          )}
          
          {source.url && (
            <div className="mb-4">
              <span className="font-medium text-gray-600">URL:</span>
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:text-blue-800 underline break-all"
              >
                {source.url}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Title Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Title</CardTitle>
            {!isEditing && !isWebsiteSourcePage && (
              <Button variant="outline" size="sm" onClick={onStartEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Input
                value={editTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Enter title..."
                className="text-lg"
              />
              <div className="flex gap-2">
                <Button onClick={onSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <h1 className="text-xl font-semibold text-gray-900 break-words">
              {source.title}
            </h1>
          )}
        </CardContent>
      </Card>

      {/* Content Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {isWebsiteSourcePage ? 'Extracted Content' : 'Content'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editContent}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Enter content..."
              className="min-h-[300px] text-sm font-mono"
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
              {source.content ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono break-words">
                  {source.content}
                </pre>
              ) : (
                <div className="text-gray-500 italic">
                  {isWebsiteSourcePage 
                    ? 'Content extraction in progress...' 
                    : 'No content available'
                  }
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional metadata for website pages */}
      {isWebsiteSourcePage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Processing Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p>This page was crawled from the website and processed for training.</p>
              <p>The content shown above represents the extracted text that will be used for AI responses.</p>
              {source.metadata?.chunks_created && (
                <p>
                  This page has been split into <strong>{source.metadata.chunks_created}</strong> chunks for optimal retrieval.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SourceDetailContent;
