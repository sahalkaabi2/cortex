import OpenAI from 'openai';
import { LLMProvider } from './base';
import { LLMResponse, MarketData, PortfolioState } from '../types';
import { createTradingPrompt } from './base';
import { calculateLLMCost } from '../costs';

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI';
  private client: OpenAI;
  private model: string;

  constructor(model: string = 'gpt-4o') {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = model;
    console.log(`[OPENAI] Initialized with model: ${model}`);
  }

  async makeDecision(
    marketData: MarketData[],
    portfolioState: PortfolioState,
    traderId?: string
  ): Promise<LLMResponse> {
    try {
      const prompt = await createTradingPrompt(marketData, portfolioState, traderId);

      // Log full prompt
      console.log('═══════════════════════════════════════════════════');
      console.log(`[OPENAI] Sending prompt at ${new Date().toLocaleTimeString()}`);
      console.log('═══════════════════════════════════════════════════');
      console.log(prompt);
      console.log('═══════════════════════════════════════════════════');

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert cryptocurrency trader with a systematic, data-driven approach. Analyze market conditions rigorously and always provide structured exit plans for your trades. Respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Log raw response
      console.log('───────────────────────────────────────────────────');
      console.log(`[OPENAI] Received response at ${new Date().toLocaleTimeString()}`);
      console.log('───────────────────────────────────────────────────');
      console.log(content);
      console.log('═══════════════════════════════════════════════════\n');

      const decision = JSON.parse(content);

      // Extract usage and calculate actual cost
      const usage = response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      } : undefined;

      const calculated_cost = usage ? calculateLLMCost(this.model, usage) : 0;

      console.log(`[OPENAI] Model: ${this.model}, Token usage: ${usage?.total_tokens || 0} tokens, Cost: $${calculated_cost.toFixed(4)}`);

      return {
        action: decision.action,
        coin: decision.coin,
        amount: decision.amount,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        profit_target: decision.profit_target,
        stop_loss: decision.stop_loss,
        invalidation_condition: decision.invalidation_condition,
        risk_usd: decision.risk_usd,
        prompt_text: prompt,
        raw_response: content,
        usage,
        calculated_cost,
      };
    } catch (error) {
      console.error('OpenAI decision error:', error);
      return {
        action: 'HOLD',
        reasoning: `Error making decision: ${error}`,
        confidence: 0,
      };
    }
  }
}
