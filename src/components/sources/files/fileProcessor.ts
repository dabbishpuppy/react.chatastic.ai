
import { useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useRAGServices } from '@/hooks/useRAGServices';
import { getFileProcessor } from '@/utils/fileProcessing';
import { UploadedFile } from './types';

export const useFileProcessor = (
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
  refetch: () => void
) => {
  const { agentId } = useParams();
  const { sources } = useRAGServices();

  const processFile = async (uploadedFile: UploadedFile) => {
    try {
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'processing', progress: 50 } : f)
      );

      const processor = getFileProcessor(uploadedFile.file);
      const result = await processor(uploadedFile.file);
      
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, progress: 75 } : f)
      );

      if (!agentId) {
        throw new Error('Agent ID is required');
      }

      // Calculate content size in bytes
      const contentSize = new Blob([result.content]).size;

      // Create the source in the database
      const newSource = await sources.createSource({
        agent_id: agentId,
        source_type: 'file',
        title: uploadedFile.file.name,
        content: result.content,
        metadata: {
          filename: uploadedFile.file.name,
          original_size: uploadedFile.file.size,
          file_size: contentSize,
          fileType: uploadedFile.file.type,
          uploadedAt: new Date().toISOString(),
          ...result.metadata
        }
      });

      console.log('✅ New source created:', newSource);

      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { ...f, status: 'complete', progress: 100 } : f)
      );

      toast({
        title: "File uploaded successfully",
        description: `${uploadedFile.file.name} has been processed and added to your sources`
      });

      // Manually refetch sources to ensure UI updates immediately
      setTimeout(() => {
        refetch();
      }, 500);

    } catch (error) {
      console.error('Error processing file:', error);
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadedFile.id ? { 
          ...f, 
          status: 'error', 
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        } : f)
      );

      toast({
        title: "Upload failed",
        description: `Failed to process ${uploadedFile.file.name}`,
        variant: "destructive"
      });
    }
  };

  return { processFile };
};
