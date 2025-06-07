
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, FileText, RefreshCw } from "lucide-react";
import { useSimplifiedFlow } from "@/hooks/useSimplifiedFlow";
import { useEnhancedAgentRetraining } from "@/hooks/useEnhancedAgentRetraining";
import { useParams } from "react-router-dom";
import SourceRow from "./SourceRow";
import TrainingProgressMessage from "./TrainingProgressMessage";
import SizeLimitWarning from "./SizeLimitWarning";

interface SimplifiedSourcesWidgetProps {
  currentTab?: string;
  sourcesByType?: Record<string, { count: number; size: number }>;
  totalSize?: string;
}

const SimplifiedSourcesWidget: React.FC<SimplifiedSourcesWidgetProps> = ({
  currentTab,
  sourcesByType = {},
  totalSize = "0 B"
}) => {
  const { agentId } = useParams();
  const { statusSummary, buttonState, startTraining } = useSimplifiedFlow();
  const { trainingProgress } = useEnhancedAgentRetraining(agentId);

  // Calculate total size in bytes for limit checking
  const totalSizeBytes = Object.values(sourcesByType).reduce((total, data) => total + data.size, 0);
  const SIZE_LIMIT_BYTES = 500 * 1024; // 500KB
  const isFreePlan = true; // This would come from user subscription data
  const showSizeWarning = isFreePlan && totalSizeBytes >= SIZE_LIMIT_BYTES;

  const getButtonIcon = () => {
    if (buttonState.buttonText === 'Training Agent...') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (buttonState.buttonText === 'Agent Trained') {
      return <CheckCircle className="h-4 w-4" />;
    }
    return <RefreshCw className="h-4 w-4" />;
  };

  const getButtonClassName = () => {
    if (buttonState.buttonText === 'Training Agent...') {
      return "bg-blue-50 border-blue-200 text-blue-700 w-full";
    }
    if (buttonState.buttonText === 'Agent Trained') {
      return "bg-green-50 border-green-200 text-green-700 w-full";
    }
    return "bg-black hover:bg-gray-800 text-white w-full";
  };

  // Get training status for progress message
  const getTrainingStatus = () => {
    if (trainingProgress?.status === 'initializing') return 'initializing';
    if (trainingProgress?.status === 'training') return 'training';
    return null;
  };

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 uppercase tracking-wide">
            SOURCES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusSummary.isEmpty ? (
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

              {/* Total Size */}
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total size:</span>
                <span className="text-gray-900 font-semibold">{totalSize}</span>
              </div>

              {/* Simplified Training Button */}
              {buttonState.showButton && (
                <div>
                  <Button
                    size="sm"
                    variant={buttonState.variant}
                    onClick={startTraining}
                    disabled={buttonState.disabled}
                    className={getButtonClassName()}
                  >
                    {getButtonIcon()}
                    {buttonState.buttonText}
                  </Button>

                  {/* Training Progress Message */}
                  <TrainingProgressMessage status={getTrainingStatus()} />

                  {/* Size Limit Warning */}
                  <SizeLimitWarning 
                    totalSize={totalSizeBytes} 
                    isVisible={showSizeWarning} 
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimplifiedSourcesWidget;
