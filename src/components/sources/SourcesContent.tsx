
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import SourceTypeCard from "./SourceTypeCard";

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
        text: "Retrain Agent",
        className: "bg-orange-600 hover:bg-orange-700 text-white"
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
      {/* Overview Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg font-semibold">Sources Overview</CardTitle>
          <div className="flex items-center gap-2">
            {retrainingNeeded && (
              <Badge variant="destructive" className="text-xs">
                Training Required
              </Badge>
            )}
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold">{totalSources}</p>
              <p className="text-sm text-muted-foreground">Total Sources</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{totalSize}</p>
              <p className="text-sm text-muted-foreground">Total Size</p>
            </div>
          </div>
          
          {retrainingNeeded && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-orange-800">Training Required</div>
                  <div className="text-orange-700">
                    Some sources haven't been processed yet. Click "Retrain Agent" to make them searchable.
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(sourcesByType).map(([type, data]) => (
          <SourceTypeCard
            key={type}
            type={type}
            count={data.count}
            size={data.size}
            isActive={currentTab === type}
          />
        ))}
      </div>
    </div>
  );
};

export default SourcesContent;
