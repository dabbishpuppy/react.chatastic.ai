
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { useRAGServices } from '@/hooks/useRAGServices';
import { useParams } from 'react-router-dom';

const QASourceForm: React.FC = () => {
  const { agentId } = useParams();
  const { sources } = useRAGServices();
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !question.trim() || !answer.trim()) {
      toast({
        title: "Error",
        description: "Please provide title, question, and answer",
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
      // Create Q&A source with structured content
      const qaContent = `Question: ${question.replace(/<[^>]*>/g, '')}\n\nAnswer: ${answer}`;
      
      await sources.createSource({
        agent_id: agentId,
        team_id: '', // Will be set by the service based on agent
        source_type: 'qa',
        title: title,
        content: qaContent,
        metadata: {
          question: question.replace(/<[^>]*>/g, ''), // Store plain text question
          answer: answer, // Store rich text answer
          qa_type: 'manual'
        }
      });

      toast({
        title: "Success", 
        description: "Q&A pair added successfully"
      });
      
      // Reset form
      setTitle('');
      setQuestion('');
      setAnswer('');
    } catch (error) {
      console.error('Error creating Q&A source:', error);
      toast({
        title: "Error",
        description: "Failed to add Q&A pair",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Add Q&A Pair</CardTitle>
        <p className="text-sm text-gray-600">
          Craft responses for important questions, ensuring your AI Agent shares the most relevant info. 
          Use Custom Answers to add images and videos for enhanced engagement.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Refund requests"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: How do I request a refund?"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <Label htmlFor="answer">Answer</Label>
            <RichTextEditor
              value={answer}
              onChange={setAnswer}
              placeholder="Enter your answer..."
              disabled={isSubmitting}
              className="min-h-[200px]"
            />
          </div>
          
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Q&A"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default QASourceForm;
