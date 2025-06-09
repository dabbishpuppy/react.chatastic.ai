
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Save, X } from 'lucide-react';

interface SourceDetailContentProps {
  source: any;
  isEditing: boolean;
  editTitle: string;
  editContent: string;
  isSaving: boolean;
  onStartEdit: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isPageSource?: boolean;
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
  isPageSource = false
}) => {
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {isPageSource ? 'Page Content' : 'Source Content'}
        </h2>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={onStartEdit}>
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <Input
              value={editTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <Textarea
              value={editContent}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Enter content..."
              rows={12}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {source.title || source.url}
            </h3>
          </div>

          {source.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-red-800 font-medium mb-2">Error Message</h4>
              <p className="text-red-700 text-sm">{source.error_message}</p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Content</h4>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {source.content ? (
                <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
                  {source.content}
                </pre>
              ) : (
                <p className="text-gray-500 italic">
                  {isPageSource ? 'No content available for this page.' : 'No content available for this source.'}
                </p>
              )}
            </div>
          </div>

          {isPageSource && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Processing Status</h4>
                <p className="text-blue-700 capitalize">{source.status || 'Unknown'}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-1">Chunks Created</h4>
                <p className="text-green-700">{source.chunks_created || 0}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SourceDetailContent;
