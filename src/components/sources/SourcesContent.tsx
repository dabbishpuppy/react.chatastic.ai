
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, Loader2, AlertTriangle, FileText } from "lucide-react";
import SourceRow from "./SourceRow";

interface SourcesContentProps {
  totalSources: number;
  totalSize: string;
  sourcesByType: Record<string, { count: number; size: number }>;
  currentTab?: string;
  onRetrainClick: () => void;
  retrainingNeeded: boolean;
  isRetraining: boolean;
  isTrainingInBackground?: boolean;
  isTrainingCompleted?: boolean;
  requiresTraining?: boolean;
  unprocessedCrawledPages?: number;
}

const SourcesContent: React.FC<SourcesContentProps> = ({
  totalSources,
  totalSize,
  sourcesByType,
  currentTab,
  onRetrainClick,
  retrainingNeeded,
  isRetraining,
  isTrainingInBackground = false,
  isTrainingCompleted = false,
  requiresTraining = false,
  unprocessedCrawledPages = 0
}) => {
  const getRetrainButtonProps = () => {
    // Training completed - show green success state (highest priority)
    if (isTrainingCompleted && !retrainingNeeded && !requiresTraining) {
      return {
        variant: "outline" as const,
        disabled: false, // Always clickable
        icon: <CheckCircle className="h-4 w-4" />,
        text: "Agent Trained",
        className: "bg-green-50 border-green-200 text-green-700 w-full"
      };
    }
    
    // Training active or in background - show yellow progress state
    if (isRetraining || isTrainingInBackground) {
      return {
        variant: "outline" as const,
        disabled: false, // Always clickable to view progress
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: isTrainingInBackground ? "Agent Training In Progress" : "Processing...",
        className: "bg-yellow-50 border-yellow-200 text-yellow-700 w-full"
      };
    }
    
    // Training needed - show action button
    if (retrainingNeeded || requiresTraining) {
      return {
        variant: "default" as const,
        disabled: false, // Always clickable
        icon: <RefreshCw className="h-4 w-4" />,
        text: unprocessedCrawledPages > 0 ? "Train crawled pages" : "Retrain agent",
        className: "bg-black hover:bg-gray-800 text-white w-full"
      };
    }
    
    // Default up-to-date state
    return {
      variant: "outline" as const,
      disabled: false, // Always clickable
      icon: <CheckCircle className="h-4 w-4" />,
      text: "Agent Trained",
      className: "bg-green-50 border-green-200 text-green-700 w-full"
    };
  };

  const buttonProps = getRetrainButtonProps();

  const getTrainingMessage = () => {
    if (isTrainingInBackground) {
      return "Training is running in the background";
    }
    if (unprocessedCrawledPages > 0) {
      return `${unprocessedCrawledPages} crawled page${unprocessedCrawledPages > 1 ? 's' : ''} need${unprocessedCrawledPages === 1 ? 's' : ''} training`;
    }
    if (retrainingNeeded) {
      return "Retraining is required for changes to apply";
    }
    return null;
  };

  const trainingMessage = getTrainingMessage();

  console.log('🔍 SourcesContent button state:', {
    isTrainingCompleted,
    isRetraining,
    isTrainingInBackground,
    retrainingNeeded,
    requiresTraining,
    buttonText: buttonProps.text,
    buttonDisabled: buttonProps.disabled
  });

  // Check if there are no sources
  const hasAnySources = Object.values(sourcesByType).some(data => data.count > 0);

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
            /* No Sources Message */
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

              {/* Retrain Button */}
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

              {/* Training Message */}
              {trainingMessage && (
                <div className="flex items-start gap-2 text-sm text-orange-600">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{trainingMessage}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SourcesContent;
