
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Info, 
  FileText,
  File,
  Link,
  MessageCircleQuestion,
  Trash2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AgentSource, SourceType } from '@/types/rag';
import { formatDistanceToNow } from 'date-fns';

interface SourceDetailHeaderProps {
  source: AgentSource;
  isEditing: boolean;
  onBackClick: () => void;
  onDeleteClick: () => void;
}

const SourceDetailHeader: React.FC<SourceDetailHeaderProps> = ({
  source,
  isEditing,
  onBackClick,
  onDeleteClick
}) => {
  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'text':
        return <FileText size={16} className="text-blue-600" />;
      case 'file':
        return <File size={16} className="text-green-600" />;
      case 'website':
        return <Link size={16} className="text-purple-600" />;
      case 'qa':
        return <MessageCircleQuestion size={16} className="text-orange-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const formatFileSize = (content?: string) => {
    if (!content) return '0 B';
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const getSourceTypeLabel = (type: SourceType) => {
    switch (type) {
      case 'text':
        return 'Text';
      case 'file':
        return 'File';
      case 'website':
        return 'Website';
      case 'qa':
        return 'Q&A';
      default:
        return type;
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackClick}
            className="flex-shrink-0 bg-white hover:bg-gray-50"
          >
            <ArrowLeft size={20} />
          </Button>
          {getSourceIcon(source.source_type)}
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Source' : source.title}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="bg-white hover:bg-gray-50">
                  <Info size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs">
                  <div><strong>Created:</strong> {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}</div>
                  <div><strong>Size:</strong> {formatFileSize(source.content)}</div>
                  <div><strong>Type:</strong> {getSourceTypeLabel(source.source_type)}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onDeleteClick}
            className="bg-white hover:bg-gray-50"
          >
            <Trash2 size={18} className="text-red-600" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SourceDetailHeader;
