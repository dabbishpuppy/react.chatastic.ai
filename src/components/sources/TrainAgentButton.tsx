
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, Loader2, CheckCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { TrainingWorkflowService } from '@/services/rag/trainingWorkflowService';
import { supabase } from '@/integrations/supabase/client';

interface TrainAgentButtonProps {
  onTrainingStart?: () => void;
  onTrainingComplete?: () => void;
}

const TrainAgentButton: React.FC<TrainAgentButtonProps> = ({
  onTrainingStart,
  onTrainingComplete
}) => {
  const { agentId } = useParams();
  const [isTraining, setIsTraining] = useState(false);
  const [hasReadySources, setHasReadySources] = useState(false);
  const [allSourcesTrained, setAllSourcesTrained] = useState(false);

  // Check for sources that are ready for training
  useEffect(() => {
    if (!agentId) return;

    const checkReadySources = async () => {
      const { data: readySources, error } = await supabase
        .from('agent_sources')
        .select('id, crawl_status')
        .eq('agent_id', agentId)
        .eq('crawl_status', 'crawled')
        .eq('is_active', true);

      const { data: trainedSources, error: trainedError } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId)
        .eq('crawl_status', 'trained')
        .eq('is_active', true);

      if (!error && !trainedError) {
        setHasReadySources((readySources?.length || 0) > 0);
        setAllSourcesTrained((trainedSources?.length || 0) > 0 && (readySources?.length || 0) === 0);
      }
    };

    checkReadySources();

    // Set up real-time listener for source status changes
    const channel = supabase
      .channel(`training-status-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_sources',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('📊 Source status updated:', payload.new);
          checkReadySources();
          
          // Check if this update indicates training completion
          if (payload.new.crawl_status === 'trained') {
            setIsTraining(false);
            onTrainingComplete?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, onTrainingComplete]);

  // Listen for training completion events
  useEffect(() => {
    const handleTrainingCompleted = () => {
      console.log('🎉 Training completed event received');
      setIsTraining(false);
      toast({
        title: "Training Completed",
        description: "Your agent has been successfully trained with the new content!",
      });
      onTrainingComplete?.();
    };

    window.addEventListener('trainingCompleted', handleTrainingCompleted);
    
    return () => {
      window.removeEventListener('trainingCompleted', handleTrainingCompleted);
    };
  }, [onTrainingComplete]);

  const handleTrainAgent = async () => {
    if (!agentId) return;

    setIsTraining(true);
    onTrainingStart?.();

    try {
      // Get all sources ready for training
      const { data: readySources, error } = await supabase
        .from('agent_sources')
        .select('id')
        .eq('agent_id', agentId)
        .eq('crawl_status', 'crawled')
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to fetch ready sources: ${error.message}`);
      }

      if (!readySources || readySources.length === 0) {
        throw new Error('No sources ready for training');
      }

      console.log(`🚀 Starting training for ${readySources.length} sources`);

      // Start training for each ready source
      for (const source of readySources) {
        await TrainingWorkflowService.startSourceTraining(source.id);
      }

      toast({
        title: "Training Started",
        description: `Started training ${readySources.length} source(s). This may take a few minutes.`,
      });

    } catch (error) {
      console.error('❌ Training failed:', error);
      setIsTraining(false);
      
      toast({
        title: "Training Failed",
        description: error instanceof Error ? error.message : "Failed to start training",
        variant: "destructive",
      });
    }
  };

  // Don't show button if no agent or no sources
  if (!agentId) return null;

  // Show "Agent Trained" if all sources are trained
  if (allSourcesTrained && !hasReadySources) {
    return (
      <Button variant="outline" disabled className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        Agent Trained
      </Button>
    );
  }

  // Show training in progress
  if (isTraining) {
    return (
      <Button disabled className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Training Agent...
      </Button>
    );
  }

  // Show train button if sources are ready
  if (hasReadySources) {
    return (
      <Button onClick={handleTrainAgent} className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4" />
        Train Agent
      </Button>
    );
  }

  // Don't show button if no sources are ready
  return null;
};

export default TrainAgentButton;
