import OpenAI from 'openai';
import { Result } from '../types/result';

export interface OpenAIClient {
  createChatCompletion(params: OpenAI.Chat.ChatCompletionCreateParams): Promise<OpenAI.Chat.ChatCompletion>;
}

export class OpenAIWrapper implements OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async createChatCompletion(params: OpenAI.Chat.ChatCompletionCreateParams): Promise<OpenAI.Chat.ChatCompletion> {
    return await this.client.chat.completions.create(params);
  }
}
