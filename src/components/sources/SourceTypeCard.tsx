
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Globe, Upload, MessageSquare } from "lucide-react";

interface SourceTypeCardProps {
  type: string;
  count: number;
  size: number;
  isActive?: boolean;
}

const SourceTypeCard: React.FC<SourceTypeCardProps> = ({
  type,
  count,
  size,
  isActive = false
}) => {
  const getIcon = () => {
    switch (type) {
      case 'text':
        return <FileText className="h-5 w-5 text-gray-600" />;
      case 'website':
        return <Globe className="h-5 w-5 text-gray-600" />;
      case 'file':
        return <Upload className="h-5 w-5 text-gray-600" />;
      case 'qa':
        return <MessageSquare className="h-5 w-5 text-gray-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'text':
        return 'Text Sources';
      case 'website':
        return 'Website Pages';
      case 'file':
        return 'Files';
      case 'qa':
        return 'Q&A Pairs';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <Card className={`border border-gray-200 hover:border-gray-300 transition-colors ${isActive ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {getIcon()}
          <span className="font-medium text-gray-900">{getTypeLabel()}</span>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900">{count}</div>
          <div className="text-sm text-gray-500">{formatSize(size)}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SourceTypeCard;
