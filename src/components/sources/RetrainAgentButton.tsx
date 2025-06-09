
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RetrainingService } from '@/services/rag/retrainingService';
import { useParams } from 'react-router-dom';

interface RetrainAgentButtonProps {
  onTrainingStart?: () => void;
  onTrainingComplete?: () => void;
  disabled?: boolean;
}

const RetrainAgentButton: React.FC<RetrainAgentButtonProps> = ({
  onTrainingStart,
  onTrainingComplete,
  disabled = false
}) => {
  const { agentId } = useParams();
  const [isRetraining, setIsRetraining] = useState(false);
  const { toast } = useToast();

  const handleRetrain = async () => {
    if (!agentId || isRetraining) return;

    try {
      setIsRetraining(true);
      onTrainingStart?.();
      
      console.log('🎓 Starting agent retraining (chunking phase):', agentId);

      toast({
        title: "Retraining Started",
        description: "Creating chunks and embeddings for all completed sources...",
      });

      // Start the retraining process which will chunk all completed sources
      const success = await RetrainingService.retrainAgent(agentId, (progress) => {
        console.log('📊 Training progress:', progress);
        
        if (progress.status === 'completed') {
          toast({
            title: "Retraining Complete",
            description: `Successfully processed ${progress.processedSources}/${progress.totalSources} sources`,
          });
        } else if (progress.status === 'failed') {
          toast({
            title: "Retraining Error",
            description: progress.errorMessage || 'Unknown error occurred',
            variant: "destructive"
          });
        }
      });

      if (success) {
        console.log('✅ Agent retraining completed successfully');
        onTrainingComplete?.();
      } else {
        throw new Error('Retraining completed but no sources were processed');
      }

    } catch (error) {
      console.error('❌ Retraining failed:', error);
      toast({
        title: "Retraining Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsRetraining(false);
    }
  };

  return (
    <Button
      onClick={handleRetrain}
      disabled={disabled || isRetraining || !agentId}
      className="flex items-center gap-2"
    >
      {isRetraining ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GraduationCap className="h-4 w-4" />
      )}
      {isRetraining ? 'Creating Chunks...' : 'Retrain Agent'}
    </Button>
  );
};

export default RetrainAgentButton;
