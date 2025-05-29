
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Save, 
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Smile
} from 'lucide-react';

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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <Input
          value={editTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter source title"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Text
        </label>
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="flex items-center p-2 border-b border-gray-200">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bold size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Italic size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ListOrdered size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <List size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Link2 size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Smile size={16} />
              </Button>
            </div>
            <Textarea
              value={editContent}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Enter source content"
              className="border-0 focus-visible:ring-0 min-h-[400px]"
            />
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X size={16} className="mr-2" />
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving || !editTitle.trim()}
        >
          <Save size={16} className="mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default SourceEditForm;
