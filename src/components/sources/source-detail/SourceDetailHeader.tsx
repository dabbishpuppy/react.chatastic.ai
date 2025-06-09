
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  FileText,
  File,
  Link,
  MessageCircleQuestion,
  Trash2,
  Globe
} from 'lucide-react';
import { AgentSource, SourceType } from '@/types/rag';
import SourceInfoPopover from './SourceInfoPopover';

interface SourceDetailHeaderProps {
  source: AgentSource;
  isEditing: boolean;
  onBackClick: () => void;
  onDeleteClick: () => void;
  isSourcePage?: boolean;
}

const SourceDetailHeader: React.FC<SourceDetailHeaderProps> = ({
  source,
  isEditing,
  onBackClick,
  onDeleteClick,
  isSourcePage = false
}) => {
  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'text':
        return <FileText size={16} className="text-blue-600" />;
      case 'file':
        return <File size={16} className="text-green-600" />;
      case 'website':
        return isSourcePage ? <Globe size={16} className="text-purple-600" /> : <Link size={16} className="text-purple-600" />;
      case 'qa':
        return <MessageCircleQuestion size={16} className="text-orange-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getTitle = () => {
    if (isEditing) {
      return isSourcePage ? 'Edit Source Page' : 'Edit Source';
    }
    
    if (isSourcePage) {
      return source.url || `Source Page ${source.id.slice(0, 8)}`;
    }
    
    return source.title;
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
            {getTitle()}
          </h1>
          {isSourcePage && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
              Child Page
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <SourceInfoPopover source={source} />
          
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
