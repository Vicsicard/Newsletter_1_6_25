import { OpenAI } from 'openai';
import { PostgrestBuilder, PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { Database } from '../../types/database';
import { APIPromise } from 'openai/core';
import { ChatCompletion } from 'openai/resources';
import { SupabaseClient, PostgrestResponse, PostgrestSingleResponse, PostgrestQueryBuilder } from '@supabase/supabase-js';
import { jest } from '@jest/globals';

export interface MockResponse<T> {
  data: T | null;
  error: Error | null;
  count: null;
  status: number;
  statusText: string;
}

export interface MockBuilder<T> extends PostgrestBuilder<T> {
  data: T | null;
  error: Error | null;
}

export interface MockSupabaseBuilder<T extends Record<string, any>> extends Omit<PostgrestBuilder<T>, 'then'> {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  mockResolvedValueOnce: (value: MockResponse<T>) => MockSupabaseBuilder<T>;
  then: <TResult1 = T>(
    onfulfilled?: ((value: MockResponse<T>) => TResult1 | PromiseLike<TResult1>) | null | undefined
  ) => Promise<TResult1>;
  data: T | null;
  error: Error | null;
}

export type MockSupabaseClient = jest.Mocked<SupabaseClient<Database>>;

export function createMockBuilder<T extends Record<string, any>>(response: MockResponse<T>): MockSupabaseBuilder<T> {
  const mockBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    data: response.data,
    error: response.error,
    mockResolvedValueOnce: (value: MockResponse<T>) => {
      mockBuilder.data = value.data;
      mockBuilder.error = value.error;
      return mockBuilder;
    },
    then: function<TResult1 = T>(
      onfulfilled?: ((value: MockResponse<T>) => TResult1 | PromiseLike<TResult1>) | null | undefined
    ): Promise<TResult1> {
      if (onfulfilled) {
        return Promise.resolve(onfulfilled({ data: response.data, error: response.error }));
      }
      return Promise.resolve({ data: response.data, error: response.error } as TResult1);
    }
  };

  return mockBuilder as unknown as MockSupabaseBuilder<T>;
}

export function createMockSupabaseClient(): MockSupabaseClient {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          data: null,
          error: null,
          count: null,
          status: 200,
          statusText: 'OK'
        } as PostgrestSingleResponse<any>);
      }),
      update: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          data: null,
          error: null,
          count: null,
          status: 200,
          statusText: 'OK'
        } as PostgrestResponse<any>);
      })
    }),
    auth: {
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn()
    }
  } as unknown as MockSupabaseClient;
}

export function createMockOpenAIClient(): jest.Mocked<OpenAI> {
  return {
    apiKey: 'mock-api-key',
    organization: 'mock-org',
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async (params: any) => {
          if (params.stream) {
            // Return a mock stream
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
            // Return a regular completion
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
            } as ChatCompletion;
          }
        })
      }
    }
  } as unknown as jest.Mocked<OpenAI>;
}

export function createMockChatCompletion(content: string): Promise<ChatCompletion> {
  const mockCompletion: ChatCompletion = {
    id: 'mock-completion-id',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-3.5-turbo',
    choices: [
      {
        message: {
          role: 'assistant',
          content: content,
          function_call: undefined,
          tool_calls: undefined,
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

  return Promise.resolve(mockCompletion);
}
