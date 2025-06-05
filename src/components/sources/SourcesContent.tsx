
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, FileText, RefreshCw } from "lucide-react";
import SourceRow from "./SourceRow";

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

              {/* Total Size */}
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total size:</span>
                <span className="text-gray-900 font-semibold">{totalSize}</span>
              </div>

              {/* Simple Training Button */}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SourcesContent;
