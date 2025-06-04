
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter text...",
  className,
  disabled = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState({
    bold: false,
    italic: false,
    ul: false,
    ol: false
  });

  // Handle initial content setting
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== value && value !== undefined) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleCommand = (command: string, value?: string) => {
    if (!editorRef.current || disabled) return;
    
    editorRef.current.focus();
    document.execCommand(command, false, value);
    
    // Update content immediately after command
    const newContent = editorRef.current.innerHTML;
    onChange(newContent);
    
    // Update active states
    updateActiveStates();
  };

  const updateActiveStates = () => {
    setIsActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList')
    });
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!editorRef.current || disabled) return;
    
    const content = editorRef.current.innerHTML;
    onChange(content);
    updateActiveStates();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          handleCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          handleCommand('italic');
          break;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    
    // Update content after paste
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  return (
    <div className={cn("border border-gray-300 rounded-md", className)}>
      {!disabled && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", isActive.bold && "bg-gray-200")}
            onClick={() => handleCommand('bold')}
          >
            <Bold size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", isActive.italic && "bg-gray-200")}
            onClick={() => handleCommand('italic')}
          >
            <Italic size={16} />
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", isActive.ul && "bg-gray-200")}
            onClick={() => handleCommand('insertUnorderedList')}
          >
            <List size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", isActive.ol && "bg-gray-200")}
            onClick={() => handleCommand('insertOrderedList')}
          >
            <ListOrdered size={16} />
          </Button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onMouseUp={updateActiveStates}
        onKeyUp={updateActiveStates}
        onPaste={handlePaste}
        className={cn(
          "min-h-[200px] p-3 outline-none prose max-w-none",
          disabled && "bg-gray-50 cursor-not-allowed",
          !value && !disabled && "empty-editor"
        )}
        style={{ 
          fontSize: '0.875rem',
          lineHeight: '1.5',
          direction: 'ltr',
          textAlign: 'left'
        }}
        suppressContentEditableWarning={true}
      />
      {!value && !disabled && (
        <style>
          {`.empty-editor:empty::before {
            content: "${placeholder}";
            color: #9ca3af;
            pointer-events: none;
            display: block;
          }`}
        </style>
      )}
    </div>
  );
};

export default RichTextEditor;
