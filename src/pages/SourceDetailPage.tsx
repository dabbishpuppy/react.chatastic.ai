import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Info, 
  MoreHorizontal, 
  Save, 
  X,
  FileText,
  File,
  Link,
  MessageCircleQuestion,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Smile,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRAGServices } from '@/hooks/useRAGServices';
import { AgentSource, SourceType } from '@/types/rag';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import DeleteSourceDialog from '@/components/sources/DeleteSourceDialog';
import SourcesWidget from '@/components/sources/SourcesWidget';
import AgentPageLayout from './AgentPageLayout';

const SourceDetailPage: React.FC = () => {
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
      toast({
        title: "Error",
        description: "Failed to load source details",
        variant: "destructive"
      });
      navigate(`/agent/${agentId}/sources?tab=text`);
    } finally {
      setLoading(false);
    }
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

    try {
      setSaving(true);
      await sources.updateSource(source.id, {
        title: editTitle.trim(),
        content: editContent.trim()
      });
      
      toast({
        title: "Success",
        description: "Source updated successfully"
      });
      
      setIsEditing(false);
      fetchSource(); // Refresh data
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
      
      // Navigate back to the correct tab based on source type
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

    // Navigate back to the correct tab based on source type
    const tabMap = {
      'text': 'text',
      'file': 'files',
      'website': 'website',
      'qa': 'qa'
    };
    const tab = tabMap[source.source_type] || 'text';
    navigate(`/agent/${agentId}/sources?tab=${tab}`);
  };

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

  const formatFileSize = (content?: string) => {
    if (!content) return '0 B';
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  if (loading) {
    return (
      <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Source Details">
        <div className="p-8 bg-[#f5f5f5] min-h-screen">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading source details...</div>
          </div>
        </div>
      </AgentPageLayout>
    );
  }

  if (!source) {
    return (
      <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Source Not Found">
        <div className="p-8 bg-[#f5f5f5] min-h-screen">
          <div className="text-center">
            <div className="text-red-500">Source not found</div>
            <Button 
              onClick={() => navigate(`/agent/${agentId}/sources?tab=text`)}
              className="mt-4"
            >
              Back to Sources
            </Button>
          </div>
        </div>
      </AgentPageLayout>
    );
  }

  return (
    <AgentPageLayout defaultActiveTab="sources" defaultPageTitle="Source Details" showPageTitle={false}>
      <div className="p-8 bg-[#f5f5f5] min-h-screen">
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBackClick}
                    className="flex-shrink-0 bg-white hover:bg-gray-50"
                  >
                    <ArrowLeft size={20} />
                  </Button>
                  {getSourceIcon(source.source_type)}
                  <h1 className="text-3xl font-bold">
                    {isEditing ? 'Edit Source' : source.title}
                  </h1>
                </div>
                
                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="bg-white hover:bg-gray-50">
                          <Info size={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-xs">
                          <div><strong>Created:</strong> {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}</div>
                          <div><strong>Size:</strong> {formatFileSize(source.content)}</div>
                          <div><strong>Type:</strong> {getSourceTypeLabel(source.source_type)}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowDeleteDialog(true)}
                    className="bg-white hover:bg-gray-50"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </Button>
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Enter source title"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Text
                      </label>
                      <Card className="border border-gray-200">
                        <CardContent className="p-0">
                          <div className="flex items-center p-2 border-b border-gray-200">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Bold size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Italic size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ListOrdered size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <List size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Link2 size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Smile size={16} />
                            </Button>
                          </div>
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Enter source content"
                            className="border-0 focus-visible:ring-0 min-h-[400px]"
                          />
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditTitle(source.title);
                          setEditContent(source.content || '');
                        }}
                        disabled={isSaving}
                      >
                        <X size={16} className="mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving || !editTitle.trim()}
                      >
                        <Save size={16} className="mr-2" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-semibold">{source.title}</h2>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </Button>
                    </div>
                    
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-gray-700">
                        {source.content || 'No content available'}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sources widget sidebar */}
          <div className="w-80 flex-shrink-0">
            <SourcesWidget />
          </div>
        </div>

        <DeleteSourceDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          sourceTitle={source.title}
          isDeleting={isDeleting}
        />
      </div>
    </AgentPageLayout>
  );
};

export default SourceDetailPage;
