import { jest } from '@jest/globals';
import { SupabaseClient } from '@supabase/supabase-js';
import { NewsletterGenerator } from '../src/newsletter-generator';
import { createMockSupabaseClient } from './utils/mock-interfaces';
import { Database } from '../types/database';
import OpenAI from 'openai';

describe('NewsletterGenerator', () => {
  let mockSupabase: jest.Mocked<SupabaseClient<Database>>;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let generator: NewsletterGenerator;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as unknown as jest.Mocked<OpenAI>;

    generator = new NewsletterGenerator(mockOpenAI, mockSupabase);
  });

  describe('generateNewsletter', () => {
    it('successfully generates a newsletter', async () => {
      const mockNewsletter = {
        id: '1',
        company_id: 'company-1',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sections: [
          {
            id: 1,
            title: 'Section 1',
            content: null
          }
        ]
      };

      const mockCompletion = {
        id: 'mock-completion-id',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-3.5-turbo',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Generated content for section 1',
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

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockNewsletter,
          error: null
        }),
        update: jest.fn().mockResolvedValue({
          data: { ...mockNewsletter, sections: [{ ...mockNewsletter.sections[0], content: 'Generated content for section 1' }] },
          error: null
        })
      });

      const mockPromise = Promise.resolve(mockCompletion);
      (mockPromise as any).responsePromise = Promise.resolve({} as Response);
      (mockPromise as any).parseResponse = () => Promise.resolve(mockCompletion);
      (mockPromise as any).parsedPromise = Promise.resolve(mockCompletion);
      (mockPromise as any)._thenUnwrap = function(fn: any) {
        return this.then(fn);
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockPromise);

      await generator.generateNewsletter('1');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('newsletters');
    });

    it('handles database errors when fetching newsletter', async () => {
      const mockError = new Error('Database error');
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      });

      await expect(generator.generateNewsletter('1')).rejects.toThrow('Failed to fetch newsletter: Database error');
    });

    it('handles OpenAI API errors', async () => {
      const mockNewsletter = {
        id: '1',
        company_id: 'company-1',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sections: [
          {
            id: 1,
            title: 'Section 1',
            content: null
          }
        ]
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockNewsletter,
          error: null
        })
      });

      const mockError = new Error('OpenAI API error');
      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(mockError);

      await expect(generator.generateNewsletter('1')).rejects.toThrow();
    });
  });
});
