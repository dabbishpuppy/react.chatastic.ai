
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/ui/rich-text-editor';
import RichTextByteCounter from '@/components/sources/text/RichTextByteCounter';

interface SourceEditFormProps {
  editTitle: string;
  editContent: string;
  isSaving: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const SourceEditForm: React.FC<SourceEditFormProps> = ({
  editTitle,
  editContent,
  isSaving,
  onTitleChange,
  onContentChange,
  onSave,
  onCancel
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={editTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter title..."
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label htmlFor="edit-content">Content</Label>
          <RichTextByteCounter html={editContent} />
        </div>
        <RichTextEditor
          value={editContent}
          onChange={onContentChange}
          placeholder="Enter content..."
        />
      </div>

      <div className="flex space-x-2">
        <Button
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default SourceEditForm;
