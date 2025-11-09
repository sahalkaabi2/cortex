/**
 * List Prompts API
 * Returns all saved prompt templates with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    console.log('[PROMPT LIST] Fetching prompts...', {
      category,
      search,
      page,
      limit,
    });

    // Build query
    let query = supabase
      .from('prompt_templates')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: templates, error, count } = await query;

    if (error) throw error;

    // For each template, get latest version number
    const templatesWithVersions = await Promise.all(
      (templates || []).map(async (template) => {
        const { data: versions } = await supabase
          .from('prompt_versions')
          .select('version_number')
          .eq('template_id', template.id)
          .order('version_number', { ascending: false })
          .limit(1);

        const versionNumber = versions && versions.length > 0 ? versions[0].version_number : 1;

        return {
          ...template,
          current_version: versionNumber,
        };
      })
    );

    console.log(`[PROMPT LIST] Found ${count} prompts`);

    return NextResponse.json({
      success: true,
      templates: templatesWithVersions,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    });

  } catch (error) {
    console.error('[PROMPT LIST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch prompts',
        message: String(error)
      },
      { status: 500 }
    );
  }
}
