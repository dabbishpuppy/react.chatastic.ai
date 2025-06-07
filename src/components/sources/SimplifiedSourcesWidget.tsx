
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';
import { SimpleStatusService } from '@/services/SimpleStatusService';
import { useSimpleFlow } from '@/hooks/useSimpleFlow';

const SimplifiedSourcesWidget: React.FC = () => {
  const { statusSummary, buttonState, isTraining, startTraining } = useSimpleFlow();

  const handleTrainClick = () => {
    if (!buttonState.disabled) {
      startTraining();
    }
  };

  return (
    <Card className="bg-white border border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Agent Training</h3>
        </div>
        
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            {statusSummary.isEmpty ? (
              "Add sources to start training your agent"
            ) : statusSummary.isTraining ? (
              "Training in progress..."
            ) : statusSummary.canTrain ? (
              "Ready to train your agent with new content"
            ) : (
              "Agent is up to date"
            )}
          </div>
          
          <Button
            onClick={handleTrainClick}
            disabled={buttonState.disabled}
            variant={buttonState.variant}
            className="w-full"
            size="sm"
          >
            {buttonState.buttonText}
          </Button>
          
          {statusSummary.totalSources > 0 && (
            <div className="text-xs text-gray-500">
              {statusSummary.totalSources} source{statusSummary.totalSources !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedSourcesWidget;
