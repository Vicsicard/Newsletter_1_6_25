import { jest } from '@jest/globals';
import { QueueProcessor } from '../src/services/queue-processor';
import { TestEnvironment, TestContext } from './utils/test-environment';
import { Newsletter, NewsletterSection, NewsletterStatus, NewsletterSectionStatus } from '../src/types/database';
import { PostgrestResponse, PostgrestSingleResponse, PostgrestQueryBuilder } from '@supabase/supabase-js';
import { ChatCompletion } from 'openai/resources';

describe('Queue Processor Tests', () => {
  let context: TestContext;
  let queueProcessor: QueueProcessor;

  beforeEach(async () => {
    context = await TestEnvironment.getInstance().setup();
    queueProcessor = new QueueProcessor(context.supabase, context.openai, context.logger);
  });

  afterEach(async () => {
    await TestEnvironment.getInstance().teardown();
  });

  it('should process a newsletter', async () => {
    // Mock data
    const mockNewsletter: Newsletter = {
      id: 'test-newsletter',
      title: 'Test Newsletter',
      status: 'draft' as NewsletterStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockSection: NewsletterSection = {
      id: '1',
      newsletter_id: mockNewsletter.id,
      section_type: 'text',
      section_number: 1,
      title: 'Test Section',
      content: null,
      image_url: null,
      status: 'pending' as NewsletterSectionStatus,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Mock Supabase client
    const mockSupabase = {
      from: jest.fn().mockImplementation((table: string) => {
        const mockSelect = jest.fn().mockReturnThis();
        const mockUpdate = jest.fn().mockReturnThis();
        const mockEq = jest.fn().mockReturnThis();
        const mockSingle = jest.fn();

        if (table === 'newsletters') {
          mockSingle.mockResolvedValue({
            data: mockNewsletter,
            error: null
          });

          mockEq.mockImplementation((field: string, value: string) => {
            if (field === 'id' && value === mockNewsletter.id) {
              if (mockSelect.mock.calls.length > 0) {
                return { single: mockSingle };
              } else {
                return Promise.resolve({
                  data: { ...mockNewsletter, status: NewsletterStatus.Completed },
                  error: null
                });
              }
            }
            return { single: mockSingle };
          });
        } else if (table === 'sections') {
          mockEq.mockImplementation((field: string, value: string) => {
            if (field === 'newsletter_id' && value === mockNewsletter.id) {
              return Promise.resolve({
                data: [mockSection],
                error: null
              });
            } else if (field === 'id' && value === mockSection.id) {
              return Promise.resolve({
                data: [{ ...mockSection, content: 'Generated content for the section', status: NewsletterSectionStatus.Completed }],
                error: null
              });
            }
            return Promise.resolve({
              data: [],
              error: null
            });
          });
        }

        return {
          select: mockSelect,
          update: mockUpdate,
          eq: mockEq,
          single: mockSingle
        };
      })
    };

    // Mock OpenAI
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Generated content for the section'
                }
              }
            ]
          })
        }
      }
    };

    // Mock logger
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    // Apply mocks
    context.supabase = mockSupabase as any;
    context.openai = mockOpenAI as any;
    context.logger = mockLogger as any;

    // Process newsletter
    const result = await queueProcessor.processNewsletter(mockNewsletter.id);

    // Verify results
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockNewsletter);
    expect(mockSupabase.from).toHaveBeenCalledWith('newsletters');
    expect(mockSupabase.from).toHaveBeenCalledWith('sections');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should handle errors during processing', async () => {
    // Mock data
    const mockNewsletter: Newsletter = {
      id: 'test-newsletter',
      title: 'Test Newsletter',
      status: 'draft' as NewsletterStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockSection: NewsletterSection = {
      id: '1',
      newsletter_id: mockNewsletter.id,
      section_type: 'text',
      section_number: 1,
      title: 'Test Section',
      content: null,
      image_url: null,
      status: 'pending' as NewsletterSectionStatus,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Mock Supabase client
    const mockSupabase = {
      from: jest.fn().mockImplementation((table: string) => {
        const mockSelect = jest.fn().mockReturnThis();
        const mockUpdate = jest.fn().mockReturnThis();
        const mockEq = jest.fn().mockReturnThis();
        const mockSingle = jest.fn();

        if (table === 'newsletters') {
          mockSingle.mockResolvedValue({
            data: mockNewsletter,
            error: null
          });

          mockEq.mockImplementation((field: string, value: string) => {
            if (field === 'id' && value === mockNewsletter.id) {
              if (mockSelect.mock.calls.length > 0) {
                return { single: mockSingle };
              } else {
                return Promise.resolve({
                  data: mockNewsletter,
                  error: null
                });
              }
            }
            return { single: mockSingle };
          });
        } else if (table === 'sections') {
          mockEq.mockImplementation((field: string, value: string) => {
            if (field === 'newsletter_id' && value === mockNewsletter.id) {
              return Promise.resolve({
                data: [mockSection],
                error: null
              });
            }
            return Promise.resolve({
              data: [],
              error: null
            });
          });
        }

        return {
          select: mockSelect,
          update: mockUpdate,
          eq: mockEq,
          single: mockSingle
        };
      })
    };

    // Mock OpenAI with error
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('OpenAI API error'))
        }
      }
    };

    // Mock logger
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    // Apply mocks
    context.supabase = mockSupabase as any;
    context.openai = mockOpenAI as any;
    context.logger = mockLogger as any;

    // Process newsletter
    const result = await queueProcessor.processNewsletter(mockNewsletter.id);

    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('OpenAI API error');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
