
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

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleCommand = (command: string, value?: string) => {
    if (!editorRef.current || disabled) return;
    
    editorRef.current.focus();
    document.execCommand(command, false, value);
    
    // Update content
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

  const handleInput = () => {
    if (!editorRef.current) return;
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

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
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
        className={cn(
          "min-h-[200px] p-3 outline-none prose max-w-none",
          disabled && "bg-gray-50 cursor-not-allowed"
        )}
        style={{ 
          fontSize: '0.875rem',
          lineHeight: '1.5'
        }}
        suppressContentEditableWarning={true}
        dangerouslySetInnerHTML={{ 
          __html: value || (disabled ? '' : `<p style="color: #9ca3af; margin: 0;">${placeholder}</p>`)
        }}
      />
    </div>
  );
};

export default RichTextEditor;
