
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Globe, FileText, File, HelpCircle } from "lucide-react";
import { SourceDetail } from '../types';

interface SourceDetailsSectionProps {
  retrainingNeeded?: any;
  currentStatus: string;
}

export const SourceDetailsSection: React.FC<SourceDetailsSectionProps> = ({
  retrainingNeeded,
  currentStatus
}) => {
  const getSourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'website':
        return <Globe className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
      case 'q&a':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Needs Processing':
        return "destructive";
      case 'Needs Reprocessing':
        return "secondary";
      case 'Crawled - Needs Training':
        return "default";
      default:
        return "outline";
    }
  };

  if (!retrainingNeeded?.sourceDetails || retrainingNeeded.sourceDetails.length === 0 || currentStatus === 'completed') {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="border-t pt-4">
        <h4 className="font-medium text-sm mb-3">Sources requiring processing:</h4>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {retrainingNeeded.sourceDetails.map((source: SourceDetail) => (
            <div key={source.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mt-0.5">
                {getSourceIcon(source.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-sm truncate">{source.title}</div>
                  <Badge variant="outline" className="text-xs">{source.type}</Badge>
                </div>
                <div className="text-xs text-gray-600 mb-2">{source.reason}</div>
                <Badge variant={getStatusBadgeVariant(source.status)} className="text-xs">
                  {source.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
