import { OpenAIProvider } from './openai';
import { ClaudeProvider } from './claude';
import { DeepSeekProvider } from './deepseek';
import { QwenProvider } from './qwen';
import { LLMProvider as LLMProviderType } from '../types';

export { OpenAIProvider, ClaudeProvider, DeepSeekProvider, QwenProvider };

export function getLLMProvider(provider: LLMProviderType, model?: string) {
  console.log(`[LLM FACTORY] Creating ${provider} provider with model: ${model || 'default'}`);

  switch (provider) {
    case 'OpenAI':
      return new OpenAIProvider(model);
    case 'Claude':
      return new ClaudeProvider(model);
    case 'DeepSeek':
      return new DeepSeekProvider(model);
    case 'Qwen':
      return new QwenProvider(model);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
