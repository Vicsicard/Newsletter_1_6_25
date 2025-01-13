import { jest } from '@jest/globals';
import { QueueProcessor } from '../../src/services/queue-processor';
import { TestEnvironment, TestContext } from '../utils/test-environment';
import { Newsletter, NewsletterSection, NewsletterStatus, NewsletterSectionStatus } from '../../src/types/database';

describe('Queue Processor Integration Tests', () => {
  let context: TestContext;
  let queueProcessor: QueueProcessor;

  beforeEach(async () => {
    context = await TestEnvironment.getInstance().setup();
    queueProcessor = new QueueProcessor(context.supabase, context.openai, context.logger);
  });

  afterEach(async () => {
    await TestEnvironment.getInstance().teardown();
  });

  it('should process a newsletter and its sections', async () => {
    // Mock data
    const mockNewsletter: Newsletter = {
      id: 'test-newsletter',
      title: 'Test Newsletter',
      status: NewsletterStatus.Draft,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockSections: NewsletterSection[] = [
      {
        id: '1',
        newsletter_id: mockNewsletter.id,
        section_type: 'text',
        section_number: 1,
        title: 'Test Section 1',
        content: null,
        image_url: null,
        status: NewsletterSectionStatus.Pending,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Setup mock responses
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockSingle = jest.fn();
    const mockUpdate = jest.fn();

    (context.supabase.from as jest.Mock).mockImplementation(() => ({
      select: mockSelect,
      update: mockUpdate,
    }));

    mockSelect.mockImplementation(() => ({
      eq: mockEq,
    }));

    mockEq.mockImplementation(() => ({
      single: mockSingle,
    }));

    mockSingle.mockImplementation(async () => ({
      data: mockNewsletter,
      error: null
    }));

    mockUpdate.mockImplementation(async () => ({
      data: { ...mockNewsletter, status: NewsletterStatus.Completed },
      error: null
    }));

    // Add mock data
    await TestEnvironment.getInstance().addMockData('newsletters', [mockNewsletter]);
    await TestEnvironment.getInstance().addMockData('newsletter_sections', mockSections);

    // Process the newsletter
    const result = await queueProcessor.processNewsletter(mockNewsletter.id);

    // Verify results
    expect(result.success).toBe(true);
    expect(context.openai.chat.completions.create).toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalled();
  });

  it('should handle errors when newsletter is not found', async () => {
    // Setup mock responses for error case
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockSingle = jest.fn();

    (context.supabase.from as jest.Mock).mockImplementation(() => ({
      select: mockSelect,
    }));

    mockSelect.mockImplementation(() => ({
      eq: mockEq,
    }));

    mockEq.mockImplementation(() => ({
      single: mockSingle,
    }));

    mockSingle.mockImplementation(async () => ({
      data: null,
      error: new Error('Newsletter not found')
    }));

    // Process non-existent newsletter
    const result = await queueProcessor.processNewsletter('non-existent-id');

    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Newsletter not found');
    expect(context.logger.error).toHaveBeenCalled();
  });
});
