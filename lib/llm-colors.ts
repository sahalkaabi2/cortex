/**
 * LLM Brand Colors
 * Centralized color definitions for consistent UI theming
 */

export const LLM_COLORS = {
  OpenAI: 'rgb(81, 164, 132)',      // Green
  Claude: 'rgb(208, 128, 100)',     // Orange/Tan
  DeepSeek: 'rgb(89, 111, 245)',    // Blue
  Qwen: 'rgb(101, 103, 171)',       // Purple
  BuyAndHold: 'rgb(128, 128, 128)', // Gray
} as const;

export type LLMName = keyof typeof LLM_COLORS;

/**
 * Get the brand color for an LLM
 */
export const getLLMColor = (llmName: string): string => {
  return LLM_COLORS[llmName as LLMName] || 'currentColor';
};

/**
 * Get color with opacity
 */
export const getLLMColorWithOpacity = (llmName: string, opacity: number): string => {
  const color = getLLMColor(llmName);
  if (color === 'currentColor') return color;

  // Extract RGB values
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return color;

  const [_, r, g, b] = match;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
