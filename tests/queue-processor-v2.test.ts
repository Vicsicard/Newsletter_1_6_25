import { jest } from '@jest/globals';
import { QueueProcessorV2 } from '../src/queue-processor-v2';
import { TestEnvironment, TestContext } from './utils/test-environment';
import { QueueItem, QueueItemStatus } from '../src/types/database';
import { createMockSupabaseClient } from './utils/mock-interfaces';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import OpenAI from 'openai';

jest.mock('../src/newsletter-generator');

describe('QueueProcessorV2', () => {
  let processor: QueueProcessorV2;
  let context: TestContext;
  let mockSupabase: jest.Mocked<SupabaseClient<Database>>;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(async () => {
    context = await TestEnvironment.getInstance().setup();
    mockSupabase = createMockSupabaseClient();
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as unknown as jest.Mocked<OpenAI>;

    processor = new QueueProcessorV2(mockOpenAI, mockSupabase, context.logger);
  });

  afterEach(async () => {
    await TestEnvironment.getInstance().teardown();
  });

  describe('processQueueItem', () => {
    it('successfully processes a queue item', async () => {
      // Mock data
      const mockQueueItem: QueueItem = {
        id: 'test-queue-item',
        newsletter_id: 'test-newsletter',
        status: QueueItemStatus.Pending,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock Supabase responses
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockQueueItem,
        error: null,
      });

      const mockUpdate = jest.fn().mockResolvedValue({
        data: { ...mockQueueItem, status: QueueItemStatus.Completed },
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

      (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);

      // Process queue item
      const result = await processor.processQueueItem(mockQueueItem.id);

      // Verify results
      expect(result.success).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(context.logger.info).toHaveBeenCalled();
    });

    it('handles database errors', async () => {
      // Mock error
      const mockError = new Error('Queue item not found');

      // Mock Supabase responses
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);

      // Process queue item
      const result = await processor.processQueueItem('non-existent-id');

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Queue item not found');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('handles generation errors', async () => {
      // Mock data
      const mockQueueItem: QueueItem = {
        id: 'test-queue-item',
        newsletter_id: 'test-newsletter',
        status: QueueItemStatus.Pending,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock Supabase responses
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockQueueItem,
        error: null,
      });

      const mockUpdate = jest.fn().mockResolvedValue({
        data: { ...mockQueueItem, status: QueueItemStatus.Error },
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

      (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);

      // Mock OpenAI error
      const mockError = new Error('OpenAI API error');
      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(mockError);

      // Process queue item
      const result = await processor.processQueueItem(mockQueueItem.id);

      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('OpenAI API error');
      expect(context.logger.error).toHaveBeenCalled();
    });
  });
});
