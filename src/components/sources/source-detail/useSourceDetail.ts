
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRAGServices } from '@/hooks/useRAGServices';
import { AgentSource } from '@/types/rag';
import { useToast } from '@/hooks/use-toast';

export const useSourceDetail = () => {
  const { agentId, sourceId } = useParams();
  const navigate = useNavigate();
  const { sources } = useRAGServices();
  const { toast } = useToast();
  
  const [source, setSource] = useState<AgentSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (agentId && sourceId) {
      fetchSource();
    }
  }, [agentId, sourceId]);

  const fetchSource = async () => {
    try {
      setLoading(true);
      const sourceData = await sources.getSourceWithStats(sourceId!);
      setSource(sourceData);
      setEditTitle(sourceData.title);
      setEditContent(sourceData.content || '');
    } catch (error) {
      console.error('Error fetching source:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        toast({
          title: "Source Not Found",
          description: "This source may have been deleted or moved. Redirecting to sources page.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load source details",
          variant: "destructive"
        });
      }
      
      navigate(`/agent/${agentId}/sources?tab=text`);
    } finally {
      setLoading(false);
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleSave = async () => {
    if (!source || !editTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive"
      });
      return;
    }

    // Check if content is HTML or plain text
    const isHtmlContent = source.metadata?.isHtml || editContent.includes('<');
    const contentToSave = editContent.trim();
    
    try {
      setSaving(true);
      
      // Calculate size for metadata
      const plainText = isHtmlContent ? stripHtml(contentToSave) : contentToSave;
      const byteCount = new TextEncoder().encode(plainText).length;
      
      await sources.updateSource(source.id, {
        title: editTitle.trim(),
        content: contentToSave,
        metadata: {
          ...source.metadata,
          original_size: byteCount,
          file_size: byteCount,
          content_type: isHtmlContent ? 'text/html' : 'text/plain',
          isHtml: isHtmlContent
        }
      });
      
      toast({
        title: "Success",
        description: "Source updated successfully"
      });
      
      setIsEditing(false);
      fetchSource();
    } catch (error) {
      console.error('Error updating source:', error);
      toast({
        title: "Error",
        description: "Failed to update source",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!source) return;

    try {
      setIsDeleting(true);
      await sources.deleteSource(source.id);
      
      toast({
        title: "Success",
        description: "Source deleted successfully"
      });
      
      const tabMap = {
        'text': 'text',
        'file': 'files',
        'website': 'website',
        'qa': 'qa'
      };
      const tab = tabMap[source.source_type] || 'text';
      navigate(`/agent/${agentId}/sources?tab=${tab}`);
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBackClick = () => {
    if (!source) {
      navigate(`/agent/${agentId}/sources?tab=text`);
      return;
    }

    const tabMap = {
      'text': 'text',
      'file': 'files',
      'website': 'website',
      'qa': 'qa'
    };
    const tab = tabMap[source.source_type] || 'text';
    navigate(`/agent/${agentId}/sources?tab=${tab}`);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(source?.title || '');
    setEditContent(source?.content || '');
  };

  return {
    source,
    loading,
    isEditing,
    isSaving,
    isDeleting,
    showDeleteDialog,
    editTitle,
    editContent,
    setIsEditing,
    setShowDeleteDialog,
    setEditTitle,
    setEditContent,
    handleSave,
    handleDelete,
    handleBackClick,
    handleCancelEdit,
    agentId
  };
};
