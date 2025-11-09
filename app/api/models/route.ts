import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { parseModelResponse, getModelsForProvider, ModelInfo } from '@/lib/models';

/**
 * GET /api/models?provider=OpenAI
 * Fetch available models from LLM providers dynamically
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get('provider');

  if (!provider) {
    return NextResponse.json(
      { error: 'Provider parameter is required' },
      { status: 400 }
    );
  }

  try {
    let models: ModelInfo[] = [];

    switch (provider) {
      case 'OpenAI':
        models = await fetchOpenAIModels();
        break;

      case 'Claude':
        models = await fetchClaudeModels();
        break;

      case 'DeepSeek':
        models = await fetchDeepSeekModels();
        break;

      case 'Qwen':
        models = await fetchQwenModels();
        break;

      default:
        // Fallback to static registry
        console.log(`[MODELS API] Using static registry for ${provider}`);
        models = getModelsForProvider(provider);
    }

    return NextResponse.json({
      success: true,
      provider,
      models,
      count: models.length
    });
  } catch (error: any) {
    console.error(`[MODELS API] Error fetching models for ${provider}:`, error);

    // Fallback to static registry on error
    const fallbackModels = getModelsForProvider(provider);

    return NextResponse.json({
      success: true,
      provider,
      models: fallbackModels,
      count: fallbackModels.length,
      fallback: true,
      error: error.message
    });
  }
}

/**
 * Fetch models from OpenAI API
 */
async function fetchOpenAIModels(): Promise<ModelInfo[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('[MODELS API] No OpenAI API key found, using static registry');
    return getModelsForProvider('OpenAI');
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.models.list();

    // Filter to only chat models (gpt-* and o1-*)
    const chatModels = response.data.filter(
      (m) => m.id.startsWith('gpt-') || m.id.startsWith('o1-')
    );

    const parsed = parseModelResponse('OpenAI', { data: chatModels });

    // If no models returned, use static registry
    if (parsed.length === 0) {
      console.warn('[MODELS API] No OpenAI models found, using static registry');
      return getModelsForProvider('OpenAI');
    }

    return parsed;
  } catch (error) {
    console.error('[MODELS API] Error fetching OpenAI models:', error);
    return getModelsForProvider('OpenAI');
  }
}

/**
 * Fetch models from Anthropic API
 */
async function fetchClaudeModels(): Promise<ModelInfo[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('[MODELS API] No Anthropic API key found, using static registry');
    return getModelsForProvider('Claude');
  }

  try {
    // Use direct HTTP request to Models API
    // The SDK's models.list() might not be available in all versions
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[MODELS API] Anthropic response:', JSON.stringify(data, null, 2));

    const parsed = parseModelResponse('Claude', data);

    // If no models returned, use static registry
    if (parsed.length === 0) {
      console.warn('[MODELS API] No Claude models found, using static registry');
      return getModelsForProvider('Claude');
    }

    return parsed;
  } catch (error) {
    console.error('[MODELS API] Error fetching Claude models:', error);
    return getModelsForProvider('Claude');
  }
}

/**
 * Fetch models from DeepSeek API
 */
async function fetchDeepSeekModels(): Promise<ModelInfo[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.warn('[MODELS API] No DeepSeek API key found, using static registry');
    return getModelsForProvider('DeepSeek');
  }

  try {
    // DeepSeek uses OpenAI-compatible API
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com'
    });

    const response = await client.models.list();
    const parsed = parseModelResponse('DeepSeek', response);

    // If no models returned, use static registry
    if (parsed.length === 0) {
      console.warn('[MODELS API] No DeepSeek models found, using static registry');
      return getModelsForProvider('DeepSeek');
    }

    return parsed;
  } catch (error) {
    console.error('[MODELS API] Error fetching DeepSeek models:', error);
    return getModelsForProvider('DeepSeek');
  }
}

/**
 * Fetch models from Qwen API
 */
async function fetchQwenModels(): Promise<ModelInfo[]> {
  const apiKey = process.env.QWEN_API_KEY;

  if (!apiKey) {
    console.warn('[MODELS API] No Qwen API key found, using static registry');
    return getModelsForProvider('Qwen');
  }

  try {
    // Determine base URL based on region
    const region = process.env.QWEN_REGION || 'international';
    const baseURL =
      region === 'china' || region === 'beijing'
        ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        : 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

    // Qwen uses OpenAI-compatible API
    const client = new OpenAI({
      apiKey,
      baseURL
    });

    const response = await client.models.list();
    const parsed = parseModelResponse('Qwen', response);

    // If no models returned, use static registry
    if (parsed.length === 0) {
      console.warn('[MODELS API] No Qwen models found, using static registry');
      return getModelsForProvider('Qwen');
    }

    return parsed;
  } catch (error) {
    console.error('[MODELS API] Error fetching Qwen models:', error);
    return getModelsForProvider('Qwen');
  }
}
