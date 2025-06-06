
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExternalLink, Eye, EyeOff, Trash2, MoreHorizontal } from 'lucide-react';
import WebsiteActionConfirmDialog from './WebsiteActionConfirmDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/hooks/use-toast";

interface ChildPageActionsProps {
  url: string;
  pageId: string; // Add pageId for direct deletion
  onExclude?: () => void;
  onDelete?: () => void;
}

type ConfirmationType = 'exclude' | 'delete' | null;

const ChildPageActions: React.FC<ChildPageActionsProps> = ({
  url,
  pageId,
  onExclude,
  onDelete
}) => {
  const [confirmationType, setConfirmationType] = useState<ConfirmationType>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExcludeClick = () => {
    setConfirmationType('exclude');
  };

  const handleDeleteClick = () => {
    setConfirmationType('delete');
  };

  const handleConfirm = async () => {
    switch (confirmationType) {
      case 'exclude':
        onExclude?.();
        break;
      case 'delete':
        setIsDeleting(true);
        try {
          // Delete directly from source_pages table
          const { error } = await supabase
            .from('source_pages')
            .delete()
            .eq('id', pageId);

          if (error) {
            throw error;
          }

          toast({
            title: "Success",
            description: "Child page deleted successfully"
          });

          onDelete?.();
        } catch (error) {
          console.error('Error deleting child page:', error);
          toast({
            title: "Error",
            description: "Failed to delete child page",
            variant: "destructive"
          });
        } finally {
          setIsDeleting(false);
        }
        break;
    }
    setConfirmationType(null);
  };

  const getConfirmationConfig = () => {
    switch (confirmationType) {
      case 'exclude':
        return {
          title: 'Exclude Source',
          description: `Are you sure you want to exclude "${url}"? This will hide the content from AI responses.`,
          confirmText: 'Exclude',
          isDestructive: true
        };
      case 'delete':
        return {
          title: 'Delete Child Page',
          description: `Are you sure you want to permanently delete "${url}"? This action cannot be undone.`,
          confirmText: isDeleting ? 'Deleting...' : 'Delete',
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
    <>
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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => window.open(url, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open URL
          </DropdownMenuItem>
          
          {onExclude && (
            <DropdownMenuItem onClick={handleExcludeClick}>
              <EyeOff className="w-4 h-4 mr-2" />
              Exclude
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
        disabled={isDeleting}
      />
    </>
  );
};

export default ChildPageActions;
