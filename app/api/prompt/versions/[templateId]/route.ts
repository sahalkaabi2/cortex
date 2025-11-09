/**
 * Get Prompt Version History API
 * Returns all versions of a specific prompt template
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const templateId = parseInt(params.templateId);

    if (isNaN(templateId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    console.log(`[PROMPT VERSIONS] Fetching versions for template ${templateId}`);

    // Get all versions
    const { data: versions, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('version_number', { ascending: false });

    if (error) throw error;

    // Get current version from template
    const { data: template } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    const currentVersion = versions && versions.length > 0 ? versions[0].version_number : 1;

    console.log(`[PROMPT VERSIONS] Found ${versions?.length || 0} versions`);

    return NextResponse.json({
      success: true,
      versions: versions || [],
      current_version: currentVersion,
      template_name: template?.name || 'Unknown',
    });

  } catch (error) {
    console.error('[PROMPT VERSIONS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch version history',
        message: String(error)
      },
      { status: 500 }
    );
  }
}
