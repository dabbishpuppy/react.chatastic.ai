
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
        return <FileText className="h-5 w-5" />;
      case 'website':
        return <Globe className="h-5 w-5" />;
      case 'file':
        return <Upload className="h-5 w-5" />;
      case 'qa':
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
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
    <Card className={`transition-colors ${isActive ? 'border-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="font-medium text-sm">{getTypeLabel()}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatSize(size)}
        </div>
      </CardContent>
    </Card>
  );
};

export default SourceTypeCard;
