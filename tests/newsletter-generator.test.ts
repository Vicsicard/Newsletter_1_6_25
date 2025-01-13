import { jest } from '@jest/globals';
import { NewsletterGenerator } from '../src/services/newsletter-generator';
import { TestEnvironment, TestContext } from './utils/test-environment';
import { Newsletter, NewsletterSection, NewsletterStatus, NewsletterSectionStatus } from '../src/types/database';

describe('Newsletter Generator Tests', () => {
  let context: TestContext;
  let newsletterGenerator: NewsletterGenerator;

  beforeEach(async () => {
    context = await TestEnvironment.getInstance().setup();
    newsletterGenerator = new NewsletterGenerator(context.supabase, context.openai, context.logger);
  });

  afterEach(async () => {
    await TestEnvironment.getInstance().teardown();
  });

  it('should generate content for a section', async () => {
    // Mock data
    const mockSection: NewsletterSection = {
      id: '1',
      newsletter_id: 'test-newsletter',
      section_type: 'text',
      section_number: 1,
      title: 'Test Section',
      content: null,
      image_url: null,
      status: NewsletterSectionStatus.Pending,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add mock data
    await TestEnvironment.getInstance().addMockData('newsletter_sections', [mockSection]);

    // Mock OpenAI response
    const mockOpenAIResponse = {
      id: 'test-response',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Generated content for section',
          },
          finish_reason: 'stop',
          index: 0,
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    };

    (context.openai.chat.completions.create as jest.Mock).mockResolvedValue(mockOpenAIResponse);

    // Mock Supabase responses
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockSection,
      error: null,
    });

    const mockUpdate = jest.fn().mockResolvedValue({
      data: { ...mockSection, content: 'Generated content for section' },
      error: null,
    });

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdate,
    });

    (context.supabase.from as jest.Mock).mockImplementation(mockFrom);

    // Generate content
    const result = await newsletterGenerator.generateSectionContent(mockSection.id);

    // Verify results
    expect(result.success).toBe(true);
    expect(context.openai.chat.completions.create).toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalled();
  });

  it('should handle errors when OpenAI fails', async () => {
    // Mock data
    const mockSection: NewsletterSection = {
      id: '1',
      newsletter_id: 'test-newsletter',
      section_type: 'text',
      section_number: 1,
      title: 'Test Section',
      content: null,
      image_url: null,
      status: NewsletterSectionStatus.Pending,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add mock data
    await TestEnvironment.getInstance().addMockData('newsletter_sections', [mockSection]);

    // Mock OpenAI error
    const mockError = new Error('OpenAI API error');
    (context.openai.chat.completions.create as jest.Mock).mockRejectedValue(mockError);

    // Mock Supabase responses
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockSection,
      error: null,
    });

    const mockUpdate = jest.fn().mockResolvedValue({
      data: { ...mockSection, status: NewsletterSectionStatus.Error },
      error: null,
    });

    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdate,
    });

    (context.supabase.from as jest.Mock).mockImplementation(mockFrom);

    // Generate content
    const result = await newsletterGenerator.generateSectionContent(mockSection.id);

    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('OpenAI API error');
    expect(context.logger.error).toHaveBeenCalled();
  });
});
