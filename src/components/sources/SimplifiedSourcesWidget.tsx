
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, FileText, RefreshCw } from "lucide-react";
import { useSimplifiedFlow } from "@/hooks/useSimplifiedFlow";
import SourceRow from "./SourceRow";

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
  const { statusSummary, buttonState, isTraining, startTraining } = useSimplifiedFlow();

  const getButtonIcon = () => {
    if (isTraining || buttonState.buttonText === 'Training Agent...') {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (buttonState.buttonText === 'Agent Trained') {
      return <CheckCircle className="h-4 w-4" />;
    }
    return <RefreshCw className="h-4 w-4" />;
  };

  const getButtonClassName = () => {
    if (isTraining || buttonState.buttonText === 'Training Agent...') {
      return "bg-orange-500 hover:bg-orange-600 text-white w-full";
    }
    if (buttonState.buttonText === 'Agent Trained') {
      return "bg-green-50 border-green-200 text-green-700 w-full";
    }
    return "bg-black hover:bg-gray-800 text-white w-full";
  };

  const getButtonText = () => {
    if (isTraining) {
      return "Training Agent...";
    }
    return buttonState.buttonText;
  };

  const handleTrainClick = () => {
    if (!isTraining && !buttonState.disabled) {
      startTraining();
    }
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
                <Button
                  size="sm"
                  variant={buttonState.variant}
                  onClick={handleTrainClick}
                  disabled={buttonState.disabled || isTraining}
                  className={getButtonClassName()}
                >
                  {getButtonIcon()}
                  {getButtonText()}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimplifiedSourcesWidget;
