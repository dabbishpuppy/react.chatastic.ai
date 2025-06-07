
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

  // Extract meta title from metadata if available
  const pageTitle = source?.metadata?.page_title || source?.metadata?.pageTitle;

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
              <div className="flex-1">
                {pageTitle && isChildPage && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Page Title</h3>
                    <p className="text-gray-700">{pageTitle}</p>
                  </div>
                )}
                <h2 className="text-xl font-semibold">{source.title}</h2>
              </div>
              {!isFileSource && !isChildPage && (
                <Button
                  variant="outline"
                  onClick={onStartEdit}
                >
                  Edit
                </Button>
              )}
            </div>
            
            <div className="prose max-w-none">
              {isHtmlContent ? (
                <div 
                  className="font-sans text-gray-700"
                  style={{ 
                    fontSize: '0.875rem',
                    lineHeight: '1.5'
                  }}
                  dangerouslySetInnerHTML={{ __html: source.content || 'No content available' }}
                />
              ) : (
                <pre 
                  className="whitespace-pre-wrap font-sans text-gray-700"
                  style={{ fontSize: '0.875rem' }}
                >
                  {source.content || 'No content available'}
                </pre>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SourceDetailContent;
