/**
 * Revert Prompt API
 * Reverts a prompt template to a previous version
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RevertRequest {
  template_id: number;
  version_number: number;
}

export async function POST(request: NextRequest) {
  try {
    const { template_id, version_number }: RevertRequest = await request.json();

    if (!template_id || !version_number) {
      return NextResponse.json(
        { success: false, error: 'Template ID and version number are required' },
        { status: 400 }
      );
    }

    console.log(`[PROMPT REVERT] Reverting template ${template_id} to version ${version_number}`);

    // Get the old version content
    const { data: oldVersion, error: versionError } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('template_id', template_id)
      .eq('version_number', version_number)
      .single();

    if (versionError || !oldVersion) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    // Get current template to save its content as a new version
    const { data: currentTemplate, error: templateError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !currentTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get highest version number to create new version
    const { data: versions } = await supabase
      .from('prompt_versions')
      .select('version_number')
      .eq('template_id', template_id)
      .order('version_number', { ascending: false })
      .limit(1);

    const newVersionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

    // Save current content as new version (before reverting)
    await supabase
      .from('prompt_versions')
      .insert({
        template_id,
        version_number: newVersionNumber,
        content: currentTemplate.content,
        change_summary: `Reverted to version ${version_number}`,
        created_at: new Date().toISOString(),
      });

    // Update template with old version content
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('prompt_templates')
      .update({
        content: oldVersion.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template_id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`[PROMPT REVERT] Successfully reverted to version ${version_number}. New version: ${newVersionNumber}`);

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      reverted_from_version: version_number,
      new_version: newVersionNumber,
      message: `Reverted to version ${version_number}`,
    });

  } catch (error) {
    console.error('[PROMPT REVERT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to revert prompt',
        message: String(error)
      },
      { status: 500 }
    );
  }
}
