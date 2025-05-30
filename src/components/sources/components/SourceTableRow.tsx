
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  ChevronRight, 
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgentSource } from '@/types/rag';
import { formatDistanceToNow } from 'date-fns';
import SourceIcon from './SourceIcon';
import SourceTypeLabel from './SourceTypeLabel';
import { formatFileSize } from './SourceSizeFormatter';

interface SourceTableRowProps {
  source: AgentSource;
  onRowClick: (source: AgentSource) => void;
  onDeleteClick: (source: AgentSource, event: React.MouseEvent) => void;
  onNavigateClick: (source: AgentSource, event: React.MouseEvent) => void;
}

const SourceTableRow: React.FC<SourceTableRowProps> = ({
  source,
  onRowClick,
  onDeleteClick,
  onNavigateClick
}) => {
  return (
    <TableRow 
      className="cursor-pointer hover:bg-gray-50 transition-opacity duration-200"
      onClick={() => onRowClick(source)}
    >
      <TableCell className="font-medium">
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-3">
            <SourceIcon type={source.source_type} />
          </div>
          <div>
            <div className="font-medium">{source.title}</div>
            {source.url && (
              <div className="text-sm text-gray-500 truncate max-w-[200px]">
                {source.url}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <SourceTypeLabel type={source.source_type} />
      </TableCell>
      <TableCell>{formatFileSize(source)}</TableCell>
      <TableCell className="text-gray-500">
        {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={(e) => onDeleteClick(source, e)}
                className="text-red-600 text-sm"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={(e) => onNavigateClick(source, e)}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default SourceTableRow;
