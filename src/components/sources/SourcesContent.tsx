
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Globe, MessageSquare, Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourcesContentProps {
  totalSources: number;
  totalSize: string;
  sourcesByType: Record<string, number>;
  currentTab?: string;
  onRetrainClick: () => void;
  retrainingNeeded: boolean;
  isRetraining: boolean;
  isTrainingInBackground: boolean;
  isTrainingCompleted: boolean;
  requiresTraining: boolean;
  unprocessedCrawledPages: number;
}

const SourcesContent: React.FC<SourcesContentProps> = ({
  totalSources,
  totalSize,
  sourcesByType,
  currentTab,
  onRetrainClick,
  retrainingNeeded,
  isRetraining,
  isTrainingInBackground,
  isTrainingCompleted,
  requiresTraining,
  unprocessedCrawledPages,
}) => {
  const getButtonText = () => {
    if (isRetraining || isTrainingInBackground) return "Training in Progress";
    if (isTrainingCompleted) return "Training Complete";
    if (retrainingNeeded || requiresTraining || unprocessedCrawledPages > 0) return "Train Agent";
    return "Agent Trained";
  };

  const isButtonDisabled = isRetraining || isTrainingInBackground;

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileText className="h-4 w-4" />;
      case 'website':
        return <Globe className="h-4 w-4" />;
      case 'qa':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSources}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSize}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Status</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button
              onClick={onRetrainClick}
              disabled={isButtonDisabled}
              variant={retrainingNeeded || requiresTraining || unprocessedCrawledPages > 0 ? "default" : "outline"}
              className={cn(
                "w-full",
                isTrainingCompleted && "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              )}
            >
              {(isRetraining || isTrainingInBackground) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {getButtonText()}
            </Button>
            {unprocessedCrawledPages > 0 && (
              <Badge variant="secondary" className="mt-2 w-full justify-center">
                {unprocessedCrawledPages} pages need processing
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(sourcesByType).map(([type, count]) => (
          <Card 
            key={type} 
            className={cn(
              "cursor-pointer transition-colors",
              currentTab === type && "ring-2 ring-blue-500"
            )}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-2">
                {getSourceIcon(type)}
                <span className="text-sm font-medium capitalize">{type}</span>
              </div>
              <Badge variant="secondary">{count}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SourcesContent;
