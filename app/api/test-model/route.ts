import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

/**
 * POST /api/test-model
 * Test a specific LLM model with ACTUAL API call (not through our wrapper)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, model } = body;

    if (!provider || !model) {
      return NextResponse.json(
        { success: false, error: 'Provider and model are required' },
        { status: 400 }
      );
    }

    console.log(`[TEST MODEL] Testing ${provider} with model ${model}...`);

    let result;

    switch (provider) {
      case 'OpenAI':
        result = await testOpenAI(model);
        break;
      case 'Claude':
        result = await testClaude(model);
        break;
      case 'DeepSeek':
        result = await testDeepSeek(model);
        break;
      case 'Qwen':
        result = await testQwen(model);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    console.log(`[TEST MODEL] ✓ ${provider} (${model}) test successful!`);

    return NextResponse.json({
      success: true,
      provider,
      model,
      response: result.response,
      cost: result.cost,
      tokens: result.tokens,
      message: `✓ ${provider} connection successful! Model: ${model}`
    });

  } catch (error: any) {
    console.error('[TEST MODEL] Error:', error);

    // Parse error message for common issues
    let errorMessage = error.message || 'Unknown error';
    let suggestion = '';

    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('invalid_api_key')) {
      suggestion = 'Check your API key in .env file';
      errorMessage = 'Invalid API key';
    } else if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('model_not_found')) {
      suggestion = 'Model may not be available or name is incorrect';
      errorMessage = `Model '${error.message.includes('model') ? 'specified' : 'unknown'}' not found`;
    } else if (errorMessage.includes('timeout')) {
      suggestion = 'Request timed out - check your internet connection';
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
      suggestion = 'Network error - check your internet connection';
    } else if (errorMessage.includes('rate limit')) {
      suggestion = 'Rate limit exceeded - wait a moment and try again';
    } else if (errorMessage.includes('API key')) {
      suggestion = 'API key is missing or invalid - check your .env file';
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      suggestion
    }, { status: 500 });
  }
}

/**
 * Test OpenAI with actual API call
 */
async function testOpenAI(model: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  console.log('[TEST] OpenAI key exists:', !!apiKey, 'length:', apiKey?.length || 0);

  if (!apiKey || apiKey === '') {
    throw new Error('OpenAI API key not found in environment variables');
  }

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Say "test successful" if you can read this.' }],
    max_tokens: 10
  });

  return {
    response: response.choices[0].message.content || 'No response',
    cost: response.usage ? (response.usage.total_tokens * 0.00001).toFixed(6) : 'N/A',
    tokens: response.usage?.total_tokens || 0
  };
}

/**
 * Test Claude with actual API call
 */
async function testClaude(model: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  console.log('[TEST] Anthropic key exists:', !!apiKey, 'length:', apiKey?.length || 0);

  if (!apiKey || apiKey === '') {
    throw new Error('Anthropic API key not found in environment variables');
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Say "test successful" if you can read this.' }]
  });

  const content = response.content[0];
  return {
    response: content.type === 'text' ? content.text : 'No text response',
    cost: response.usage ? ((response.usage.input_tokens + response.usage.output_tokens) * 0.00001).toFixed(6) : 'N/A',
    tokens: response.usage ? response.usage.input_tokens + response.usage.output_tokens : 0
  };
}

/**
 * Test DeepSeek with actual API call
 */
async function testDeepSeek(model: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  console.log('[TEST] DeepSeek key exists:', !!apiKey, 'length:', apiKey?.length || 0);

  if (!apiKey || apiKey === '') {
    throw new Error('DeepSeek API key not found in environment variables');
  }

  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model,
      messages: [{ role: 'user', content: 'Say "test successful" if you can read this.' }],
      max_tokens: 10
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }
  );

  return {
    response: response.data.choices[0].message.content || 'No response',
    cost: response.data.usage ? (response.data.usage.total_tokens * 0.00001).toFixed(6) : 'N/A',
    tokens: response.data.usage?.total_tokens || 0
  };
}

/**
 * Test Qwen with actual API call
 */
async function testQwen(model: string) {
  const apiKey = process.env.QWEN_API_KEY?.trim();

  console.log('[TEST] Qwen key exists:', !!apiKey, 'length:', apiKey?.length || 0);

  if (!apiKey || apiKey === '') {
    throw new Error('Qwen API key not found in environment variables');
  }

  // Determine base URL based on region
  const region = process.env.QWEN_REGION || 'international';
  const apiUrl = region === 'china' || region === 'beijing'
    ? 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    : 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

  const response = await axios.post(
    apiUrl,
    {
      model,
      messages: [{ role: 'user', content: 'Say "test successful" if you can read this.' }],
      max_tokens: 10
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }
  );

  return {
    response: response.data.choices[0].message.content || 'No response',
    cost: response.data.usage ? (response.data.usage.total_tokens * 0.00001).toFixed(6) : 'N/A',
    tokens: response.data.usage?.total_tokens || 0
  };
}
