/**
 * Activate Prompt API
 * Sets a prompt template as the active one used by trading engine
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    console.log(`[PROMPT] Activating prompt ID: ${id}`);

    // Check if template exists
    const { data: template, error: fetchError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Unset current active prompt
    await supabase
      .from('prompt_templates')
      .update({ is_active: false })
      .eq('is_active', true);

    // Set selected prompt as active
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('prompt_templates')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`[PROMPT] Activated: ${updatedTemplate.name}`);

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: `Prompt "${updatedTemplate.name}" is now active`,
    });

  } catch (error) {
    console.error('[PROMPT ACTIVATE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to activate prompt',
        message: String(error)
      },
      { status: 500 }
    );
  }
}
