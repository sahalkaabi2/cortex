'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FieldChipsPanel } from './field-chips-panel';
import { PromptEditorArea } from './prompt-editor-area';
import { ValidationPanel } from './validation-panel';

interface PromptTemplate {
  id: number;
  name: string;
  description: string;
  content: string;
  is_active: boolean;
  is_default: boolean;
  category: string;
  current_version?: number;
}

export function PromptEditor() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [promptContent, setPromptContent] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [validation, setValidation] = useState<any>(null);

  // Load templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      console.log('[PROMPT EDITOR] Fetching templates...');
      const response = await fetch('/api/prompt/list');
      const data = await response.json();
      console.log('[PROMPT EDITOR] Response:', data);

      if (data.success) {
        console.log('[PROMPT EDITOR] Found templates:', data.templates?.length || 0);
        setTemplates(data.templates || []);

        // Select active template by default
        const activeTemplate = data.templates?.find((t: PromptTemplate) => t.is_active);
        if (activeTemplate) {
          console.log('[PROMPT EDITOR] Auto-selecting active template:', activeTemplate.name);
          selectTemplate(activeTemplate);
        }
      } else {
        console.error('[PROMPT EDITOR] API returned error:', data.error);
      }
    } catch (error) {
      console.error('[PROMPT EDITOR] Failed to fetch templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setPromptContent(template.content);
    setPromptName(template.name);
    setPromptDescription(template.description || '');
    setValidation(null);
  };

  const handleSave = async () => {
    if (!promptName.trim() || !promptContent.trim()) {
      alert('Please provide both a name and content for the prompt');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/prompt/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTemplate?.id,
          name: promptName,
          description: promptDescription,
          content: promptContent,
          category: selectedTemplate?.category || 'custom',
          change_summary: selectedTemplate
            ? `Updated ${promptName}`
            : `Created ${promptName}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setValidation(data.validation);
        await fetchTemplates();
        alert(`Prompt "${promptName}" saved successfully!`);
      } else {
        alert(`Failed to save prompt: ${data.error}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!selectedTemplate?.id) return;

    try {
      const response = await fetch('/api/prompt/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTemplate.id }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchTemplates();
        alert(`Prompt "${selectedTemplate.name}" is now active!`);
      } else {
        alert(`Failed to activate prompt: ${data.error}`);
      }
    } catch (error) {
      console.error('Activate error:', error);
      alert('Failed to activate prompt');
    }
  };

  const handleNewPrompt = () => {
    setSelectedTemplate(null);
    setPromptContent('');
    setPromptName('');
    setPromptDescription('');
    setValidation(null);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black font-mono">
      {/* Top Bar - All Actions */}
      <div className="bg-white dark:bg-black border-b border-black dark:border-white px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Home Button */}
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-xs font-bold"
            title="Back to Dashboard"
          >
            ←
          </button>

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-black dark:bg-white" />

          {/* Template Selector */}
          <div className="w-56">
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = templates.find((t) => t.id === Number(e.target.value));
                if (template) selectTemplate(template);
              }}
              className="w-full px-2 py-1.5 border border-black dark:border-white bg-white dark:bg-black text-black dark:text-white text-xs font-mono"
            >
              <option value="">
                {isLoading ? 'Loading...' : templates.length === 0 ? 'No templates found' : '-- Select template --'}
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.is_active && ' (Active)'}
                  {template.is_default && ' [Default]'}
                </option>
              ))}
            </select>
          </div>

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-black dark:bg-white" />

          {/* Prompt Name */}
          <div className="flex-1">
            <input
              type="text"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              placeholder="Prompt name *"
              className="w-full px-2 py-1.5 border border-black dark:border-white bg-white dark:bg-black text-black dark:text-white text-xs font-mono placeholder:text-gray-500"
            />
          </div>

          {/* Description */}
          <div className="flex-1">
            <input
              type="text"
              value={promptDescription}
              onChange={(e) => setPromptDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-2 py-1.5 border border-black dark:border-white bg-white dark:bg-black text-black dark:text-white text-xs font-mono placeholder:text-gray-500"
            />
          </div>

          {/* Vertical Divider */}
          <div className="h-6 w-px bg-black dark:bg-white" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !promptName.trim() || !promptContent.trim()}
              className="px-4 py-1.5 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            {selectedTemplate && (
              <>
                <button
                  onClick={handleActivate}
                  disabled={selectedTemplate.is_active}
                  className={`px-3 py-1.5 border text-xs font-medium transition-colors ${
                    selectedTemplate.is_active
                      ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black cursor-not-allowed opacity-50'
                      : 'border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                  }`}
                >
                  {selectedTemplate.is_active ? '✓ Active' : 'Activate'}
                </button>

                <button
                  onClick={() => setShowVersions(!showVersions)}
                  className="px-3 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-xs font-medium"
                >
                  History
                </button>
              </>
            )}

            <button
              onClick={handleNewPrompt}
              className="px-3 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-xs font-medium"
            >
              + New
            </button>
          </div>
        </div>
      </div>

      {/* Main Editor Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Panel - Field Chips */}
        <div className="col-span-3 overflow-hidden">
          <FieldChipsPanel />
        </div>

        {/* Center Panel - Editor */}
        <div className="col-span-6 overflow-hidden">
          <PromptEditorArea
            value={promptContent}
            onChange={setPromptContent}
            onValidate={() => {
              // Trigger validation
              setValidation(null);
            }}
          />
        </div>

        {/* Right Panel - Validation */}
        <div className="col-span-3 overflow-hidden">
          <ValidationPanel promptContent={promptContent} validation={validation} />
        </div>
      </div>
    </div>
  );
}
