import { NextResponse } from 'next/server';

/**
 * GET /api/test-env
 * Check which API keys are available
 */
export async function GET() {
  const keys = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    QWEN_API_KEY: process.env.QWEN_API_KEY,
  };

  const status = Object.entries(keys).map(([key, value]) => ({
    key,
    exists: !!value,
    length: value?.length || 0,
    first4: value ? value.substring(0, 4) + '...' : 'NOT SET',
    isEmpty: value === '' || value === undefined
  }));

  return NextResponse.json({
    status,
    nodeEnv: process.env.NODE_ENV,
    cwd: process.cwd()
  });
}
