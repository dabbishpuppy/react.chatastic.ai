
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  File, 
  Link, 
  MessageCircleQuestion,
  Info
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SourceType, AgentSource } from "@/types/rag";
import { formatDistanceToNow } from "date-fns";

interface SourceSectionsDisplayProps {
  sourcesByType: Array<{
    type: SourceType;
    sources: AgentSource[];
  }>;
}

const SourceSectionsDisplay: React.FC<SourceSectionsDisplayProps> = React.memo(({ 
  sourcesByType 
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

  const formatFileSize = (content?: string) => {
    if (!content) return '0 B';
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const getDisplayTitle = (source: AgentSource) => {
    // For website sources, show only the domain
    if (source.source_type === 'website' && source.url) {
      try {
        return new URL(source.url).hostname;
      } catch {
        return source.title;
      }
    }
    return source.title;
  };

  return (
    <div className="space-y-3">
      {sourcesByType.map(({ type, sources }) => {
        if (sources.length === 0) return null;

        return (
          <div key={type} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getSourceIcon(type)}
                <span className="font-medium">{getSourceTypeLabel(type)}</span>
                <Badge variant="secondary" className="text-xs">
                  {sources.length}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              {sources.slice(0, 3).map((source) => (
                <div key={source.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="truncate">{getDisplayTitle(source)}</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                          <Info size={12} className="text-gray-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64" align="end">
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-medium">Created:</span>
                            <div className="text-gray-600">
                              {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Last updated:</span>
                            <div className="text-gray-600">
                              {formatDistanceToNow(new Date(source.updated_at), { addSuffix: true })}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Size:</span>
                            <div className="text-gray-600">{formatFileSize(source.content)}</div>
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>
                            <div className="text-gray-600">
                              {source.is_active ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {formatFileSize(source.content)}
                  </span>
                </div>
              ))}
              
              {sources.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{sources.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

SourceSectionsDisplay.displayName = 'SourceSectionsDisplay';

export default SourceSectionsDisplay;
