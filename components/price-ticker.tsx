'use client';

import { useState, useEffect } from 'react';
import { CryptoIcon } from './crypto-icon';
import { IoSunny, IoMoon, IoSettings, IoTrash, IoDownload, IoPulse, IoCreate, IoGrid } from 'react-icons/io5';

interface PriceData {
  coin: string;
  price: number;
  change24h: number;
}

interface PriceTickerProps {
  isDarkMode: boolean;
  isRunning: boolean;
  onToggleDarkMode: () => void;
  onOpenPrompts: () => void;
  onOpenPredictions: () => void;
  onOpenSettings: () => void;
  onOpenHealthCheck: () => void;
  onClearData: () => void;
  onExport: () => void;
}

export function PriceTicker({
  isDarkMode,
  isRunning,
  onToggleDarkMode,
  onOpenPrompts,
  onOpenPredictions,
  onOpenSettings,
  onOpenHealthCheck,
  onClearData,
  onExport,
}: PriceTickerProps) {
  const [prices, setPrices] = useState<PriceData[]>([
    { coin: 'BTC', price: 0, change24h: 0 },
    { coin: 'ETH', price: 0, change24h: 0 },
    { coin: 'BNB', price: 0, change24h: 0 },
    { coin: 'XRP', price: 0, change24h: 0 },
    { coin: 'SOL', price: 0, change24h: 0 },
  ]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    try {
      const coins = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL'];
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(
          coins.map((c) => `${c}USDT`)
        )}`
      );
      const data = await response.json();

      const priceData = data.map((item: any, index: number) => ({
        coin: coins[index],
        price: parseFloat(item.lastPrice),
        change24h: parseFloat(item.priceChangePercent),
      }));

      setPrices(priceData);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  return (
    <div className="border-b border-black dark:border-white">
      <div className="flex items-center justify-between px-6 py-2">
        <div className="flex items-center">
          {prices.map((item, index) => (
            <div key={item.coin} className="flex items-center">
              {index > 0 && (
                <div className="w-px h-6 bg-black dark:bg-white mx-2" />
              )}
              <div className="font-mono flex items-center gap-1">
                <CryptoIcon coin={item.coin} size={16} />
                <span className="font-bold text-sm">{item.coin}</span>
                <span className="mx-2 text-sm">
                  ${item.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className={`text-xs ${item.change24h >= 0 ? '' : 'opacity-50'}`}>
                  {item.change24h >= 0 ? '+' : ''}
                  {item.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={onToggleDarkMode}
            className="p-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <IoSunny size={16} /> : <IoMoon size={16} />}
          </button>
          <button
            onClick={onOpenHealthCheck}
            className="p-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            title="System Health Check"
          >
            <IoPulse size={16} />
          </button>
          <button
            onClick={onOpenPrompts}
            className="p-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            title="Prompt Engineering"
          >
            <IoCreate size={16} />
          </button>
          <button
            onClick={onOpenPredictions}
            className="p-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            title="Predictions Heat Map"
          >
            <IoGrid size={16} />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            title="Settings"
          >
            <IoSettings size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              if (isRunning) {
                alert('⚠️ Please STOP trading before clearing data.\n\nClick the "STOP TRADING" button first, then try again.');
                return;
              }

              onClearData();
            }}
            className={`p-2 border transition-colors ${
              isRunning
                ? 'border-gray-400 dark:border-gray-600 text-gray-400 dark:text-gray-600 opacity-50'
                : 'border-black dark:border-white hover:bg-red-600 hover:text-white dark:hover:bg-red-600'
            }`}
            title={isRunning ? '⚠️ Stop trading first' : 'Clear all data and reset to $100'}
          >
            <IoTrash size={16} />
          </button>
          <button
            onClick={onExport}
            className="p-2 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            title="Export Data"
          >
            <IoDownload size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
