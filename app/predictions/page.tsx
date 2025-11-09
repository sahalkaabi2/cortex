'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PredictionsHeatMap } from '@/components/predictions-heat-map';
import { ViewOptionsSelector } from '@/components/view-options-selector';
import { TimeSlider } from '@/components/time-slider';
import { PredictionsResponse } from '@/lib/types';
import { IoArrowBack } from 'react-icons/io5';

export default function PredictionsPage() {
  const router = useRouter();
  const [predictions, setPredictions] = useState<PredictionsResponse | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState('24h'); // Default 24 hours
  const [currentTimestamp, setCurrentTimestamp] = useState<string | null>(null); // null = live mode
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [decisionsCache, setDecisionsCache] = useState<Record<string, any>>({}); // Cache of all decisions

  // Fetch predictions
  const fetchPredictions = async (timestamp?: string, isBackgroundRefresh = false) => {
    try {
      // Only show initial loading on first load or time window change
      if (!isBackgroundRefresh) {
        setIsInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const params = new URLSearchParams({
        timeWindow: selectedWindow,
      });

      if (timestamp) {
        params.append('timestamp', timestamp);
      }

      const response = await fetch(`/api/predictions?${params.toString()}`);
      const data: any = await response.json();

      // Cache all decisions grouped by timestamp
      if (data.allDecisionsGrouped) {
        setDecisionsCache(data.allDecisionsGrouped);
      }

      setPredictions(data);
      if (!timestamp) {
        setCurrentTimestamp(data.timestamp);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPredictions();
  }, []);

  // Get predictions from cache by timestamp (instant lookup)
  const getCachedPredictions = (timestamp: string): any[] => {
    // Round timestamp to nearest minute
    const roundedTime = new Date(timestamp);
    roundedTime.setSeconds(0, 0);
    const timeKey = roundedTime.toISOString();

    return decisionsCache[timeKey] || [];
  };

  // Auto-refresh in live mode
  useEffect(() => {
    if (!isLiveMode) return;

    // Refresh every 10 seconds in live mode (background mode)
    const refreshInterval = 10000;
    const interval = setInterval(() => {
      fetchPredictions(undefined, true); // true = background refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isLiveMode, selectedWindow]);

  // Handle window change
  const handleWindowChange = (window: string) => {
    setSelectedWindow(window);
    if (isLiveMode) {
      fetchPredictions();
    } else {
      fetchPredictions(currentTimestamp || undefined);
    }
  };

  // Handle time change (historical view) - Use cache for instant update
  const handleTimeChange = (timestamp: string) => {
    setIsLiveMode(false);
    setCurrentTimestamp(timestamp);

    // Get cached predictions for this timestamp (instant, no API call)
    const cachedPreds = getCachedPredictions(timestamp);

    if (cachedPreds.length > 0 && predictions) {
      // Update predictions with cached data instantly
      setPredictions({
        ...predictions,
        predictions: cachedPreds,
        timestamp: timestamp,
      });
    }
    // If cache miss (shouldn't happen), data will update on next auto-refresh
  };

  // Jump to latest
  const handleJumpToLatest = () => {
    setIsLiveMode(true);
    setCurrentTimestamp(null);
    fetchPredictions();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-mono p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Subtle Auto-Refresh Indicator */}
        {isRefreshing && (
          <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded shadow-lg text-xs font-bold">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Updating...
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-3 py-2 border border-black dark:border-white text-xs font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
            >
              <IoArrowBack />
              DASHBOARD
            </button>
            <h1 className="text-2xl font-bold">LLM PREDICTIONS HEAT MAP</h1>
          </div>

          {/* Live Indicator */}
          <div className="flex items-center gap-2">
            {isLiveMode ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-green-600 dark:text-green-400">LIVE</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                  HISTORICAL
                </span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* View Options Selector */}
          <div className="border border-black dark:border-white p-4">
            <ViewOptionsSelector
              selectedWindow={selectedWindow}
              onChange={handleWindowChange}
            />
          </div>

          {/* Coverage Panel */}
          <div className="border border-black dark:border-white p-4">
            <div className="text-xs font-bold mb-2">DECISION COVERAGE</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="opacity-70">Total Expected:</span>
                <span className="font-bold">{predictions?.coverage.total_expected || 20}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70">Available:</span>
                <span className="font-bold">{predictions?.coverage.total_found || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-70">Missing:</span>
                <span className="font-bold text-red-600 dark:text-red-400">
                  {predictions?.coverage.missing.length || 0}
                </span>
              </div>
              {predictions && predictions.coverage.missing.length > 0 && (
                <div className="mt-2 pt-2 border-t border-black dark:border-white opacity-60">
                  {predictions.coverage.missing.slice(0, 5).map((m) => (
                    <div key={`${m.llm}-${m.coin}`} className="text-[10px]">
                      {m.llm} - {m.coin}
                    </div>
                  ))}
                  {predictions.coverage.missing.length > 5 && (
                    <div className="text-[10px]">
                      +{predictions.coverage.missing.length - 5} more
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Time Slider */}
        {predictions?.availableTimeRange && (
          <TimeSlider
            earliestTime={predictions.availableTimeRange.earliest}
            latestTime={predictions.availableTimeRange.latest}
            currentTime={currentTimestamp || predictions.timestamp}
            decisionTimestamps={predictions.decisionTimestamps || []}
            onTimeChange={handleTimeChange}
            onJumpToLatest={handleJumpToLatest}
          />
        )}

        {/* Heat Map */}
        <div className="border-2 border-black dark:border-white">
          {isInitialLoading ? (
            <div className="flex items-center justify-center p-20">
              <div className="text-center space-y-2">
                <div className="inline-block w-8 h-8 border-4 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-bold opacity-60">Loading predictions...</div>
              </div>
            </div>
          ) : predictions && predictions.predictions.length > 0 ? (
            <div className="transition-opacity duration-300 ease-in-out">
              <PredictionsHeatMap predictions={predictions.predictions} />
            </div>
          ) : (
            <div className="flex items-center justify-center p-20">
              <div className="text-center space-y-2">
                <div className="text-xs font-bold opacity-60">No predictions available</div>
                <div className="text-xs opacity-40">
                  LLMs haven&apos;t made any trading decisions yet
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="border border-black dark:border-white p-4">
          <div className="text-xs font-bold mb-3">LEGEND</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border border-black dark:border-white" style={{ backgroundColor: 'rgba(34, 197, 94, 0.7)' }} />
              <div>
                <div className="text-xs font-bold">BUY</div>
                <div className="text-xs opacity-60">Bullish signal</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border border-black dark:border-white" style={{ backgroundColor: 'rgba(156, 163, 175, 0.7)' }} />
              <div>
                <div className="text-xs font-bold">HOLD</div>
                <div className="text-xs opacity-60">Neutral / wait</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border border-black dark:border-white" style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }} />
              <div>
                <div className="text-xs font-bold">SELL</div>
                <div className="text-xs opacity-60">Bearish signal</div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-black dark:border-white">
            <div className="text-xs opacity-60">
              Cell opacity represents confidence level • Hover over cells for detailed information
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
