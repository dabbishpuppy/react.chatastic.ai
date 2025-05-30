
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { useParams } from 'react-router-dom';
import TextByteCounter from './TextByteCounter';

const TextSourceForm: React.FC = () => {
  const { agentId } = useParams();
  const { sources } = useRAGServices();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both title and content",
        variant: "destructive"
      });
      return;
    }

    if (!agentId) {
      toast({
        title: "Error",
        description: "No agent ID found",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await sources.createSource({
        agent_id: agentId,
        source_type: 'text',
        title: title.trim(),
        content: content.trim()
      });

      toast({
        title: "Success",
        description: "Text source created successfully"
      });

      // Clear form
      setTitle('');
      setContent('');
    } catch (error) {
      console.error('Error creating text source:', error);
      toast({
        title: "Error",
        description: "Failed to create text source",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">Add Text Source</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this text..."
              required
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="content">Content</Label>
              <TextByteCounter text={content} />
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your text content..."
              className="min-h-[200px]"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Adding...' : 'Add Text Source'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TextSourceForm;
