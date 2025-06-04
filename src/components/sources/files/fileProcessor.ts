
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { getFileProcessor } from '@/utils/fileProcessing';
import { UploadedFile } from './types';

export const useFileProcessor = (
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
  refetch: () => void
) => {
  const { agentId } = useParams();

  const processFile = async (uploadedFile: UploadedFile) => {
    if (!agentId) return;

    try {
      // Update status to processing
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'processing', progress: 50 } : f)
      );

      const processor = getFileProcessor(uploadedFile.file);
      const result = await processor(uploadedFile.file);

      if (!result.content || result.content.trim().length === 0) {
        throw new Error('No content could be extracted from the file');
      }

      // Get team_id for the current agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('team_id')
        .eq('id', agentId)
        .single();

      if (agentError) throw agentError;

      // Create the source in the database
      const { data: source, error: sourceError } = await supabase
        .from('agent_sources')
        .insert({
          agent_id: agentId,
          team_id: agentData.team_id,
          source_type: 'file',
          title: uploadedFile.file.name,
          content: result.content,
          metadata: {
            file_name: uploadedFile.file.name,
            file_size: uploadedFile.file.size,
            file_type: uploadedFile.file.type,
            processing_status: 'pending',
            uploaded_at: new Date().toISOString(),
            ...result.metadata
          }
        })
        .select()
        .single();

      if (sourceError) throw sourceError;

      // Update status to complete
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'complete', progress: 100 } : f)
      );

      // Trigger refetch to update the sources list
      refetch();

      // Trigger a custom event to notify other components about the upload
      window.dispatchEvent(new CustomEvent('fileUploaded', {
        detail: { sourceId: source.id, agentId }
      }));

      toast({
        title: "File uploaded successfully",
        description: `${uploadedFile.file.name} has been added to your sources`
      });

    } catch (error) {
      console.error('Error processing file:', error);
      
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'error', progress: 0 } : f)
      );

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    }
  };

  return { processFile };
};
