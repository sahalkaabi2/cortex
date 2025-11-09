'use client';

import { useEffect, useState } from 'react';
import { PromptEditor } from '@/components/prompt-editor/prompt-editor';

export default function PromptsPage() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage if available, otherwise default to true
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme ? savedTheme === 'dark' : true;
    }
    return true;
  });

  // Apply dark mode to document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <PromptEditor />
    </div>
  );
}
