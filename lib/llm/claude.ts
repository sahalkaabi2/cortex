import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './base';
import { LLMResponse, MarketData, PortfolioState } from '../types';
import { createTradingPrompt } from './base';
import { calculateLLMCost } from '../costs';

export class ClaudeProvider implements LLMProvider {
  name = 'Claude';
  private client: Anthropic;
  private model: string;

  constructor(model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.model = model;
    console.log(`[CLAUDE] Initialized with model: ${model}`);
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
      console.log(`[CLAUDE] Sending prompt at ${new Date().toLocaleTimeString()}`);
      console.log('═══════════════════════════════════════════════════');
      console.log(prompt);
      console.log('═══════════════════════════════════════════════════');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const rawResponse = content.text;

      // Log raw response
      console.log('───────────────────────────────────────────────────');
      console.log(`[CLAUDE] Received response at ${new Date().toLocaleTimeString()}`);
      console.log('───────────────────────────────────────────────────');
      console.log(rawResponse);
      console.log('═══════════════════════════════════════════════════\n');

      // Extract JSON from response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const decision = JSON.parse(jsonMatch[0]);

      // Extract usage and calculate actual cost
      const usage = response.usage ? {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      } : undefined;

      const calculated_cost = usage ? calculateLLMCost(this.model, usage) : 0;

      console.log(`[CLAUDE] Model: ${this.model}, Token usage: ${(usage?.input_tokens || 0) + (usage?.output_tokens || 0)} tokens, Cost: $${calculated_cost.toFixed(4)}`);

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
        raw_response: rawResponse,
        usage,
        calculated_cost,
      };
    } catch (error) {
      console.error('Claude decision error:', error);
      return {
        action: 'HOLD',
        reasoning: `Error making decision: ${error}`,
        confidence: 0,
      };
    }
  }
}
