
import React, { useState } from 'react';
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
import WebsiteActionConfirmDialog from './WebsiteActionConfirmDialog';
import WebsiteEditDialog from './WebsiteEditDialog';

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
  const [showRecrawlConfirm, setShowRecrawlConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExcludeConfirm, setShowExcludeConfirm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isCrawling = source.crawl_status === 'in_progress' || source.crawl_status === 'pending';
  const buttonSize = isChild ? 'h-6 w-6' : 'h-8 w-8';
  const iconSize = isChild ? 14 : 18;
  const isParentSource = !source.parent_source_id;

  const handleRecrawlConfirm = () => {
    onRecrawl(source);
    setShowRecrawlConfirm(false);
  };

  const handleDeleteConfirm = () => {
    onDelete(source);
    setShowDeleteConfirm(false);
  };

  const handleExcludeConfirm = () => {
    onExclude(source);
    setShowExcludeConfirm(false);
  };

  const handleEditSave = (sourceId: string, newUrl: string) => {
    onEdit(sourceId, newUrl);
  };

  return (
    <>
      <div className="flex items-center ml-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className={buttonSize}>
              <MoreHorizontal size={iconSize} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white border shadow-lg z-50">
            {showRecrawl && (
              <DropdownMenuItem 
                onClick={() => setShowRecrawlConfirm(true)} 
                disabled={isCrawling} 
                className="text-sm"
              >
                {isCrawling ? (
                  <Loader2 size={isChild ? 14 : 16} className="mr-2 animate-spin" />
                ) : (
                  <RefreshCw size={isChild ? 14 : 16} className="mr-2" />
                )}
                Recrawl
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setShowEditDialog(true)} className="text-sm">
              <Edit size={isChild ? 14 : 16} className="mr-2" />
              Edit
            </DropdownMenuItem>
            {/* Only show exclude option for child sources */}
            {!isParentSource && (
              <DropdownMenuItem onClick={() => setShowExcludeConfirm(true)} className="text-sm">
                <EyeOff size={isChild ? 14 : 16} className="mr-2" />
                {source.is_excluded ? 'Include' : 'Exclude'} link
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 text-sm"
            >
              <Trash2 size={isChild ? 14 : 16} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Recrawl Confirmation Dialog */}
      <WebsiteActionConfirmDialog
        open={showRecrawlConfirm}
        onOpenChange={setShowRecrawlConfirm}
        title="Confirm Recrawl"
        description={`Are you sure you want to recrawl "${source.title}"? This will fetch the latest content and may take some time.`}
        confirmText="Recrawl"
        onConfirm={handleRecrawlConfirm}
      />

      {/* Delete Confirmation Dialog */}
      <WebsiteActionConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Confirm Delete"
        description={`Are you sure you want to delete "${source.title}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        isDestructive={true}
      />

      {/* Exclude/Include Confirmation Dialog */}
      <WebsiteActionConfirmDialog
        open={showExcludeConfirm}
        onOpenChange={setShowExcludeConfirm}
        title={`Confirm ${source.is_excluded ? 'Include' : 'Exclude'}`}
        description={`Are you sure you want to ${source.is_excluded ? 'include' : 'exclude'} "${source.title}"?`}
        confirmText={source.is_excluded ? 'Include' : 'Exclude'}
        onConfirm={handleExcludeConfirm}
      />

      {/* Edit Dialog */}
      <WebsiteEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        source={source}
        onSave={handleEditSave}
      />
    </>
  );
};

export default WebsiteSourceActions;
