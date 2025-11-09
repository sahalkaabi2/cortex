'use client';

interface ViewOptionsSelectorProps {
  selectedWindow: string;
  onChange: (window: string) => void;
}

const TIME_WINDOW_OPTIONS = [
  { label: 'LAST 1 HOUR', value: '1h' },
  { label: 'LAST 6 HOURS', value: '6h' },
  { label: 'LAST 24 HOURS', value: '24h' },
  { label: 'LAST 7 DAYS', value: '7d' },
  { label: 'ALL TIME', value: 'all' },
];

export function ViewOptionsSelector({ selectedWindow, onChange }: ViewOptionsSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <label className="text-xs font-bold">TIME WINDOW:</label>
      <select
        value={selectedWindow}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-black dark:border-white bg-white dark:bg-black text-xs font-bold"
      >
        {TIME_WINDOW_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
