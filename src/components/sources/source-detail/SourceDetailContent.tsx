
import React from 'react';
import { AgentSource, SourceChunk } from '@/types/rag';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, X, Edit, RefreshCw, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import WebsiteSourceDetails from '@/components/sources/websites/components/WebsiteSourceDetails';

interface SourceDetailContentProps {
  source: AgentSource;
  isEditing: boolean;
  editTitle: string;
  editContent: string;
  isSaving: boolean;
  onStartEdit: () => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSourcePage?: boolean;
  chunks?: SourceChunk[];
  triggerReprocessing?: () => void;
}

const SourceDetailContent: React.FC<SourceDetailContentProps> = ({
  source,
  isEditing,
  editTitle,
  editContent,
  isSaving,
  onStartEdit,
  onTitleChange,
  onContentChange,
  onSave,
  onCancel,
  isSourcePage = false,
  chunks = [],
  triggerReprocessing
}) => {
  const hasContent = source.content && source.content.trim().length > 0;
  const hasChunks = chunks.length > 0;
  const shouldHaveContent = source.metadata?.chunksCreated && source.metadata.chunksCreated > 0;

  return (
    <div className="space-y-6">
      {/* Source Type and Metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Source Information
                <Badge variant="outline">{source.source_type}</Badge>
                {isSourcePage && <Badge variant="secondary">Child Page</Badge>}
              </CardTitle>
              <CardDescription>
                {isSourcePage ? 'Child page content and metadata' : 'Source details and content'}
              </CardDescription>
            </div>
            {!isSourcePage && !isEditing && (
              <Button onClick={onStartEdit} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Source title"
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={editContent}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="Source content"
                  className="min-h-[200px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={onSave} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button onClick={onCancel} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <p className="text-sm font-medium">{source.title}</p>
              </div>
              
              {source.url && (
                <div>
                  <Label>URL</Label>
                  <p className="text-sm text-blue-600 break-all">{source.url}</p>
                </div>
              )}

              {/* Content Display with Enhanced Error Handling */}
              <div>
                <Label>Content</Label>
                {hasContent ? (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{source.content}</pre>
                  </div>
                ) : (
                  <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800 font-medium">No content available</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          {shouldHaveContent 
                            ? `This page should have ${source.metadata?.chunksCreated} chunks but no content is displayed. This might be a processing issue.`
                            : 'This source has not been processed yet or contains no extractable content.'
                          }
                        </p>
                        {isSourcePage && triggerReprocessing && (
                          <Button 
                            onClick={triggerReprocessing}
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reprocess Page
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chunks Information */}
              {isSourcePage && (
                <div>
                  <Label>Chunks Information</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span>Found Chunks: <Badge variant="outline">{hasChunks ? chunks.length : 0}</Badge></span>
                      {source.metadata?.chunksCreated && (
                        <span>Expected: <Badge variant="outline">{source.metadata.chunksCreated}</Badge></span>
                      )}
                    </div>
                    
                    {hasChunks && chunks.length > 0 && (
                      <div className="mt-3">
                        <Label className="text-xs">Chunk Previews</Label>
                        <div className="space-y-2 mt-1">
                          {chunks.slice(0, 3).map((chunk, index) => (
                            <div key={chunk.id} className="p-2 bg-gray-50 rounded text-xs">
                              <span className="font-medium">Chunk {index + 1}:</span>
                              <p className="mt-1 text-gray-600">
                                {chunk.content.substring(0, 150)}
                                {chunk.content.length > 150 && '...'}
                              </p>
                            </div>
                          ))}
                          {chunks.length > 3 && (
                            <p className="text-xs text-gray-500">
                              ...and {chunks.length - 3} more chunks
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Website Source Details */}
      {source.source_type === 'website' && !isSourcePage && (
        <>
          <Separator />
          <WebsiteSourceDetails source={source} />
        </>
      )}

      {/* Metadata */}
      {source.metadata && Object.keys(source.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>Additional source information</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto">
              {JSON.stringify(source.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SourceDetailContent;
