
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useStatusAggregationTrigger = () => {
  const [isTriggering, setIsTriggering] = useState(false);
  const { toast } = useToast();

  const triggerStatusAggregation = async (parentSourceId: string) => {
    if (!parentSourceId) {
      console.error('Parent source ID is required');
      return;
    }

    try {
      setIsTriggering(true);
      console.log(`🔄 Triggering status aggregation for parent: ${parentSourceId}`);

      const { data, error } = await supabase.functions.invoke('trigger-status-aggregation', {
        body: { parentSourceId }
      });

      if (error) {
        console.error('❌ Error triggering status aggregation:', error);
        toast({
          title: "Error",
          description: "Failed to update source metadata",
          variant: "destructive"
        });
        return;
      }

      console.log(`✅ Status aggregation completed:`, data);
      toast({
        title: "Success",
        description: "Source metadata updated successfully",
      });

      return data;
    } catch (error) {
      console.error('❌ Error in triggerStatusAggregation:', error);
      toast({
        title: "Error",
        description: "Failed to update source metadata",
        variant: "destructive"
      });
    } finally {
      setIsTriggering(false);
    }
  };

  return {
    triggerStatusAggregation,
    isTriggering
  };
};
