
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, List, ListOrdered, Link2, Smile, Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useRAGServices } from "@/hooks/useRAGServices";
import { useQASourcesPaginated } from "@/hooks/useSourcesPaginated";
import SourcesListPaginated from "./SourcesListPaginated";
import ErrorBoundary from "./ErrorBoundary";

const QATabContent: React.FC = () => {
  const { agentId } = useParams();
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
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
  } = useQASourcesPaginated();

  // Flatten all pages into a single array
  const allSources = data?.pages?.flatMap(page => page.sources) || [];

  const handleSubmit = async () => {
    if (!title.trim() || !question.trim() || !answer.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter title, question, and answer",
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
      const content = `Q: ${question.trim()}\n\nA: ${answer.trim()}`;
      
      const newSource = await sources.createSource({
        agent_id: agentId,
        source_type: 'qa',
        title: title.trim(),
        content: content,
        metadata: {
          question: question.trim(),
          answer: answer.trim(),
          questions_count: 1,
          created_via: 'qa_tab'
        }
      });

      console.log('Q&A source created successfully:', newSource);

      toast({
        title: "Q&A added",
        description: "Your Q&A has been successfully saved"
      });

      // Clear the form and refetch data
      setTitle("");
      setQuestion("");
      setAnswer("");
      refetch();
      
    } catch (error) {
      console.error("Error creating Q&A:", error);
      toast({
        title: "Error",
        description: "Failed to save Q&A. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContentSize = () => {
    const content = `Q: ${question}\n\nA: ${answer}`;
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h2 className="text-2xl font-semibold">Add Q&A</h2>
      </div>

      <div className="space-y-4">
        <Card className="border border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="qa-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <Input 
                id="qa-title" 
                placeholder="Ex: Refund requests" 
                className="w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="qa-question" className="block text-sm font-medium text-gray-700 mb-1">
                Question
              </label>
              <Input 
                id="qa-question" 
                placeholder="Ex: How do I request a refund?" 
                className="w-full"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center text-indigo-600 mb-2">
              <Plus size={16} className="mr-1" />
              <button className="text-sm font-medium">Add another question</button>
            </div>

            <div>
              <label htmlFor="qa-answer" className="block text-sm font-medium text-gray-700 mb-1">
                Answer
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
                    id="qa-answer" 
                    placeholder="Enter your answer..." 
                    className="border-0 focus-visible:ring-0 min-h-[150px]"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={isSubmitting}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="text-right">
              <Button 
                className="bg-gray-800 hover:bg-gray-700"
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim() || !question.trim() || !answer.trim()}
              >
                {isSubmitting ? "Adding..." : "Add Q&A"}
              </Button>
            </div>
          </div>
        </Card>

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

const QATab: React.FC = () => {
  return (
    <ErrorBoundary tabName="Q&A">
      <QATabContent />
    </ErrorBoundary>
  );
};

export default QATab;
