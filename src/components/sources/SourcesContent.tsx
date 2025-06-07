
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, FileText, RefreshCw, Info } from "lucide-react";
import { useEnhancedAgentRetraining } from "@/hooks/useEnhancedAgentRetraining";
import { useParams } from "react-router-dom";
import SourceRow from "./SourceRow";
import TrainingProgressMessage from "./TrainingProgressMessage";
import SizeLimitWarning from "./SizeLimitWarning";

interface SourcesContentProps {
  totalSources: number;
  totalSize: string;
  sourcesByType: Record<string, { count: number; size: number }>;
  currentTab?: string;
  onRetrainClick: () => void;
  retrainingNeeded: boolean;
  isRetraining: boolean;
  isTrainingCompleted?: boolean;
  trainingProgress?: {
    status: 'idle' | 'initializing' | 'training' | 'completed' | 'failed';
    progress: number;
  };
}

const SourcesContent: React.FC<SourcesContentProps> = ({
  totalSources,
  totalSize,
  sourcesByType,
  onRetrainClick,
  retrainingNeeded,
  isRetraining,
  isTrainingCompleted = false,
  trainingProgress
}) => {
  const { agentId } = useParams();
  const { trainingProgress: enhancedTrainingProgress } = useEnhancedAgentRetraining(agentId);

  // Calculate total size in bytes for limit checking
  const totalSizeBytes = Object.values(sourcesByType).reduce((total, data) => total + data.size, 0);
  const SIZE_LIMIT_BYTES = 500 * 1024; // 500KB
  const isFreePlan = true; // This would come from user subscription data
  const showSizeWarning = isFreePlan && totalSizeBytes >= SIZE_LIMIT_BYTES;

  // Format total size with limit for free users
  const formatTotalSizeWithLimit = () => {
    if (isFreePlan) {
      return `${totalSize} / 500 KB`;
    }
    return totalSize;
  };

  const getRetrainButtonProps = () => {
    const status = trainingProgress?.status;
    
    // Training in progress
    if (status === 'training' || status === 'initializing' || isRetraining) {
      return {
        variant: "outline" as const,
        disabled: true,
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: "Training...",
        className: "bg-blue-50 border-blue-200 text-blue-700 w-full"
      };
    }
    
    // Training completed and up to date
    if (status === 'completed' && !retrainingNeeded) {
      return {
        variant: "outline" as const,
        disabled: false,
        icon: <CheckCircle className="h-4 w-4" />,
        text: "Agent Trained",
        className: "bg-green-50 border-green-200 text-green-700 w-full"
      };
    }
    
    // Training needed
    return {
      variant: "default" as const,
      disabled: false,
      icon: <RefreshCw className="h-4 w-4" />,
      text: "Retrain Agent",
      className: "bg-black hover:bg-gray-800 text-white w-full"
    };
  };

  const buttonProps = getRetrainButtonProps();

  // Check if there are no sources
  const hasAnySources = Object.values(sourcesByType).some(data => data.count > 0);

  // Get training status for progress message
  const getTrainingStatus = () => {
    if (enhancedTrainingProgress?.status === 'initializing') return 'initializing';
    if (enhancedTrainingProgress?.status === 'training') return 'training';
    if (trainingProgress?.status === 'initializing') return 'initializing';
    if (trainingProgress?.status === 'training') return 'training';
    return null;
  };

  // Show retraining info message when retraining is needed or button is available
  const showRetrainingInfo = retrainingNeeded || (!isRetraining && buttonProps.text === "Retrain Agent");

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 uppercase tracking-wide">
            SOURCES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAnySources ? (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">No sources added yet</h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                  Add your first source to train your AI agent. You can upload files, add text content, websites, or Q&A pairs.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Sources List */}
              <div className="space-y-1">
                {Object.entries(sourcesByType)
                  .filter(([, data]) => data.count > 0)
                  .map(([type, data]) => (
                    <SourceRow
                      key={type}
                      type={type}
                      count={data.count}
                      size={data.size}
                    />
                  ))}
              </div>

              {/* Divider */}
              <div className="border-t border-dotted border-gray-300 my-4"></div>

              {/* Total Size with Limit */}
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total size:</span>
                <span className="text-gray-900 font-semibold">{formatTotalSizeWithLimit()}</span>
              </div>

              {/* Simple Training Button */}
              <div className="space-y-3">
                <Button
                  size="sm"
                  variant={buttonProps.variant}
                  onClick={onRetrainClick}
                  disabled={buttonProps.disabled}
                  className={buttonProps.className}
                >
                  {buttonProps.icon}
                  {buttonProps.text}
                </Button>

                {/* Retraining Info Message */}
                {showRetrainingInfo && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">Training time varies</span>
                      <br />
                      Retraining duration depends on the number of links and content in your sources. More content means longer training time.
                    </div>
                  </div>
                )}

                {/* Training Progress Message */}
                <TrainingProgressMessage status={getTrainingStatus()} />

                {/* Size Limit Warning */}
                <SizeLimitWarning 
                  totalSize={totalSizeBytes} 
                  isVisible={showSizeWarning} 
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SourcesContent;
