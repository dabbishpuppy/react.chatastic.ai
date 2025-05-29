
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

  return (
    <Card>
      <CardContent className="p-6">
        {isEditing && !isFileSource ? (
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
              {!isFileSource && (
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
