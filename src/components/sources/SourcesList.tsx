import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  ChevronRight, 
  FileText, 
  Link, 
  MessageCircleQuestion, 
  File,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgentSource, SourceType } from '@/types/rag';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { useRAGServices } from '@/hooks/useRAGServices';
import { toast } from '@/hooks/use-toast';
import DeleteSourceDialog from './DeleteSourceDialog';

interface SourcesListProps {
  sources: AgentSource[];
  loading: boolean;
  error: string | null;
  onSourceDeleted?: (sourceId: string) => void;
}

const SourcesList: React.FC<SourcesListProps> = ({ 
  sources, 
  loading, 
  error, 
  onSourceDeleted 
}) => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const { sources: sourceService } = useRAGServices();
  
  const [deleteSource, setDeleteSource] = useState<AgentSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [optimisticSources, setOptimisticSources] = useState<AgentSource[]>(sources);

  // Update optimistic sources when props change
  React.useEffect(() => {
    setOptimisticSources(sources);
  }, [sources]);

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'text':
        return <FileText size={16} className="text-blue-600" />;
      case 'file':
        return <File size={16} className="text-green-600" />;
      case 'website':
        return <Link size={16} className="text-purple-600" />;
      case 'qa':
        return <MessageCircleQuestion size={16} className="text-orange-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getSourceTypeLabel = (type: SourceType) => {
    switch (type) {
      case 'text':
        return 'Text';
      case 'file':
        return 'File';
      case 'website':
        return 'Website';
      case 'qa':
        return 'Q&A';
      default:
        return type;
    }
  };

  const formatFileSize = (source: AgentSource) => {
    // For text sources, prioritize metadata sizes first
    if (source.source_type === 'text' && source.metadata) {
      const metadata = source.metadata as any;
      if (metadata.original_size && typeof metadata.original_size === 'number') {
        const bytes = metadata.original_size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${Math.round(bytes / (1024 * 1024))} MB`;
      }
      if (metadata.file_size && typeof metadata.file_size === 'number') {
        const bytes = metadata.file_size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${Math.round(bytes / (1024 * 1024))} MB`;
      }
    }

    // For file sources, check metadata for original_size first
    if (source.source_type === 'file' && source.metadata) {
      const metadata = source.metadata as any;
      if (metadata.original_size && typeof metadata.original_size === 'number') {
        const bytes = metadata.original_size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${Math.round(bytes / (1024 * 1024))} MB`;
      }
      // Also check for file_size in metadata
      if (metadata.file_size && typeof metadata.file_size === 'number') {
        const bytes = metadata.file_size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${Math.round(bytes / (1024 * 1024))} MB`;
      }
    }

    // For website sources with child content, check total_content_size
    if (source.source_type === 'website' && source.metadata) {
      const metadata = source.metadata as any;
      if (metadata.total_content_size && typeof metadata.total_content_size === 'number') {
        const bytes = metadata.total_content_size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${Math.round(bytes / (1024 * 1024))} MB`;
      }
    }

    // Fall back to content length calculation for all types
    if (!source.content) return '0 B';
    const bytes = new TextEncoder().encode(source.content).length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const handleDeleteClick = (source: AgentSource, event: React.MouseEvent) => {
    event.stopPropagation();
    setDeleteSource(source);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSource) return;

    try {
      setIsDeleting(true);
      
      // Optimistically remove the source from the list
      setOptimisticSources(prev => prev.filter(s => s.id !== deleteSource.id));
      
      // Call the API to delete the source
      await sourceService.deleteSource(deleteSource.id);
      
      toast({
        title: "Success",
        description: "Source deleted successfully"
      });
      
      // Notify parent component with the source ID for efficient state updates
      if (onSourceDeleted) {
        onSourceDeleted(deleteSource.id);
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      
      // Revert optimistic update on error
      setOptimisticSources(sources);
      
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeleteSource(null);
    }
  };

  const handleRowClick = (source: AgentSource) => {
    navigate(`/agent/${agentId}/sources/${source.id}`);
  };

  const handleNavigateClick = (source: AgentSource, event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/agent/${agentId}/sources/${source.id}`);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="text-gray-500">Loading sources...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center text-red-500">
          Error: {error}
        </div>
      </Card>
    );
  }

  if (optimisticSources.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <p>No sources found</p>
          <p className="text-sm mt-1">Add your first source using the form above</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Sources ({optimisticSources.length})</h3>
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticSources.map((source) => (
              <TableRow 
                key={source.id} 
                className="cursor-pointer hover:bg-gray-50 transition-opacity duration-200"
                onClick={() => handleRowClick(source)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      {getSourceIcon(source.source_type)}
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
                  <Badge variant="secondary">
                    {getSourceTypeLabel(source.source_type)}
                  </Badge>
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
                          onClick={(e) => handleDeleteClick(source, e)}
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
                      onClick={(e) => handleNavigateClick(source, e)}
                    >
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <DeleteSourceDialog
        open={!!deleteSource}
        onOpenChange={(open) => !open && setDeleteSource(null)}
        onConfirm={handleDeleteConfirm}
        sourceTitle={deleteSource?.title || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default SourcesList;
