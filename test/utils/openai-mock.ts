import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources/chat';
import { APIPromise } from 'openai/core';

type MockChatCompletion = {
  id: string;
  object: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
};

export const createMockOpenAI = () => {
  const mockCreate = jest.fn<APIPromise<ChatCompletion>, [any]>();
  
  const mockOpenAI = {
    chat: {
      completions: {
        create: mockCreate
      }
    }
  } as unknown as jest.Mocked<OpenAI>;

  const createSuccessResponse = (content: string): MockChatCompletion => ({
    id: 'mock-completion-id',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    },
    choices: [
      {
        message: {
          role: 'assistant',
          content
        },
        finish_reason: 'stop',
        index: 0
      }
    ]
  });

  return {
    client: mockOpenAI,
    create: mockCreate,
    createSuccessResponse
  };
};
