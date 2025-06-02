
import React from 'react';
import { AgentSource } from '@/types/rag';
import { Checkbox } from '@/components/ui/checkbox';
import SourceIcon from './SourceIcon';
import SourceTypeLabel from './SourceTypeLabel';
import { formatDistanceToNow } from 'date-fns';
import { formatFileSize } from './SourceSizeFormatter';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import QASourceItem from '../QA/QASourceItem';

interface SourceTableRowProps {
  source: AgentSource;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: (source: AgentSource) => void;
  onView?: (source: AgentSource) => void;
}

const SourceTableRow: React.FC<SourceTableRowProps> = ({
  source,
  isSelected,
  onSelect,
  onDelete,
  onView
}) => {
  // Special rendering for Q&A sources
  if (source.source_type === 'qa') {
    return (
      <div className="relative">
        <div className="absolute left-4 top-4 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
          />
        </div>
        <div className="absolute right-4 top-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(source)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(source)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="pl-10 pr-12">
          <QASourceItem source={source} />
        </div>
      </div>
    );
  }

  // Default table row rendering for other source types
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center space-x-3">
          <SourceIcon type={source.source_type} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {source.title}
            </div>
            {source.url && (
              <div className="text-xs text-gray-500 truncate">
                {source.url}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <SourceTypeLabel type={source.source_type} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatFileSize(source)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
      </td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(source)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => onDelete(source)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
};

export default SourceTableRow;
