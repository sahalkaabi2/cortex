import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { performanceData } = await request.json();

    if (!performanceData) {
      return NextResponse.json(
        { error: 'Performance data is required' },
        { status: 400 }
      );
    }

    // Insert snapshot into performance_history
    const { data, error } = await supabase
      .from('performance_history')
      .insert({
        timestamp: new Date().toISOString(),
        openai_value: performanceData.OpenAI || 100,
        claude_value: performanceData.Claude || 100,
        deepseek_value: performanceData.DeepSeek || 100,
        qwen_value: performanceData.Qwen || 100,
        buy_and_hold_value: performanceData.BuyAndHold || 100,
      })
      .select()
      .single();

    if (error) {
      // Ignore duplicate timestamp errors (constraint violation)
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Duplicate timestamp, skipped' });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving performance snapshot:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
