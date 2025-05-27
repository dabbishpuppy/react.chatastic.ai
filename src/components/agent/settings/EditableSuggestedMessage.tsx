
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X, Trash2 } from 'lucide-react';

interface EditableSuggestedMessageProps {
  id: string;
  text: string;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  maxLength?: number;
  preventFocusScroll?: boolean;
}

const EditableSuggestedMessage: React.FC<EditableSuggestedMessageProps> = ({
  id,
  text,
  onUpdate,
  onDelete,
  maxLength = 40,
  preventFocusScroll = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current && !preventFocusScroll) {
      inputRef.current.focus();
    }
  }, [isEditing, preventFocusScroll]);

  const handleSave = () => {
    if (editText.trim() && editText.trim() !== text) {
      onUpdate(id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          className="flex-1"
          preventFocusScroll={preventFocusScroll}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={!editText.trim()}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded border">
      <span className="flex-1 text-sm">{text}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(id)}
        className="text-red-600 hover:text-red-800"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default EditableSuggestedMessage;
