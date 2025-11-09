/**
 * Model Registry and Pricing Configuration
 *
 * This module provides:
 * - Default model configurations for all LLM providers
 * - Pricing information (input/output per 1M tokens)
 * - Helper functions for model management
 * - API response normalization
 */

export interface ModelInfo {
  id: string;
  name: string;
  inputPrice: number;  // Price per 1M input tokens
  outputPrice: number; // Price per 1M output tokens
  contextWindow?: number;
}

export interface ModelRegistry {
  [provider: string]: {
    default: string;
    models: ModelInfo[];
  };
}

/**
 * Default Model Registry with Pricing
 * Updated as of January 2025
 *
 * PRICING NOTE: All prices are per 1 million tokens (input/output).
 * - OpenAI & Claude: Verified accurate as of Jan 2025
 * - DeepSeek: Updated to cache-miss pricing (Jan 2025)
 * - Qwen: Updated to International/Singapore region pricing (Jan 2025)
 *   Note: Mainland China pricing is significantly lower for Qwen models
 */
export const MODEL_REGISTRY: ModelRegistry = {
  'OpenAI': {
    default: 'gpt-4o',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        inputPrice: 2.50,
        outputPrice: 10.00,
        contextWindow: 128000
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        inputPrice: 0.15,
        outputPrice: 0.60,
        contextWindow: 128000
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        inputPrice: 10.00,
        outputPrice: 30.00,
        contextWindow: 128000
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        inputPrice: 30.00,
        outputPrice: 60.00,
        contextWindow: 8192
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        inputPrice: 0.50,
        outputPrice: 1.50,
        contextWindow: 16385
      },
      {
        id: 'o1-preview',
        name: 'O1 Preview',
        inputPrice: 15.00,
        outputPrice: 60.00,
        contextWindow: 128000
      },
      {
        id: 'o1-mini',
        name: 'O1 Mini',
        inputPrice: 3.00,
        outputPrice: 12.00,
        contextWindow: 128000
      }
    ]
  },
  'Claude': {
    default: 'claude-3-5-sonnet-20241022',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet (Oct 2024)',
        inputPrice: 3.00,
        outputPrice: 15.00,
        contextWindow: 200000
      },
      {
        id: 'claude-3-5-sonnet-20240620',
        name: 'Claude 3.5 Sonnet (Jun 2024)',
        inputPrice: 3.00,
        outputPrice: 15.00,
        contextWindow: 200000
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        inputPrice: 0.80,
        outputPrice: 4.00,
        contextWindow: 200000
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        inputPrice: 15.00,
        outputPrice: 75.00,
        contextWindow: 200000
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        inputPrice: 3.00,
        outputPrice: 15.00,
        contextWindow: 200000
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        inputPrice: 0.25,
        outputPrice: 1.25,
        contextWindow: 200000
      },
      {
        id: 'claude-2.1',
        name: 'Claude 2.1',
        inputPrice: 8.00,
        outputPrice: 24.00,
        contextWindow: 200000
      },
      {
        id: 'claude-2.0',
        name: 'Claude 2.0',
        inputPrice: 8.00,
        outputPrice: 24.00,
        contextWindow: 100000
      }
    ]
  },
  'DeepSeek': {
    default: 'deepseek-chat',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        inputPrice: 0.28, // Updated Jan 2025 - cache miss pricing
        outputPrice: 0.42,
        contextWindow: 64000
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        inputPrice: 0.28, // Updated Jan 2025 - estimated based on chat pricing
        outputPrice: 0.42,
        contextWindow: 64000
      }
    ]
  },
  'Qwen': {
    default: 'qwen-plus',
    models: [
      {
        id: 'qwen-max',
        name: 'Qwen Max',
        inputPrice: 1.2, // Updated Jan 2025 - International/Singapore pricing
        outputPrice: 6.0,
        contextWindow: 30720
      },
      {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        inputPrice: 0.4, // Updated Jan 2025 - International/Singapore pricing
        outputPrice: 1.2,
        contextWindow: 131072
      },
      {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        inputPrice: 0.05, // Updated Jan 2025 - International/Singapore pricing
        outputPrice: 0.2,
        contextWindow: 131072
      },
      {
        id: 'qwen-long',
        name: 'Qwen Long',
        inputPrice: 0.072, // Updated Jan 2025 - Mainland China pricing
        outputPrice: 0.287,
        contextWindow: 1000000
      },
      {
        id: 'qwen2.5-72b-instruct',
        name: 'Qwen 2.5 72B Instruct',
        inputPrice: 1.40, // Updated Jan 2025 - International/Singapore pricing
        outputPrice: 5.60,
        contextWindow: 131072
      },
      {
        id: 'qwen2.5-32b-instruct',
        name: 'Qwen 2.5 32B Instruct',
        inputPrice: 0.70, // Updated Jan 2025 - International/Singapore pricing
        outputPrice: 2.80,
        contextWindow: 131072
      }
    ]
  }
};

/**
 * Get the default model ID for a provider
 */
export function getDefaultModel(provider: string): string {
  const registry = MODEL_REGISTRY[provider];
  if (!registry) {
    console.warn(`[MODELS] Unknown provider: ${provider}, using first available`);
    return '';
  }
  return registry.default;
}

/**
 * Get pricing for a specific model
 * Returns fallback pricing if model not found
 */
export function getModelPricing(provider: string, modelId: string): { inputPrice: number; outputPrice: number } {
  const registry = MODEL_REGISTRY[provider];

  if (!registry) {
    console.warn(`[MODELS] Unknown provider: ${provider}`);
    return { inputPrice: 1.0, outputPrice: 2.0 }; // Generic fallback
  }

  const model = registry.models.find(m => m.id === modelId);

  if (!model) {
    console.warn(`[MODELS] Model ${modelId} not found for ${provider}, using default`);
    const defaultModel = registry.models.find(m => m.id === registry.default);
    return {
      inputPrice: defaultModel?.inputPrice || 1.0,
      outputPrice: defaultModel?.outputPrice || 2.0
    };
  }

  return {
    inputPrice: model.inputPrice,
    outputPrice: model.outputPrice
  };
}

/**
 * Normalize model name for display
 * Converts IDs like "gpt-4o" to "GPT-4o"
 */
export function normalizeModelName(modelId: string): string {
  const registry = Object.values(MODEL_REGISTRY);

  for (const providerRegistry of registry) {
    const model = providerRegistry.models.find(m => m.id === modelId);
    if (model) {
      return model.name;
    }
  }

  // Fallback: capitalize and clean up
  return modelId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Parse API response from different providers into unified format
 */
export function parseModelResponse(provider: string, data: any): ModelInfo[] {
  switch (provider) {
    case 'OpenAI':
    case 'DeepSeek':
    case 'Qwen':
      // OpenAI-compatible format: { data: [{ id: string, ... }] }
      if (Array.isArray(data?.data)) {
        return data.data
          .filter((m: any) => m.id)
          .map((m: any) => {
            const existingModel = MODEL_REGISTRY[provider]?.models.find(
              model => model.id === m.id
            );

            return {
              id: m.id,
              name: existingModel?.name || normalizeModelName(m.id),
              inputPrice: existingModel?.inputPrice || 1.0,
              outputPrice: existingModel?.outputPrice || 2.0,
              contextWindow: m.context_length || existingModel?.contextWindow
            };
          });
      }
      break;

    case 'Claude':
      // Anthropic format: { data: [{ id: string, display_name: string, ... }] }
      if (Array.isArray(data?.data)) {
        return data.data
          .filter((m: any) => m.id)
          .map((m: any) => {
            const existingModel = MODEL_REGISTRY.Claude?.models.find(
              model => model.id === m.id
            );

            return {
              id: m.id,
              name: m.display_name || existingModel?.name || normalizeModelName(m.id),
              inputPrice: existingModel?.inputPrice || 3.0,
              outputPrice: existingModel?.outputPrice || 15.0,
              contextWindow: existingModel?.contextWindow || 200000
            };
          });
      }
      break;
  }

  console.warn(`[MODELS] Could not parse response for ${provider}`, data);
  return [];
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): string[] {
  return Object.keys(MODEL_REGISTRY);
}

/**
 * Get all models for a specific provider
 */
export function getModelsForProvider(provider: string): ModelInfo[] {
  const registry = MODEL_REGISTRY[provider];
  return registry?.models || [];
}

/**
 * Validate if a model exists for a provider
 */
export function isValidModel(provider: string, modelId: string): boolean {
  const registry = MODEL_REGISTRY[provider];
  if (!registry) return false;
  return registry.models.some(m => m.id === modelId);
}
