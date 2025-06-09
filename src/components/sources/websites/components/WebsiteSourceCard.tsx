import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Pencil, Trash2, EyeOff, Eye, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { AgentSource } from '@/types/rag';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WebsiteSourceChildList } from './WebsiteSourceChildList';

import WebsiteSourceDetails from './WebsiteSourceDetails';

interface WebsiteSourceCardProps {
  source: AgentSource;
  childSources?: AgentSource[];
  onToggleExpand: (sourceId: string) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRetrain: (source: AgentSource) => void;
  isExpanded?: boolean;
}

const WebsiteSourceCard: React.FC<WebsiteSourceCardProps> = ({
  source,
  childSources = [],
  onToggleExpand,
  onExclude,
  onDelete,
  onRetrain,
  isExpanded = false
}) => {
  const [isRetraining, setIsRetraining] = useState(false);

  const handleRetrain = async (source: AgentSource) => {
    setIsRetraining(true);
    try {
      await onRetrain(source);
    } catch (error) {
      console.error("Failed to retrain source:", error);
    } finally {
      setIsRetraining(false);
    }
  };

  return (
    <Card className={`transition-all duration-200 ${isExpanded ? 'ring-2 ring-blue-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">
                {source.title || source.url}
              </CardTitle>
              {source.is_excluded && (
                <Badge variant="secondary">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Excluded
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">{source.url}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onToggleExpand(source.id)}>
                {isExpanded ? (
                  <>
                    <ArrowUp className="w-3 h-3 mr-2" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3 h-3 mr-2" />
                    Expand
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRetrain(source)} disabled={isRetraining}>
                {isRetraining ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    Retraining...
                  </>
                ) : (
                  <>
                    <Pencil className="w-3 h-3 mr-2" />
                    Retrain
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExclude(source)}>
                {source.is_excluded ? (
                  <>
                    <Eye className="w-3 h-3 mr-2" />
                    Include
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 mr-2" />
                    Exclude
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(source)} className="text-red-500 focus:text-red-500">
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <WebsiteSourceDetails source={source} />
          
          {childSources.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">
                Crawled Pages ({childSources.length})
              </h4>
              <WebsiteSourceChildList
                childSources={childSources}
                onExclude={onExclude}
                onDelete={onDelete}
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default WebsiteSourceCard;
