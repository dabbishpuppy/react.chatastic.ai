
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { useParams } from 'react-router-dom';
import RichTextEditor from '@/components/ui/rich-text-editor';
import RichTextByteCounter from './RichTextByteCounter';
import { supabase } from '@/integrations/supabase/client';

const TextSourceForm: React.FC = () => {
  const { agentId } = useParams();
  const { sources } = useRAGServices();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainTextContent = stripHtml(content);
    
    if (!title.trim() || !plainTextContent.trim()) {
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
      // Get team_id from agent
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      // Calculate the byte size for storage
      const byteCount = new TextEncoder().encode(plainTextContent).length;
      
      const newSource = await sources.createSource({
        agent_id: agentId,
        team_id: agent.team_id,
        source_type: 'text',
        title: title.trim(),
        content: content.trim(), // Store the HTML content
        metadata: {
          original_size: byteCount,
          file_size: byteCount,
          content_type: 'text/html',
          isHtml: true
        }
      });

      toast({
        title: "Success",
        description: "Text source created successfully"
      });

      // Trigger a custom event to notify other components about the new source
      window.dispatchEvent(new CustomEvent('sourceCreated', {
        detail: { 
          sourceId: newSource.id, 
          agentId,
          sourceType: 'text'
        }
      }));

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
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mx-0 my-[20px]">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Enter a title for this text..." 
              required 
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="content">Content</Label>
              <RichTextByteCounter html={content} />
            </div>
            <RichTextEditor 
              value={content} 
              onChange={setContent} 
              placeholder="Enter your text content..." 
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Adding...' : 'Add Text Source'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TextSourceForm;
