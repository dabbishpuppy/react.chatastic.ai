
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { File, FileText, Globe, HelpCircle } from 'lucide-react';

interface SourcesContentProps {
  totalSources: number;
  totalSize: string;
  sourcesByType: {
    text: number;
    file: number;
    website: number;
    qa: number;
  };
  currentTab?: string;
}

const SourcesContent: React.FC<SourcesContentProps> = ({
  totalSources,
  totalSize,
  sourcesByType,
  currentTab
}) => {
  console.log('✅ SourcesWidget rendering with new list-style content');

  const formatSize = (count: number, type: string) => {
    // Mock sizes for now - in reality these would come from the stats
    const mockSizes = {
      file: count > 0 ? '4 KB' : '0 B',
      text: count > 0 ? '40 B' : '0 B', 
      website: count > 0 ? '23 KB' : '0 B',
      qa: count > 0 ? '269 B' : '0 B'
    };
    return mockSizes[type as keyof typeof mockSizes] || '0 B';
  };

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

  const sourceTypes = ['file', 'text', 'website', 'qa'] as const;

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
              aria-label={`${getSourceLabel(sourcesByType[type], type)}, ${formatSize(sourcesByType[type], type)}`}
            >
              <div className="flex items-center gap-3">
                {getSourceIcon(type)}
                <span className="text-sm text-gray-700">
                  {getSourceLabel(sourcesByType[type], type)}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatSize(sourcesByType[type], type)}
              </span>
            </div>
          ))}
        </div>

        <Separator className="border-dashed" />

        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-gray-900">Total size:</span>
          <div className="text-sm">
            <span className="font-bold text-gray-900">{totalSize}</span>
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
