
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, List, ListOrdered, Link2, Smile } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useRAGServices } from "@/hooks/useRAGServices";
import { useTextSourcesPaginated } from "@/hooks/useSourcesPaginated";
import SourcesListPaginated from "./SourcesListPaginated";
import ErrorBoundary from "./ErrorBoundary";

const TextTabContent: React.FC = () => {
  const { agentId } = useParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { sources } = useRAGServices();
  
  const { 
    data, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch 
  } = useTextSourcesPaginated();

  // Flatten all pages into a single array
  const allSources = data?.pages?.flatMap(page => page.sources) || [];

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both title and content",
        variant: "destructive"
      });
      return;
    }

    if (!agentId) {
      toast({
        title: "Error",
        description: "Agent ID is required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Creating text source with content length:', content.length);
      
      const newSource = await sources.createSource({
        agent_id: agentId,
        source_type: 'text',
        title: title.trim(),
        content: content.trim(),
        metadata: {
          length: content.length,
          word_count: content.split(/\s+/).length,
          created_via: 'text_tab'
        }
      });

      console.log('Text source created successfully:', newSource);

      toast({
        title: "Text snippet added",
        description: "Your text snippet has been successfully saved"
      });

      // Clear the form and refetch data
      setTitle("");
      setContent("");
      refetch();
      
    } catch (error) {
      console.error("Error creating text snippet:", error);
      toast({
        title: "Error",
        description: "Failed to save text snippet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContentSize = () => {
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Add Text Snippet</h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="text-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <Input 
              id="text-title" 
              placeholder="Ex: Refund requests" 
              className="w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="text-content" className="block text-sm font-medium text-gray-700 mb-1">
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
                  <div className="ml-auto text-xs text-gray-400">{getContentSize()}</div>
                </div>
                <Textarea 
                  id="text-content" 
                  placeholder="Enter your text" 
                  className="border-0 focus-visible:ring-0 min-h-[200px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting}
                />
              </CardContent>
            </Card>
          </div>

          <div className="text-right mt-6">
            <Button 
              className="bg-gray-800 hover:bg-gray-700"
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? "Adding..." : "Add text snippet"}
            </Button>
          </div>
        </div>

        <SourcesListPaginated 
          sources={allSources} 
          loading={isLoading} 
          error={error?.message || null}
          onLoadMore={fetchNextPage}
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
          onSourceDeleted={() => refetch()}
        />
      </div>
    </div>
  );
};

const TextTab: React.FC = () => {
  return (
    <ErrorBoundary tabName="Text">
      <TextTabContent />
    </ErrorBoundary>
  );
};

export default TextTab;
