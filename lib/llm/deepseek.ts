import axios from 'axios';
import { LLMProvider } from './base';
import { LLMResponse, MarketData, PortfolioState } from '../types';
import { createTradingPrompt } from './base';
import { calculateLLMCost } from '../costs';

export class DeepSeekProvider implements LLMProvider {
  name = 'DeepSeek';
  private apiKey: string;
  private apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  private model: string;

  constructor(model: string = 'deepseek-chat') {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.model = model;
    console.log(`[DEEPSEEK] Initialized with model: ${model}`);
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
      console.log(`[DEEPSEEK] Sending prompt at ${new Date().toLocaleTimeString()}`);
      console.log('═══════════════════════════════════════════════════');
      console.log(prompt);
      console.log('═══════════════════════════════════════════════════');

      const response = await axios.post(
        this.apiUrl,
        {
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
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const content = response.data.choices[0].message.content;

      // Log raw response
      console.log('───────────────────────────────────────────────────');
      console.log(`[DEEPSEEK] Received response at ${new Date().toLocaleTimeString()}`);
      console.log('───────────────────────────────────────────────────');
      console.log(content);
      console.log('═══════════════════════════════════════════════════\n');

      const decision = JSON.parse(content);

      // Extract usage and calculate actual cost
      const usage = response.data.usage ? {
        prompt_tokens: response.data.usage.prompt_tokens,
        completion_tokens: response.data.usage.completion_tokens,
        total_tokens: response.data.usage.total_tokens,
      } : undefined;

      const calculated_cost = usage ? calculateLLMCost(this.model, usage) : 0;

      console.log(`[DEEPSEEK] Model: ${this.model}, Token usage: ${usage?.total_tokens || 0} tokens, Cost: $${calculated_cost.toFixed(4)}`);

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
      console.error('DeepSeek decision error:', error);
      return {
        action: 'HOLD',
        reasoning: `Error making decision: ${error}`,
        confidence: 0,
      };
    }
  }
}
