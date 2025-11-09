/**
 * Get Active Prompt API
 * Returns the currently active prompt template used by trading engine
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('[PROMPT] Fetching active prompt...');

    // Get active prompt
    const { data: template, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - not an error, just no active prompt
      throw error;
    }

    if (!template) {
      console.log('[PROMPT] No active prompt found, returning default');
      return NextResponse.json({
        success: true,
        template: null,
        version: 0,
        message: 'No active prompt set. Using default.'
      });
    }

    // Get latest version number
    const { data: versions } = await supabase
      .from('prompt_versions')
      .select('version_number')
      .eq('template_id', template.id)
      .order('version_number', { ascending: false })
      .limit(1);

    const versionNumber = versions && versions.length > 0 ? versions[0].version_number : 1;

    console.log(`[PROMPT] Active prompt: ${template.name} (v${versionNumber})`);

    return NextResponse.json({
      success: true,
      template,
      version: versionNumber,
    });

  } catch (error) {
    console.error('[PROMPT ACTIVE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch active prompt',
        message: String(error)
      },
      { status: 500 }
    );
  }
}
