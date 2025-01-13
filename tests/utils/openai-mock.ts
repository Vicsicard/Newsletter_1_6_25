import { jest } from '@jest/globals';
import OpenAI from 'openai';

export function createMockOpenAI(): jest.Mocked<OpenAI> {
  return {
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async (params: any) => {
          if (params.stream) {
            return {
              [Symbol.asyncIterator]: async function*() {
                yield {
                  id: 'mock-chunk-id',
                  object: 'chat.completion.chunk',
                  created: Date.now(),
                  model: 'gpt-3.5-turbo',
                  choices: [
                    {
                      index: 0,
                      delta: {
                        content: 'Mock streaming response',
                      },
                      finish_reason: null
                    }
                  ]
                };
              }
            };
          } else {
            return {
              id: 'mock-completion-id',
              object: 'chat.completion',
              created: Date.now(),
              model: 'gpt-3.5-turbo',
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: 'Mock response',
                    function_call: undefined,
                    tool_calls: undefined,
                    refusal: null
                  },
                  finish_reason: 'stop',
                  index: 0,
                  logprobs: null
                }
              ],
              usage: {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150
              }
            };
          }
        })
      }
    }
  } as unknown as jest.Mocked<OpenAI>;
}
