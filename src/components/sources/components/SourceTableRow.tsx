
import React from 'react';
import { AgentSource } from '@/types/rag';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import SourceIcon from './SourceIcon';
import SourceTypeLabel from './SourceTypeLabel';
import { formatDistanceToNow } from 'date-fns';
import { formatFileSize } from './SourceSizeFormatter';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Eye, ArrowRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SourceTableRowProps {
  source: AgentSource;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: (source: AgentSource) => void;
  onView?: (source: AgentSource) => void;
  onNavigate?: (source: AgentSource) => void;
}

const SourceTableRow: React.FC<SourceTableRowProps> = ({
  source,
  isSelected,
  onSelect,
  onDelete,
  onView,
  onNavigate
}) => {
  const handleRowClick = () => {
    if (onView) {
      onView(source);
    }
  };

  const handleArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate(source);
    }
  };

  return (
    <TableRow className="cursor-pointer hover:bg-gray-50" onClick={handleRowClick}>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
        />
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell>
        <SourceTypeLabel type={source.source_type} />
      </TableCell>
      <TableCell className="text-sm text-gray-500">
        {formatFileSize(source)}
      </TableCell>
      <TableCell className="text-sm text-gray-500">
        {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleArrowClick}
            className="h-8 w-8 p-0"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
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
      </TableCell>
    </TableRow>
  );
};

export default SourceTableRow;
