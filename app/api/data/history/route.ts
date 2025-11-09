import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export async function GET() {
  try {
    // Fetch all performance history ordered by timestamp
    const { data, error } = await supabase
      .from('performance_history')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    // Get the first timestamp for session start time
    const startTime = new Date(data[0].timestamp);

    // Format the data for the chart with absolute timestamps
    const formattedData = data.map((snapshot) => {
      const snapshotTime = new Date(snapshot.timestamp);

      // Format as absolute date and time (e.g., "Jan 6, 2:30 PM")
      const timeLabel = format(snapshotTime, 'MMM d, h:mm a');

      return {
        timestamp: timeLabel,
        actualTime: snapshot.timestamp,
        OpenAI: Number(snapshot.openai_value),
        Claude: Number(snapshot.claude_value),
        DeepSeek: Number(snapshot.deepseek_value),
        Qwen: Number(snapshot.qwen_value),
        BuyAndHold: Number(snapshot.buy_and_hold_value),
      };
    });

    return NextResponse.json({
      sessionStartTime: startTime.toISOString(),
      data: formattedData,
    });
  } catch (error) {
    console.error('Error fetching performance history:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
