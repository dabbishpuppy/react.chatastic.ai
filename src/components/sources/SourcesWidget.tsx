
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SourceType } from "@/types/rag";
import { formatDistanceToNow } from "date-fns";
import { useAgentSources } from "@/hooks/useAgentSources";

const SourcesWidget: React.FC = () => {
  // Use the consolidated hook instead of managing state separately
  const { sources: sourcesData, loading } = useAgentSources();

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

  const getTotalSize = () => {
    if (sourcesData.length === 0) return '0 B';
    
    const totalBytes = sourcesData.reduce((total, source) => {
      if (!source.content) return total;
      return total + new Blob([source.content]).size;
    }, 0);
    
    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${Math.round(totalBytes / 1024)} KB`;
    return `${Math.round(totalBytes / (1024 * 1024))} MB`;
  };

  const getSourcesByType = (type: SourceType) => {
    return sourcesData.filter(source => source.source_type === type);
  };

  const sourceTypes: SourceType[] = ['text', 'file', 'website', 'qa'];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total sources:</span>
          <span className="font-medium">{sourcesData.length}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total size:</span>
          <span className="font-medium">{getTotalSize()}</span>
        </div>

        <div className="space-y-3">
          {sourceTypes.map((type) => {
            const typeSourcesData = getSourcesByType(type);
            if (typeSourcesData.length === 0) return null;

            return (
              <div key={type} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getSourceIcon(type)}
                    <span className="font-medium">{getSourceTypeLabel(type)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {typeSourcesData.length}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {typeSourcesData.slice(0, 3).map((source) => (
                    <div key={source.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <span className="truncate">{source.title}</span>
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
                  
                  {typeSourcesData.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{typeSourcesData.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sourcesData.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            No sources added yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourcesWidget;
