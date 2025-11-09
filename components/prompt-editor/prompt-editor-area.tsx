'use client';

import { useState, useRef, useEffect } from 'react';

interface PromptEditorAreaProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: () => void;
}

export function PromptEditorArea({ value, onChange, onValidate }: PromptEditorAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and highlight overlay
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedText = e.dataTransfer.getData('text/plain');
    if (!droppedText) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    // Insert at cursor position or at the end
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + droppedText + value.substring(end);

    onChange(newValue);

    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + droppedText.length,
        start + droppedText.length
      );
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Highlight placeholders like {{FIELD}}
  const highlightSyntax = (text: string): string => {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Special highlighting for composite placeholders (MARKET_DATA, POSITIONS)
      .replace(/\{\{(MARKET_DATA|POSITIONS)\}\}/g, '<span class="border-2 border-blue-600 dark:border-blue-400 bg-blue-100 dark:bg-blue-900 bg-opacity-20 dark:bg-opacity-20 px-1.5 py-0.5 font-bold rounded" title="Composite placeholder - hover in field panel to see structure">{{$1}}</span>')
      // Regular placeholders
      .replace(/\{\{([^}]+)\}\}/g, '<span class="border border-black dark:border-white px-1 font-bold">{{$1}}</span>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="relative h-full flex flex-col bg-white dark:bg-black border border-black dark:border-white font-mono overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-black dark:border-white flex items-center justify-between">
        <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wide">Prompt Template</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-black dark:text-white">
            {value.length} chars
          </span>
          {onValidate && (
            <button
              onClick={onValidate}
              className="px-3 py-1 text-xs font-medium border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            >
              Validate
            </button>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div
        className={`relative flex-1 overflow-hidden ${
          isDragOver ? 'ring-2 ring-blue-500 ring-inset' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Syntax Highlight Overlay */}
        <div
          ref={highlightRef}
          className="absolute inset-0 p-4 font-mono text-sm leading-relaxed overflow-auto pointer-events-none whitespace-pre-wrap break-words"
          style={{
            color: 'transparent',
            caretColor: 'black',
          }}
          dangerouslySetInnerHTML={{
            __html: highlightSyntax(value),
          }}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          className="absolute inset-0 w-full h-full p-4 font-mono text-sm leading-relaxed resize-none bg-transparent focus:outline-none"
          style={{
            color: isDragOver ? 'transparent' : 'inherit',
            caretColor: 'black',
          }}
          placeholder="Start typing your prompt template here, or drag fields from the left panel..."
          spellCheck={false}
        />

        {/* Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-white dark:bg-black bg-opacity-90 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-black dark:border-white px-6 py-4">
              <p className="text-black dark:text-white font-bold">Drop field here to insert</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Tips */}
      <div className="px-4 py-2 border-t border-black dark:border-white">
        <div className="flex items-start gap-4 text-xs text-black dark:text-white">
          <div className="flex items-center gap-1">
            <span className="font-bold">💡 Tip:</span>
            <span>Use placeholders like <code className="border border-black dark:border-white px-1">{'{{BALANCE}}'}</code> for dynamic data. Composite placeholders like <code className="border-2 border-blue-600 dark:border-blue-400 bg-blue-100 bg-opacity-30 px-1 rounded">{'{{MARKET_DATA}}'}</code> (shown with blue border) contain nested data—click the ⓘ icon in the field panel to see their structure.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
