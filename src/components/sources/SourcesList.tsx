import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ChevronRight, FileText, Link, MessageCircleQuestion, File } from 'lucide-react';
import { AgentSource, SourceType } from '@/types/rag';
import { formatDistanceToNow } from 'date-fns';

interface SourcesListProps {
  sources: AgentSource[];
  loading: boolean;
  error: string | null;
}

const SourcesList: React.FC<SourcesListProps> = ({ sources, loading, error }) => {
  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'text':
        return <FileText size={16} className="text-blue-600" />;
      case 'file':
        return <File size={16} className="text-green-600" />;
      case 'website':
        return <Link size={16} className="text-purple-600" />;
      case 'qa':
        return <MessageCircleQuestion size={16} className="text-orange-600" />;
      default:
        return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getSourceTypeLabel = (type: SourceType) => {
    switch (type) {
      case 'text':
        return 'Text';
      case 'file':
        return 'File';
      case 'website':
        return 'Website';
      case 'qa':
        return 'Q&A';
      default:
        return type;
    }
  };

  const formatFileSize = (content?: string) => {
    if (!content) return '0 B';
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="text-gray-500">Loading sources...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center text-red-500">
          Error: {error}
        </div>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <p>No sources found</p>
          <p className="text-sm mt-1">Add your first source using the form above</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Sources ({sources.length})</h3>
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.id} className="cursor-pointer hover:bg-gray-50">
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      {getSourceIcon(source.source_type)}
                    </div>
                    <div>
                      <div className="font-medium">{source.title}</div>
                      {source.url && (
                        <div className="text-sm text-gray-500 truncate max-w-[200px]">
                          {source.url}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {getSourceTypeLabel(source.source_type)}
                  </Badge>
                </TableCell>
                <TableCell>{formatFileSize(source.content)}</TableCell>
                <TableCell className="text-gray-500">
                  {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SourcesList;
