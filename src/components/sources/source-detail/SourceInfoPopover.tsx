
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info } from 'lucide-react';
import { AgentSource, SourceType } from '@/types/rag';
import { formatDistanceToNow } from 'date-fns';
import { UserService, UserInfo } from '@/services/userService';

interface SourceInfoPopoverProps {
  source: AgentSource;
}

const SourceInfoPopover: React.FC<SourceInfoPopoverProps> = ({ source }) => {
  const [createdByUser, setCreatedByUser] = useState<UserInfo | null>(null);
  const [updatedByUser, setUpdatedByUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!source.created_by && !source.updated_by) return;
      
      setLoading(true);
      try {
        const userIds = [source.created_by, source.updated_by].filter(Boolean) as string[];
        const users = await UserService.getUsersInfo(userIds);
        
        if (source.created_by) {
          setCreatedByUser(users.find(u => u.id === source.created_by) || null);
        }
        if (source.updated_by) {
          setUpdatedByUser(users.find(u => u.id === source.updated_by) || null);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [source.created_by, source.updated_by]);

  const formatFileSize = (content?: string, metadata?: Record<string, any>) => {
    // Try to get size from metadata first
    if (metadata?.original_size) {
      return formatBytes(metadata.original_size);
    }
    
    if (!content) return '0 B';
    
    // For HTML content, calculate size of plain text
    if (metadata?.isHtml) {
      const tmp = document.createElement('div');
      tmp.innerHTML = content;
      const plainText = tmp.textContent || tmp.innerText || '';
      return formatBytes(new TextEncoder().encode(plainText).length);
    }
    
    return formatBytes(new TextEncoder().encode(content).length);
  };

  const formatBytes = (bytes: number) => {
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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="bg-white hover:bg-gray-50">
          <Info size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" side="left" align="start">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Source Information</h4>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{getSourceTypeLabel(source.source_type)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">{formatFileSize(source.content, source.metadata)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {source.updated_at && source.updated_at !== source.created_at && (
              <div className="flex justify-between">
                <span className="text-gray-600">Updated:</span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(source.updated_at), { addSuffix: true })}
                </span>
              </div>
            )}
            
            {source.created_by && (
              <div className="flex justify-between">
                <span className="text-gray-600">Created by:</span>
                <span className="font-medium">
                  {loading ? 'Loading...' : (createdByUser?.display_name || createdByUser?.email || 'Unknown')}
                </span>
              </div>
            )}
            
            {source.updated_by && source.updated_by !== source.created_by && (
              <div className="flex justify-between">
                <span className="text-gray-600">Updated by:</span>
                <span className="font-medium">
                  {loading ? 'Loading...' : (updatedByUser?.display_name || updatedByUser?.email || 'Unknown')}
                </span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SourceInfoPopover;
