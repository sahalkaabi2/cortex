/**
 * Save or Update Prompt Template API
 * Handles creating new prompts and updating existing ones with version history
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface SavePromptRequest {
  id?: number;
  name: string;
  description?: string;
  content: string;
  is_active?: boolean;
  category?: string;
  change_summary?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SavePromptRequest = await request.json();
    const { id, name, description, content, is_active, category, change_summary } = body;

    // Validate required fields
    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: 'Name and content are required' },
        { status: 400 }
      );
    }

    // Validate prompt content
    const validation = validatePromptContent(content);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt validation failed',
          validation
        },
        { status: 400 }
      );
    }

    let template;
    let versionNumber = 1;

    if (id) {
      // UPDATE existing prompt
      console.log(`[PROMPT] Updating prompt ID: ${id}`);

      // Get current version number
      const { data: versions } = await supabase
        .from('prompt_versions')
        .select('version_number')
        .eq('template_id', id)
        .order('version_number', { ascending: false })
        .limit(1);

      versionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      // Get current content to save as version
      const { data: currentTemplate } = await supabase
        .from('prompt_templates')
        .select('content')
        .eq('id', id)
        .single();

      // Save current version to history
      if (currentTemplate) {
        await supabase
          .from('prompt_versions')
          .insert({
            template_id: id,
            version_number: versionNumber - 1,
            content: currentTemplate.content,
            change_summary: change_summary || 'Updated prompt',
            created_at: new Date().toISOString(),
          });
      }

      // If setting as active, unset current active
      if (is_active) {
        await supabase
          .from('prompt_templates')
          .update({ is_active: false })
          .eq('is_active', true);
      }

      // Update the template
      const { data, error } = await supabase
        .from('prompt_templates')
        .update({
          name,
          description,
          content,
          is_active: is_active || false,
          category: category || 'custom',
          updated_at: new Date().toISOString(),
          validation_status: validation,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      template = data;

    } else {
      // CREATE new prompt
      console.log(`[PROMPT] Creating new prompt: ${name}`);

      // If setting as active, unset current active
      if (is_active) {
        await supabase
          .from('prompt_templates')
          .update({ is_active: false })
          .eq('is_active', true);
      }

      const { data, error } = await supabase
        .from('prompt_templates')
        .insert({
          name,
          description,
          content,
          is_active: is_active || false,
          is_default: false,
          category: category || 'custom',
          validation_status: validation,
        })
        .select()
        .single();

      if (error) throw error;
      template = data;

      // Create initial version
      await supabase
        .from('prompt_versions')
        .insert({
          template_id: template.id,
          version_number: 1,
          content,
          change_summary: change_summary || 'Initial version',
          created_at: new Date().toISOString(),
        });
    }

    console.log(`[PROMPT] Saved successfully. Version: ${versionNumber}`);

    return NextResponse.json({
      success: true,
      template,
      version: versionNumber,
      validation,
    });

  } catch (error) {
    console.error('[PROMPT SAVE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save prompt',
        message: String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Validate prompt content
 * Checks for required placeholders, syntax errors, etc.
 */
function validatePromptContent(content: string) {
  const errors: Array<{ line: number; message: string }> = [];
  const warnings: string[] = [];
  const fieldsUsed: string[] = [];

  // Extract all {{field}} placeholders
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = placeholderRegex.exec(content)) !== null) {
    const field = match[1].trim();
    if (!fieldsUsed.includes(field)) {
      fieldsUsed.push(field);
    }
  }

  // Check for malformed placeholders
  const malformedRegex = /\{[^{]|[^}]\}/g;
  if (malformedRegex.test(content)) {
    warnings.push('Possible malformed placeholders detected. Use {{field}} syntax.');
  }

  // Check for required structure
  if (!content.includes('RESPOND IN STRICT JSON FORMAT') && !content.includes('JSON')) {
    warnings.push('Prompt should include JSON response format instructions');
  }

  // Calculate score
  const score = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fields_used: fieldsUsed,
    fields_missing: [], // Will be populated by comparison with available fields
    fields_wasted: [], // Will be populated by comparison
    score,
  };
}
