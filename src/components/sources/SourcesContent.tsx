
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import SourceRow from "./SourceRow";

interface SourcesContentProps {
  totalSources: number;
  totalSize: string;
  sourcesByType: Record<string, { count: number; size: number }>;
  currentTab?: string;
  onRetrainClick: () => void;
  retrainingNeeded: boolean;
  isRetraining: boolean;
}

const SourcesContent: React.FC<SourcesContentProps> = ({
  totalSources,
  totalSize,
  sourcesByType,
  currentTab,
  onRetrainClick,
  retrainingNeeded,
  isRetraining
}) => {
  const getRetrainButtonProps = () => {
    if (isRetraining) {
      return {
        variant: "outline" as const,
        disabled: true,
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: "Processing...",
        className: "bg-blue-50 border-blue-200 text-blue-700"
      };
    }
    
    if (retrainingNeeded) {
      return {
        variant: "default" as const,
        disabled: false,
        icon: <RefreshCw className="h-4 w-4" />,
        text: "Retrain agent",
        className: "bg-black hover:bg-gray-800 text-white w-full"
      };
    }
    
    return {
      variant: "outline" as const,
      disabled: false,
      icon: <CheckCircle className="h-4 w-4" />,
      text: "Agent Trained",
      className: "bg-green-50 border-green-200 text-green-700"
    };
  };

  const buttonProps = getRetrainButtonProps();

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 uppercase tracking-wide">
            SOURCES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Retraining Message */}
          {retrainingNeeded && (
            <div className="flex items-start gap-2 text-sm text-orange-600">
              <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Retraining is required for changes to apply</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SourcesContent;
