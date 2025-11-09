import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { PredictionsResponse, PredictionData, CRYPTO_PAIRS, LLM_PROVIDERS, DecisionTimestamp, MissingDecision } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeWindow = searchParams.get('timeWindow') || '24h'; // Default to 24 hours
    const timestamp = searchParams.get('timestamp'); // Optional: for historical view

    // Calculate time window start
    const now = new Date();
    const windowStarts: Record<string, Date> = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '6h': new Date(now.getTime() - 6 * 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      'all': new Date(0),
    };
    const windowStart = windowStarts[timeWindow] || windowStarts['24h'];

    // Get available time range
    const { data: timeRangeData } = await supabase
      .from('llm_decisions')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1);

    const { data: latestTimeData } = await supabase
      .from('llm_decisions')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    const availableTimeRange = {
      earliest: timeRangeData && timeRangeData.length > 0 ? timeRangeData[0].created_at : null,
      latest: latestTimeData && latestTimeData.length > 0 ? latestTimeData[0].created_at : null,
    };

    let predictions: PredictionData[] = [];
    let effectiveTimestamp: string;

    // Fetch ALL decisions in one query, then group by LLM-coin pair on backend
    const query = supabase
      .from('llm_decisions')
      .select(`
        *,
        llm_traders!inner(provider, name)
      `)
      .order('created_at', { ascending: false });

    // Apply timestamp filter if in historical mode
    if (timestamp) {
      effectiveTimestamp = timestamp;
      query.lte('created_at', timestamp);
    } else {
      effectiveTimestamp = new Date().toISOString();
    }

    const { data: allDecisions } = await query;

    // Group decisions by LLM-coin pair and get most recent for each
    const decisionMap = new Map<string, any>();

    allDecisions?.forEach((decision: any) => {
      const key = `${decision.llm_traders.provider}-${decision.coin}`;

      // Only keep the most recent decision for each LLM-coin pair
      if (!decisionMap.has(key)) {
        decisionMap.set(key, decision);
      }
    });

    // Convert map to predictions array
    decisionMap.forEach((decision) => {
      predictions.push({
        llm_name: decision.llm_traders.provider,
        coin: decision.coin,
        action: decision.decision_type as 'BUY' | 'SELL' | 'HOLD',
        confidence: decision.confidence || 0,
        reasoning: decision.reasoning || '',
        current_price: decision.market_data?.price || 0,
        profit_target: decision.profit_target || null,
        stop_loss_price: decision.stop_loss_price || null,
        created_at: decision.created_at,
        suggested_amount: decision.suggested_amount || 0,
      });
    });

    // Get decision timestamps (grouped by time)
    const { data: decisionsForTimestamps } = await supabase
      .from('llm_decisions')
      .select(`
        created_at,
        coin,
        llm_traders!inner(provider)
      `)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    // Group decisions by rounded timestamp (to nearest minute)
    const timestampGroups = new Map<string, { llms: Set<string>; coins: Set<string> }>();

    decisionsForTimestamps?.forEach((decision: any) => {
      const roundedTime = new Date(decision.created_at);
      roundedTime.setSeconds(0, 0);
      const timeKey = roundedTime.toISOString();

      if (!timestampGroups.has(timeKey)) {
        timestampGroups.set(timeKey, { llms: new Set(), coins: new Set() });
      }

      const group = timestampGroups.get(timeKey)!;
      group.llms.add(decision.llm_traders.provider);
      group.coins.add(decision.coin);
    });

    const decisionTimestamps: DecisionTimestamp[] = Array.from(timestampGroups.entries())
      .map(([timestamp, group]) => ({
        timestamp,
        llm_count: group.llms.size,
        coin_count: group.coins.size,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate coverage (what's missing)
    const totalExpected = LLM_PROVIDERS.length * CRYPTO_PAIRS.length;
    const totalFound = predictions.length;
    const missing: MissingDecision[] = [];

    for (const llm of LLM_PROVIDERS) {
      for (const coin of CRYPTO_PAIRS) {
        const hasPrediction = predictions.some(
          (p) => p.llm_name === llm && p.coin === coin
        );
        if (!hasPrediction) {
          missing.push({ llm, coin });
        }
      }
    }

    //Group all decisions by timestamp for caching
    const allDecisionsGrouped = new Map<string, PredictionData[]>();

    allDecisions?.forEach((decision: any) => {
      const roundedTime = new Date(decision.created_at);
      roundedTime.setSeconds(0, 0);
      const timeKey = roundedTime.toISOString();

      if (!allDecisionsGrouped.has(timeKey)) {
        allDecisionsGrouped.set(timeKey, []);
      }

      allDecisionsGrouped.get(timeKey)!.push({
        llm_name: decision.llm_traders.provider,
        coin: decision.coin,
        action: decision.decision_type as 'BUY' | 'SELL' | 'HOLD',
        confidence: decision.confidence || 0,
        reasoning: decision.reasoning || '',
        current_price: decision.market_data?.price || 0,
        profit_target: decision.profit_target || null,
        stop_loss_price: decision.stop_loss_price || null,
        created_at: decision.created_at,
        suggested_amount: decision.suggested_amount || 0,
      });
    });

    const response: PredictionsResponse & { allDecisionsGrouped?: Record<string, PredictionData[]> } = {
      predictions,
      timestamp: effectiveTimestamp,
      availableTimeRange,
      decisionTimestamps,
      coverage: {
        total_expected: totalExpected,
        total_found: totalFound,
        missing,
      },
      // Include all decisions grouped by timestamp for frontend caching
      allDecisionsGrouped: Object.fromEntries(allDecisionsGrouped),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions', details: String(error) },
      { status: 500 }
    );
  }
}
