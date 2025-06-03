
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  RotateCcw, 
  EyeOff, 
  Eye,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { AgentSource } from '@/types/rag';
import { CrawlRecoveryService } from '@/services/rag/crawlRecoveryService';
import { toast } from '@/hooks/use-toast';

interface WebsiteSourceActionsProps {
  source: AgentSource;
  onEdit: (sourceId: string, newUrl: string) => void;
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
  const [isRecovering, setIsRecovering] = useState(false);
  
  const isParentSource = !source.parent_source_id;
  const isStuck = isParentSource && 
    (source.crawl_status === 'pending' || source.crawl_status === 'in_progress') &&
    source.updated_at && 
    new Date(source.updated_at) < new Date(Date.now() - 5 * 60 * 1000); // 5+ minutes old

  const handleEdit = () => {
    const newUrl = prompt('Enter new URL:', source.url);
    if (newUrl && newUrl !== source.url) {
      onEdit(source.id, newUrl);
    }
  };

  const handleRecoverStuck = async () => {
    if (!isParentSource) return;
    
    setIsRecovering(true);
    try {
      const result = await CrawlRecoveryService.performCompleteRecovery(source.id);
      
      if (result.success) {
        toast({
          title: "Recovery Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Recovery Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to recover stuck crawl",
        variant: "destructive"
      });
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>
          <Edit size={14} className="mr-2" />
          Edit URL
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onExclude(source)}>
          {source.is_excluded ? (
            <>
              <Eye size={14} className="mr-2" />
              Include
            </>
          ) : (
            <>
              <EyeOff size={14} className="mr-2" />
              Exclude
            </>
          )}
        </DropdownMenuItem>
        
        {showRecrawl && isParentSource && (
          <DropdownMenuItem onClick={() => onRecrawl(source)}>
            <RotateCcw size={14} className="mr-2" />
            Recrawl
          </DropdownMenuItem>
        )}
        
        {isStuck && (
          <DropdownMenuItem 
            onClick={handleRecoverStuck}
            disabled={isRecovering}
            className="text-orange-600"
          >
            {isRecovering ? (
              <RefreshCw size={14} className="mr-2 animate-spin" />
            ) : (
              <Wrench size={14} className="mr-2" />
            )}
            Recover Stuck
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem 
          onClick={() => onDelete(source)}
          className="text-red-600"
        >
          <Trash2 size={14} className="mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WebsiteSourceActions;
