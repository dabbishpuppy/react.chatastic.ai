
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Edit2, 
  RefreshCw, 
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import WebsiteActionConfirmDialog from './WebsiteActionConfirmDialog';

interface ChildPageActionsProps {
  url: string;
  pageId: string;
  onExclude?: () => void;
  onDelete?: () => void;
  onRecrawl?: () => void;
}

type ConfirmationType = 'recrawl' | 'delete' | null;

const ChildPageActions: React.FC<ChildPageActionsProps> = ({
  url,
  pageId,
  onDelete,
  onRecrawl
}) => {
  const [confirmationType, setConfirmationType] = useState<ConfirmationType>(null);

  const handleRecrawlClick = () => {
    setConfirmationType('recrawl');
  };

  const handleDeleteClick = () => {
    setConfirmationType('delete');
  };

  const handleConfirm = async () => {
    switch (confirmationType) {
      case 'recrawl':
        if (onRecrawl) {
          await onRecrawl();
        }
        break;
      case 'delete':
        if (onDelete) {
          await onDelete();
        }
        break;
    }
    setConfirmationType(null);
  };

  const getConfirmationConfig = () => {
    switch (confirmationType) {
      case 'recrawl':
        return {
          title: 'Confirm Recrawl',
          description: `Are you sure you want to recrawl "${url}"? This will refresh the content and may take some time to complete.`,
          confirmText: 'Recrawl',
          isDestructive: false
        };
      case 'delete':
        return {
          title: 'Delete Page',
          description: `Are you sure you want to permanently delete "${url}"? This action cannot be undone.`,
          confirmText: 'Delete',
          isDestructive: true
        };
      default:
        return {
          title: '',
          description: '',
          confirmText: '',
          isDestructive: false
        };
    }
  };

  const confirmConfig = getConfirmationConfig();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {onRecrawl && (
            <DropdownMenuItem onClick={handleRecrawlClick}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Recrawl
            </DropdownMenuItem>
          )}
          
          {onDelete && (
            <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <WebsiteActionConfirmDialog
        open={confirmationType !== null}
        onOpenChange={(open) => !open && setConfirmationType(null)}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        onConfirm={handleConfirm}
        isDestructive={confirmConfig.isDestructive}
        disabled={false}
      />
    </div>
  );
};

export default ChildPageActions;
