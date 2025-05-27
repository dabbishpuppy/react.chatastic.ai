
import React, { useState, useRef, useEffect } from "react";
import { Trash, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditableSuggestedMessageProps {
  id: string;
  text: string;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  maxLength?: number;
}

const EditableSuggestedMessage: React.FC<EditableSuggestedMessageProps> = ({
  id,
  text,
  onUpdate,
  onDelete,
  maxLength = 40
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Prevent scroll when focusing
      const input = inputRef.current;
      
      // Disable scrollIntoView
      input.scrollIntoView = () => {};
      
      // Set scroll behavior to auto temporarily
      const originalScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      
      // Focus without scrolling
      input.focus({ preventScroll: true });
      
      // Restore scroll behavior
      setTimeout(() => {
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
      }, 0);
    }
  }, [isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.target.scrollIntoView = () => {}; // Disable scrollIntoView
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-white border rounded">
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            className="flex-1 px-2 outline-none scroll-mt-0"
            maxLength={maxLength}
            tabIndex={-1}
          />
          <div className="flex items-center">
            <span className="mr-2 text-xs text-gray-400">
              {editValue.length}/{maxLength}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-8 w-8 p-0"
            >
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div 
            className="flex-1 overflow-hidden text-ellipsis cursor-pointer" 
            onClick={handleEdit}
            title="Click to edit"
          >
            {text}
            <span className="ml-2 text-xs text-gray-400">
              {text.length}/{maxLength}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(id)}
            className="h-8 w-8 p-0"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
};

export default EditableSuggestedMessage;
