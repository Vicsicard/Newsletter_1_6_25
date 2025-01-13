import { jest } from '@jest/globals';
import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Database } from '../../src/types/database';
import { createSuccessResponse, createErrorResponse, createSingleSuccessResponse, createSingleErrorResponse } from './mock-types';

export function resetTestState() {
  jest.resetAllMocks();
}

export function createTestContext() {
  const supabase = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => createSingleSuccessResponse(null)),
      update: jest.fn().mockImplementation(() => createSuccessResponse(null))
    })
  } as unknown as jest.Mocked<SupabaseClient<Database>>;

  const openai = {
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

  return {
    supabase,
    openai,
    resetState: resetTestState
  };
}

// Reset all mocks after each test
afterEach(() => {
  jest.resetAllMocks();
});
