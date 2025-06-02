
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { File, FileText, Globe, HelpCircle } from 'lucide-react';

interface SourcesContentProps {
  totalSources: number;
  totalSize: string;
  sourcesByType: {
    text: { count: number; size: number };
    file: { count: number; size: number };
    website: { count: number; size: number };
    qa: { count: number; size: number };
  };
  currentTab?: string;
}

const SourcesContent: React.FC<SourcesContentProps> = ({
  totalSources,
  totalSize,
  sourcesByType,
  currentTab
}) => {
  console.log('✅ SourcesWidget rendering with real-time content');

  const getSourceLabel = (count: number, type: string) => {
    switch (type) {
      case 'file':
        return count === 1 ? '1 File' : `${count} Files`;
      case 'text':
        return count === 1 ? '1 Text File' : `${count} Text Files`;
      case 'website':
        return count === 1 ? '1 Link' : `${count} Links`;
      case 'qa':
        return count === 1 ? '1 Q&A' : `${count} Q&A`;
      default:
        return `${count} Items`;
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <File className="w-4 h-4" aria-hidden="true" />;
      case 'text':
        return <FileText className="w-4 h-4" aria-hidden="true" />;
      case 'website':
        return <Globe className="w-4 h-4" aria-hidden="true" />;
      case 'qa':
        return <HelpCircle className="w-4 h-4" aria-hidden="true" />;
      default:
        return <File className="w-4 h-4" aria-hidden="true" />;
    }
  };

  // Format bytes helper function
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  const sourceTypes = ['file', 'text', 'website', 'qa'] as const;

  // Calculate actual total from the individual sizes to ensure accuracy
  const calculatedTotal = sourcesByType.text.size + sourcesByType.file.size + sourcesByType.website.size + sourcesByType.qa.size;
  const displayTotalSize = formatBytes(calculatedTotal);

  console.log('📊 Size calculation debug:', {
    text: sourcesByType.text.size,
    file: sourcesByType.file.size,
    website: sourcesByType.website.size,
    qa: sourcesByType.qa.size,
    calculatedTotal,
    displayTotalSize,
    providedTotalSize: totalSize
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div role="list" className="space-y-3">
          {sourceTypes.map((type) => (
            <div 
              key={type}
              role="listitem"
              className="flex items-center justify-between"
              aria-label={`${getSourceLabel(sourcesByType[type].count, type)}`}
            >
              <div className="flex items-center gap-3">
                {getSourceIcon(type)}
                <span className="text-sm text-gray-700">
                  {getSourceLabel(sourcesByType[type].count, type)}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatBytes(sourcesByType[type].size)}
              </span>
            </div>
          ))}
        </div>

        <Separator className="border-dashed" />

        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-900">Total size:</span>
          <div className="text-sm">
            <span className="font-bold text-gray-900">{displayTotalSize}</span>
            <span className="text-gray-600 ml-1">/ 33 MB</span>
          </div>
        </div>

        <div className="pt-2">
          <Button 
            className="w-full bg-gray-800 hover:bg-gray-700 text-white"
            size="default"
          >
            Retrain agent
          </Button>
        </div>

        {totalSources === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            No sources added yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourcesContent;
