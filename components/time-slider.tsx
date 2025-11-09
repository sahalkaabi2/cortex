'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { IoPlayCircle, IoPauseCircle, IoRefreshCircle, IoPlaySkipBack, IoPlaySkipForward } from 'react-icons/io5';
import { DecisionTimestamp } from '@/lib/types';

interface TimeSliderProps {
  earliestTime: string | null;
  latestTime: string | null;
  currentTime: string;
  decisionTimestamps: DecisionTimestamp[];
  onTimeChange: (timestamp: string) => void;
  onJumpToLatest: () => void;
}

export function TimeSlider({
  earliestTime,
  latestTime,
  currentTime,
  decisionTimestamps,
  onTimeChange,
  onJumpToLatest,
}: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 1x, 2x, 5x

  useEffect(() => {
    if (!isPlaying || !earliestTime || !latestTime) return;

    const interval = setInterval(() => {
      const current = new Date(currentTime).getTime();
      const latest = new Date(latestTime).getTime();

      // Step forward by 1 minute * playSpeed
      const nextTime = new Date(current + 60000 * playSpeed);

      if (nextTime.getTime() >= latest) {
        setIsPlaying(false);
        onJumpToLatest();
      } else {
        onTimeChange(nextTime.toISOString());
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, earliestTime, latestTime, playSpeed, onTimeChange, onJumpToLatest]);

  if (!earliestTime || !latestTime) {
    return (
      <div className="flex items-center gap-2 p-4 border border-black dark:border-white">
        <span className="text-xs opacity-60">Loading historical data...</span>
      </div>
    );
  }

  const earliestMs = new Date(earliestTime).getTime();
  const latestMs = new Date(latestTime).getTime();
  const currentMs = new Date(currentTime).getTime();

  const totalRange = latestMs - earliestMs;
  const currentPosition = totalRange > 0 ? ((currentMs - earliestMs) / totalRange) * 100 : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percentage = Number(e.target.value);
    const newTimeMs = earliestMs + (totalRange * percentage / 100);
    onTimeChange(new Date(newTimeMs).toISOString());
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const cycleSpeed = () => {
    setPlaySpeed((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 5;
      return 1;
    });
  };

  const isAtLatest = currentMs >= latestMs - 1000; // Within 1 second

  // Navigation between decision timestamps
  const goToPreviousDecision = () => {
    const currentIndex = decisionTimestamps.findIndex(
      (dt) => new Date(dt.timestamp).getTime() <= currentMs
    );
    if (currentIndex < decisionTimestamps.length - 1) {
      onTimeChange(decisionTimestamps[currentIndex + 1].timestamp);
    }
  };

  const goToNextDecision = () => {
    const currentIndex = decisionTimestamps.findIndex(
      (dt) => new Date(dt.timestamp).getTime() < currentMs
    );
    if (currentIndex > 0) {
      onTimeChange(decisionTimestamps[currentIndex - 1].timestamp);
    } else if (currentIndex === -1 && decisionTimestamps.length > 0) {
      onTimeChange(decisionTimestamps[0].timestamp);
    }
  };

  const canGoPrevious = decisionTimestamps.some(
    (dt) => new Date(dt.timestamp).getTime() < currentMs
  );
  const canGoNext = decisionTimestamps.some(
    (dt) => new Date(dt.timestamp).getTime() > currentMs
  );

  return (
    <div className="flex flex-col gap-3 p-4 border border-black dark:border-white bg-white dark:bg-black">
      {/* Controls Row */}
      <div className="flex items-center gap-3">
        {/* Previous Decision */}
        <button
          onClick={goToPreviousDecision}
          className="text-xl hover:opacity-70 disabled:opacity-30"
          disabled={!canGoPrevious}
          title="Previous decision"
        >
          <IoPlaySkipBack />
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="text-2xl hover:opacity-70 disabled:opacity-30"
          disabled={isAtLatest}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <IoPauseCircle /> : <IoPlayCircle />}
        </button>

        {/* Next Decision */}
        <button
          onClick={goToNextDecision}
          className="text-xl hover:opacity-70 disabled:opacity-30"
          disabled={!canGoNext}
          title="Next decision"
        >
          <IoPlaySkipForward />
        </button>

        {/* Speed Control */}
        <button
          onClick={cycleSpeed}
          className="px-2 py-1 border border-black dark:border-white text-xs font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          title="Playback speed"
        >
          {playSpeed}x
        </button>

        {/* Current Time Display */}
        <div className="flex-1 text-xs font-mono">
          {format(new Date(currentTime), 'MMM dd, yyyy HH:mm:ss')}
        </div>

        {/* Jump to Latest */}
        <button
          onClick={onJumpToLatest}
          className="flex items-center gap-1 px-3 py-1 border border-black dark:border-white text-xs font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          title="Jump to latest"
        >
          <IoRefreshCircle className="text-sm" />
          LATEST
        </button>
      </div>

      {/* Slider with Markers */}
      <div className="flex items-center gap-3">
        <span className="text-xs opacity-60 font-mono whitespace-nowrap">
          {format(new Date(earliestTime), 'MMM dd HH:mm')}
        </span>

        <div className="flex-1 relative">
          {/* Decision Markers */}
          <div className="absolute w-full h-6 pointer-events-none" style={{ top: '-4px' }}>
            {decisionTimestamps.map((dt) => {
              const markerMs = new Date(dt.timestamp).getTime();
              const markerPosition = totalRange > 0 ? ((markerMs - earliestMs) / totalRange) * 100 : 0;

              // Determine marker size based on number of LLMs
              let markerSize = 'w-1.5 h-1.5';
              if (dt.llm_count >= 4) markerSize = 'w-2.5 h-2.5'; // All LLMs
              else if (dt.llm_count >= 2) markerSize = 'w-2 h-2'; // Most LLMs

              return (
                <div
                  key={dt.timestamp}
                  className={`absolute ${markerSize} bg-blue-500 dark:bg-blue-400 rounded-full cursor-pointer hover:scale-150 transition-transform`}
                  style={{ left: `${markerPosition}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                  onClick={() => onTimeChange(dt.timestamp)}
                  title={`${dt.llm_count} LLM${dt.llm_count > 1 ? 's' : ''}, ${dt.coin_count} coin${dt.coin_count > 1 ? 's' : ''}\n${format(new Date(dt.timestamp), 'MMM dd, HH:mm:ss')}`}
                />
              );
            })}
          </div>

          {/* Slider */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={currentPosition}
            onChange={handleSliderChange}
            className="w-full h-2 appearance-none cursor-pointer
              [&::-webkit-slider-track]:bg-gray-300 [&::-webkit-slider-track]:dark:bg-gray-700
              [&::-webkit-slider-track]:h-2 [&::-webkit-slider-track]:border [&::-webkit-slider-track]:border-black [&::-webkit-slider-track]:dark:border-white
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:dark:bg-white [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:dark:border-white [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-track]:bg-gray-300 [&::-moz-range-track]:dark:bg-gray-700
              [&::-moz-range-track]:h-2 [&::-moz-range-track]:border [&::-moz-range-track]:border-black [&::-moz-range-track]:dark:border-white
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:dark:bg-white [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:dark:border-white [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>

        <span className="text-xs opacity-60 font-mono whitespace-nowrap">
          {format(new Date(latestTime), 'MMM dd HH:mm')}
        </span>
      </div>
    </div>
  );
}
