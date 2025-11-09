import Image from 'next/image';

interface LLMIconProps {
  llm: string;
  size?: number;
  className?: string;
}

export function LLMIcon({ llm, size = 16, className = '' }: LLMIconProps) {
  const iconMap: Record<string, string> = {
    OpenAI: '/icons/llm/openai.svg',
    Claude: '/icons/llm/claude.svg',
    DeepSeek: '/icons/llm/deepseek.svg',
    Qwen: '/icons/llm/qwen.svg',
  };

  const iconPath = iconMap[llm];

  if (!iconPath) {
    return null;
  }

  return (
    <Image
      src={iconPath}
      alt={llm}
      width={size}
      height={size}
      className={`inline-block ${className}`}
    />
  );
}
