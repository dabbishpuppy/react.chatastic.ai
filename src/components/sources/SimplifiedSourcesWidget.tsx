
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';
import { SimpleStatusService } from '@/services/SimpleStatusService';
import { useSimpleFlow } from '@/hooks/useSimpleFlow';
import { useAgentSourceStats } from '@/hooks/useAgentSourceStats';
import SourceRow from './SourceRow';

const SimplifiedSourcesWidget: React.FC = () => {
  const { statusSummary, buttonState, isTraining, startTraining } = useSimpleFlow();
  const { data: stats, isLoading, error } = useAgentSourceStats();

  const handleTrainClick = () => {
    if (!buttonState.disabled) {
      startTraining();
    }
  };

  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
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

          {/* Source breakdown */}
          {!isLoading && !error && stats && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-gray-700 mb-2">Sources</div>
              <div className="space-y-1">
                {Object.entries(stats.sourcesByType).map(([type, data]) => (
                  data.count > 0 && (
                    <SourceRow
                      key={type}
                      type={type}
                      count={data.count}
                      size={data.size}
                    />
                  )
                ))}
              </div>
              {stats.totalBytes > 0 && (
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">Total</span>
                    <span className="text-gray-600">{formatTotalSize(stats.totalBytes)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedSourcesWidget;
