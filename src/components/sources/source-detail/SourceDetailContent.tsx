import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentSource } from '@/types/rag';
import SourceEditForm from './SourceEditForm';

interface SourceDetailContentProps {
  source: AgentSource;
  isEditing: boolean;
  editTitle: string;
  editContent: string;
  isSaving: boolean;
  onStartEdit: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSourcePage?: boolean;
  chunks?: any[];
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
  chunks = []
}) => {
  const isHtmlContent = source?.metadata?.isHtml === true;
  const isFileSource = source?.source_type === 'file';
  const isChildPage = source?.metadata?.isChildPage === true || isSourcePage;

  // Helper function to render content with proper line breaks
  const renderPlainTextContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Check if content looks like HTML (contains HTML tags)
  const looksLikeHtml = (content: string) => {
    return /<[^>]+>/.test(content);
  };

  // Show current phase for website sources
  const getCurrentPhase = () => {
    if (source.source_type !== 'website') return null;
    
    const hasCompletedPages = source.completed_jobs && source.completed_jobs > 0;
    const hasChunks = chunks.length > 0;
    
    if (!hasCompletedPages) {
      return { phase: 'crawling', status: source.crawl_status || 'pending' };
    } else if (!hasChunks) {
      return { phase: 'ready_for_training', status: 'crawled' };
    } else {
      return { phase: 'trained', status: 'trained' };
    }
  };

  const currentPhase = getCurrentPhase();

  console.log('🔍 Content rendering debug:', {
    isHtmlContent,
    isChildPage,
    isSourcePage,
    contentLength: source.content?.length,
    contentPreview: source.content?.substring(0, 100),
    looksLikeHtml: source.content ? looksLikeHtml(source.content) : false,
    chunksCount: chunks.length
  });

  return (
    <Card>
      <CardContent className="p-6">
        {isEditing && !isFileSource && !isChildPage ? (
          <SourceEditForm
            editTitle={editTitle}
            editContent={editContent}
            isSaving={isSaving}
            onTitleChange={onTitleChange}
            onContentChange={onContentChange}
            onSave={onSave}
            onCancel={onCancel}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-semibold">
                {isSourcePage ? (source.url || 'Source Page Content') : source.title}
              </h2>
              {!isFileSource && !isChildPage && (
                <Button
                  variant="outline"
                  onClick={onStartEdit}
                >
                  Edit
                </Button>
              )}
            </div>

            {/* Phase indicator for website sources */}
            {currentPhase && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                <div className="font-medium text-blue-900">
                  Current Phase: {currentPhase.phase === 'crawling' ? 'Crawling' : 
                                 currentPhase.phase === 'ready_for_training' ? 'Ready for Training' : 
                                 'Trained'}
                </div>
                <div className="text-blue-700 mt-1">
                  {currentPhase.phase === 'crawling' && 'Pages are being crawled. Please wait for completion.'}
                  {currentPhase.phase === 'ready_for_training' && 'Crawling complete! Click "Retrain Agent" to create chunks and embeddings.'}
                  {currentPhase.phase === 'trained' && 'Agent has been trained with chunks from this source.'}
                </div>
              </div>
            )}
            
            {/* Existing metadata display */}
            {(isChildPage || isSourcePage) && source.metadata && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {source.metadata.contentSize && (
                    <div>
                      <span className="font-medium">Content Size:</span> {(source.metadata.contentSize / 1024).toFixed(1)}KB
                    </div>
                  )}
                  {source.metadata.chunksCreated && (
                    <div>
                      <span className="font-medium">Chunks Created:</span> {source.metadata.chunksCreated}
                    </div>
                  )}
                  {source.metadata.processingTimeMs && (
                    <div>
                      <span className="font-medium">Processing Time:</span> {(source.metadata.processingTimeMs / 1000).toFixed(2)}s
                    </div>
                  )}
                  {source.metadata.compressionRatio && (
                    <div>
                      <span className="font-medium">Compression Ratio:</span> {(source.metadata.compressionRatio * 100).toFixed(1)}%
                    </div>
                  )}
                  {source.metadata.status && (
                    <div>
                      <span className="font-medium">Status:</span> {source.metadata.status}
                    </div>
                  )}
                  {source.url && (
                    <div className="col-span-2">
                      <span className="font-medium">URL:</span> 
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1 break-all">
                        {source.url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chunks display for source pages */}
            {isSourcePage && chunks.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium">Extracted Content Chunks</h3>
                  <Badge variant="secondary">{chunks.length} chunks</Badge>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {chunks.map((chunk, index) => (
                    <div key={chunk.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          Chunk {index + 1}
                        </span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {chunk.token_count} tokens
                          </Badge>
                          {chunk.content_hash && (
                            <Badge variant="outline" className="text-xs">
                              {chunk.content_hash.slice(0, 8)}...
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {chunk.content.length > 500 
                          ? `${chunk.content.substring(0, 500)}...` 
                          : chunk.content
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Show message if no chunks for website source */}
            {source.source_type === 'website' && !isSourcePage && chunks.length === 0 && currentPhase?.phase === 'ready_for_training' && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-yellow-800 font-medium">No chunks created yet</div>
                <div className="text-yellow-700 text-sm mt-1">
                  This source has been crawled but not yet chunked. Click "Retrain Agent" to create chunks and embeddings.
                </div>
              </div>
            )}
            
            {/* Regular content display */}
            <div className="prose max-w-none">
              {source.content ? (
                <>
                  {(isHtmlContent || (isChildPage && looksLikeHtml(source.content))) ? (
                    <div 
                      className="font-sans text-gray-700 prose prose-headings:text-gray-900 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-sm prose-p:text-gray-700 prose-strong:text-gray-900 prose-em:italic prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4"
                      style={{ 
                        fontSize: '0.875rem',
                        lineHeight: '1.5'
                      }}
                      dangerouslySetInnerHTML={{ __html: source.content }}
                    />
                  ) : (
                    <div 
                      className="font-sans text-gray-700 whitespace-pre-wrap"
                      style={{ 
                        fontSize: '0.875rem',
                        lineHeight: '1.5'
                      }}
                    >
                      {renderPlainTextContent(source.content)}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-500 italic">
                  {isSourcePage && chunks.length === 0 ? 'No chunks found for this page' : 'No content available'}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourceDetailContent;
