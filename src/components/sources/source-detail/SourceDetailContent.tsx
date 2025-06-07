
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  onCancel
}) => {
  const isHtmlContent = source?.metadata?.isHtml === true;
  const isFileSource = source?.source_type === 'file';
  const isChildPage = source?.metadata?.isChildPage === true;

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

  console.log('🔍 Content rendering debug:', {
    isHtmlContent,
    isChildPage,
    contentLength: source.content?.length,
    contentPreview: source.content?.substring(0, 100),
    looksLikeHtml: source.content ? looksLikeHtml(source.content) : false
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
              <h2 className="text-xl font-semibold">{source.title}</h2>
              {!isFileSource && !isChildPage && (
                <Button
                  variant="outline"
                  onClick={onStartEdit}
                >
                  Edit
                </Button>
              )}
            </div>
            
            {isChildPage && source.metadata && (
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
                </div>
              </div>
            )}
            
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
                <div className="text-gray-500 italic">No content available</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourceDetailContent;
