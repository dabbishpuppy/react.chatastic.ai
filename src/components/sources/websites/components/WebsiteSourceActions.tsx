
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  RefreshCw,
  Edit,
  EyeOff,
  Trash2,
  Loader2
} from 'lucide-react';
import { AgentSource } from '@/types/rag';

interface WebsiteSourceActionsProps {
  source: AgentSource;
  onEdit: (source: AgentSource) => void;
  onExclude: (source: AgentSource) => void;
  onDelete: (source: AgentSource) => void;
  onRecrawl: (source: AgentSource) => void;
  showRecrawl?: boolean;
  isChild?: boolean;
}

const WebsiteSourceActions: React.FC<WebsiteSourceActionsProps> = ({
  source,
  onEdit,
  onExclude,
  onDelete,
  onRecrawl,
  showRecrawl = true,
  isChild = false
}) => {
  const isCrawling = source.crawl_status === 'in_progress' || source.crawl_status === 'pending';
  const buttonSize = isChild ? 'h-6 w-6' : 'h-8 w-8';
  const iconSize = isChild ? 14 : 18;

  return (
    <div className="flex items-center space-x-1 ml-4">
      {showRecrawl && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRecrawl(source)}
          disabled={isCrawling}
        >
          {isCrawling ? (
            <Loader2 size={16} className="mr-1 animate-spin" />
          ) : (
            <RefreshCw size={16} className="mr-1" />
          )}
          Recrawl
        </Button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={buttonSize}>
            <MoreHorizontal size={iconSize} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onEdit(source)}>
            <Edit size={isChild ? 14 : 16} className="mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExclude(source)}>
            <EyeOff size={isChild ? 14 : 16} className="mr-2" />
            {source.is_excluded ? 'Include' : 'Exclude'} link
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => onDelete(source)}
            className="text-red-600"
          >
            <Trash2 size={isChild ? 14 : 16} className="mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default WebsiteSourceActions;
