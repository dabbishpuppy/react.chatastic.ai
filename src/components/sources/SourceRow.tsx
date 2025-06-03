
import React from "react";
import { FileText, Globe, Upload, MessageSquare } from "lucide-react";

interface SourceRowProps {
  type: string;
  count: number;
  size: number;
}

const SourceRow: React.FC<SourceRowProps> = ({ type, count, size }) => {
  const getIcon = () => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4 text-gray-600" />;
      case 'website':
        return <Globe className="h-4 w-4 text-gray-600" />;
      case 'file':
        return <Upload className="h-4 w-4 text-gray-600" />;
      case 'qa':
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
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
        return `${count} Text File${count !== 1 ? 's' : ''}`;
      case 'website':
        return `${count} Link${count !== 1 ? 's' : ''}`;
      case 'file':
        return `${count} File${count !== 1 ? 's' : ''}`;
      case 'qa':
        return `${count} Q&A`;
      default:
        return `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-1">
      <div className="flex items-center gap-3">
        {getIcon()}
        <span className="text-gray-700">{getTypeLabel()}</span>
      </div>
      <div className="text-gray-600 text-sm font-medium">
        {formatSize(size)}
      </div>
    </div>
  );
};

export default SourceRow;
