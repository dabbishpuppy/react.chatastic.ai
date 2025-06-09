
import React from 'react';
import { AgentSource } from '@/types/rag';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit2, Eye, EyeOff, Trash2, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ButtonState } from '@/services/SimplifiedSourceStatusService';

interface WebsiteSourceActionsProps {
  source: AgentSource;
  buttonState: ButtonState;
  onEdit: () => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
}

export const WebsiteSourceActions: React.FC<WebsiteSourceActionsProps> = ({
  source,
  buttonState,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onEdit}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edit URL
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onExclude(source)}>
          {source.is_excluded ? (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Include
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Exclude
            </>
          )}
        </DropdownMenuItem>
        
        {buttonState.canRecrawl && (
          <DropdownMenuItem onClick={() => onRecrawl(source)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Recrawl
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onDelete(source)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
