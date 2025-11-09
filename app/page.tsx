'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PerformanceChart } from '@/components/performance-chart';
import { ActivityFeed } from '@/components/activity-feed';
import { SettingsModal } from '@/components/settings-modal';
import { HealthCheckModal } from '@/components/health-check-modal';
import { ConfirmModal } from '@/components/confirm-modal';
import { PriceTicker } from '@/components/price-ticker';

export default function Home() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaperMode, setIsPaperMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1);
  const [isClearingData, setIsClearingData] = useState(false);
  // Initialize with default value (true for dark mode) to avoid hydration mismatch
  // Will be updated from localStorage in useEffect after mount
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [splitPercentage, setSplitPercentage] = useState(75); // Chart width percentage
  const [isDragging, setIsDragging] = useState(false);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<string | undefined>(undefined);
  const [decisions, setDecisions] = useState([]);
  const [positions, setPositions] = useState([]);
  const [traders, setTraders] = useState([]);
  const [completedTrades, setCompletedTrades] = useState([]);

  // Sync trading state on mount
  useEffect(() => {
    // Load theme preference from localStorage (client-side only)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }

    // Check if trading is currently running on backend
    const checkTradingStatus = async () => {
      try {
        const response = await fetch('/api/trading');
        const data = await response.json();
        if (data.success && data.isRunning) {
          setIsRunning(true);
          console.log('[FRONTEND] Trading is currently running on backend');
        }
      } catch (error) {
        console.error('Error checking trading status:', error);
      }
    };

    checkTradingStatus();

    // Load split percentage preference
    const savedSplit = localStorage.getItem('splitPercentage');
    if (savedSplit) {
      setSplitPercentage(parseFloat(savedSplit));
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Handle resizable divider
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const containerWidth = window.innerWidth;
    const newPercentage = (e.clientX / containerWidth) * 100;

    // Constrain between 50% and 90%
    const constrainedPercentage = Math.min(Math.max(newPercentage, 50), 90);
    setSplitPercentage(constrainedPercentage);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      localStorage.setItem('splitPercentage', splitPercentage.toString());
    }
  };

  // Add/remove mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, splitPercentage]);

  // Fetch historical performance data
  const fetchHistoricalData = async () => {
    try {
      const response = await fetch('/api/data/history');
      const result = await response.json();

      // Handle both old array format and new object format for backward compatibility
      if (Array.isArray(result)) {
        // Old format: just an array
        if (result.length > 0) {
          setPerformanceData(result);
          console.log(`[FRONTEND] Loaded ${result.length} historical data points`);
        }
      } else if (result.data && Array.isArray(result.data)) {
        // New format: object with sessionStartTime and data
        if (result.data.length > 0) {
          setPerformanceData(result.data);
          setSessionStartTime(result.sessionStartTime);
          console.log(`[FRONTEND] Loaded ${result.data.length} historical data points`);
        }
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  // Fetch data from API
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();

      setDecisions(data.decisions);
      setPositions(data.positions);
      setTraders(data.traders || []);
      setCompletedTrades(data.completedTrades || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Toggle trading engine
  const handleToggleRunning = async () => {
    const action = isRunning ? 'stop' : 'start';

    try {
      const response = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          isPaperMode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsRunning(!isRunning);
      } else {
        alert(result.message || `Failed to ${action} trading`);
      }
    } catch (error) {
      console.error('Error toggling trading:', error);
      alert(`Error ${action}ing trading: ` + error);
    }
  };

  // Toggle paper/live mode
  const handleToggleMode = async () => {
    if (isRunning) {
      alert('Stop trading before changing mode');
      return;
    }

    const newMode = !isPaperMode;
    try {
      await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-mode',
          isPaperMode: newMode,
        }),
      });

      setIsPaperMode(newMode);
    } catch (error) {
      console.error('Error toggling mode:', error);
    }
  };

  // Export data
  const handleExport = () => {
    const exportData = {
      performanceData,
      decisions,
      positions,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-trading-export-${Date.now()}.json`;
    a.click();
  };

  // Save settings
  const handleSaveSettings = async (settings: any) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      // Check both HTTP status and success flag
      if (response.ok && result.success) {
        alert('Settings saved! Stop and restart trading for changes to take effect.');
      } else {
        // Show actual error message from API
        const errorMsg = result.message || result.error || 'Failed to save settings';
        alert(`Failed to save settings: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(`Error saving settings: ${error.message || String(error)}`);
    }
  };

  // Clear all data
  const handleClearData = () => {
    if (isRunning) {
      alert('⚠️ Stop trading before clearing data');
      return;
    }

    // Show first confirmation modal
    setConfirmStep(1);
    setIsConfirmClearOpen(true);
  };

  // Handle confirmation modal actions
  const handleConfirmClear = () => {
    if (confirmStep === 1) {
      // Move to second confirmation
      setConfirmStep(2);
    } else if (confirmStep === 2) {
      // Keep modal open and execute clear (modal will show loading state)
      executeClearData();
    }
  };

  const handleCancelClear = () => {
    setIsConfirmClearOpen(false);
    setConfirmStep(1);
  };

  // Execute the actual clear operation
  const executeClearData = async () => {
    setIsClearingData(true);
    try {
      const response = await fetch('/api/clear', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        // Reset local state
        setPerformanceData([
          {
            timestamp: new Date().toLocaleTimeString(),
            OpenAI: 100,
            Claude: 100,
            DeepSeek: 100,
            Qwen: 100,
            BuyAndHold: 100,
          },
        ]);
        setDecisions([]);
        setPositions([]);

        alert('✓ All data cleared! Starting fresh.');
      } else {
        alert('Failed to clear data: ' + result.error);
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data');
    } finally {
      setIsClearingData(false);
      setIsConfirmClearOpen(false);
      setConfirmStep(1);
    }
  };

  // Auto-refresh data
  useEffect(() => {
    // Load historical data first
    fetchHistoricalData();

    // Fetch current data
    fetchData();

    // Refresh historical data every 5 seconds (snapshots are saved automatically)
    const historyInterval = setInterval(fetchHistoricalData, 5000);

    // Refresh other data every 5 seconds
    const dataInterval = setInterval(fetchData, 5000);

    return () => {
      clearInterval(historyInterval);
      clearInterval(dataInterval);
    };
  }, []);

  return (
    <main className="h-screen overflow-hidden bg-white dark:bg-black text-black dark:text-white">
      {/* Price Ticker with Controls */}
      <PriceTicker
        isDarkMode={isDarkMode}
        isRunning={isRunning}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenPrompts={() => router.push('/prompts')}
        onOpenPredictions={() => router.push('/predictions')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHealthCheck={() => setIsHealthCheckOpen(true)}
        onClearData={handleClearData}
        onExport={handleExport}
      />

      {/* Dashboard Layout: Resizable Chart + Feed */}
      <div className="flex h-[calc(100vh-50px)] relative overflow-hidden">
        {/* Performance Chart */}
        <div
          className="p-6 overflow-auto"
          style={{ width: `${splitPercentage}%` }}
        >
          <PerformanceChart data={performanceData} traders={traders} sessionStartTime={sessionStartTime} />
        </div>

        {/* Draggable Divider */}
        <div
          className="relative cursor-col-resize group border-r border-black dark:border-white"
          onMouseDown={handleMouseDown}
          style={{
            width: '1px',
            borderWidth: isDragging ? '2px' : '1px',
          }}
        >
          {/* Expanded hit area for easier grabbing */}
          <div className="absolute inset-y-0 -left-2 -right-2" />
          {/* Visual handle indicator */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-16 bg-black dark:bg-white opacity-0 group-hover:opacity-40 transition-opacity" />
        </div>

        {/* Activity Feed */}
        <div
          className="py-6 overflow-hidden"
          style={{ width: `${100 - splitPercentage}%` }}
        >
          <ActivityFeed
            decisions={decisions}
            positions={positions}
            traders={traders}
            completedTrades={completedTrades}
            isRunning={isRunning}
            isPaperMode={isPaperMode}
            onToggleRunning={handleToggleRunning}
            onToggleMode={handleToggleMode}
          />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* Health Check Modal */}
      <HealthCheckModal
        isOpen={isHealthCheckOpen}
        onClose={() => setIsHealthCheckOpen(false)}
      />

      {/* Clear Data Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmClearOpen}
        title={confirmStep === 1 ? '⚠️ WARNING: Delete All Data?' : '⚠️ FINAL CONFIRMATION'}
        message={
          confirmStep === 1
            ? 'This will delete ALL experiment data:\n\n• All decisions\n• All trades\n• All positions\n• All market history\n• Reset all balances to $100\n\nThis cannot be undone. Continue?'
            : 'Are you absolutely sure?\n\nThis action is PERMANENT and cannot be reversed.'
        }
        confirmText={confirmStep === 1 ? 'YES, CONTINUE' : 'DELETE ALL DATA'}
        cancelText="CANCEL"
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
        isDanger={true}
        isLoading={isClearingData}
      />
    </main>
  );
}
