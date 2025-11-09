'use client';

interface FrequencySelectorProps {
  selectedFrequency: number;
  onChange: (frequency: number) => void;
}

const INTERVAL_OPTIONS = [
  { label: '1 MIN', value: 1 },
  { label: '2 MIN', value: 2 },
  { label: '5 MIN', value: 5 },
  { label: '10 MIN', value: 10 },
  { label: '15 MIN', value: 15 },
  { label: '30 MIN', value: 30 },
  { label: '1 HR', value: 60 },
  { label: '2 HR', value: 120 },
  { label: '4 HR', value: 240 },
];

export function FrequencySelector({ selectedFrequency, onChange }: FrequencySelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <label className="text-xs font-bold">UPDATE FREQUENCY:</label>
      <select
        value={selectedFrequency}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-2 border border-black dark:border-white bg-white dark:bg-black text-xs font-bold"
      >
        {INTERVAL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
