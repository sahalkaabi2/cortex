import { NextResponse } from 'next/server';
import { getCurrentSummary } from '@/lib/summary';

/**
 * GET /api/summary
 * Get current summary statistics across all traders
 */
export async function GET() {
  try {
    const summary = await getCurrentSummary();

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error getting summary:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
