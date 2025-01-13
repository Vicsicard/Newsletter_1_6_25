import { OpenAI } from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';
import { Logger } from './logger';
import { NewsletterGenerator, GenerateSectionParams, Result } from './newsletter-generator';

type QueueItem = Database['public']['Tables']['newsletter_generation_queue']['Row'];
type Newsletter = Database['public']['Tables']['newsletters']['Row'];

export class QueueProcessorV2 {
  private logger: Logger;

  constructor(
    private openai: OpenAI,
    private supabase: SupabaseClient,
    private generator: NewsletterGenerator,
    logger?: Logger
  ) {
    this.logger = logger || new Logger(supabase, 'QueueProcessorV2');
  }

  async processQueueItem(queueItemId: string): Promise<Result<QueueItem>> {
    const startTime = Date.now();
    try {
      // Log start of processing
      await this.logger.info('Processing queue item', { 
        queueItemId,
        startTime: new Date(startTime).toISOString()
      });

      // Fetch queue item
      const { data: queueItem, error: queueError } = await this.supabase
        .from('newsletter_generation_queue')
        .select()
        .eq('id', queueItemId)
        .single();

      if (queueError) {
        throw new Error(`Failed to fetch queue item: ${queueError.message}`);
      }

      if (!queueItem) {
        throw new Error('Queue item not found');
      }

      // Fetch newsletter
      const { data: newsletter, error: newsletterError } = await this.supabase
        .from('newsletters')
        .select()
        .eq('id', queueItem.newsletter_id)
        .single();

      if (newsletterError) {
        throw new Error(`Failed to fetch newsletter: ${newsletterError.message}`);
      }

      if (!newsletter) {
        throw new Error('Newsletter not found');
      }

      // Generate content using OpenAI
      const generationStartTime = Date.now();
      const params: GenerateSectionParams = {
        section_type: queueItem.section_type,
        newsletter_id: newsletter.id,
        section_number: queueItem.section_number || 1
      };

      const result = await this.generator.generateSection(params);

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to generate content');
      }

      const processDuration = Date.now() - generationStartTime;

      // Update queue item with generated content
      const updateResult = await this.supabase
        .from('newsletter_generation_queue')
        .update({
          content: result.data.content || '',
          status: 'completed',
          updated_at: new Date().toISOString(),
          processing_duration_ms: processDuration,
          attempts: (queueItem.attempts || 0) + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', queueItemId)
        .select()
        .single();

      if (updateResult.error) {
        throw new Error(`Failed to update queue item: ${updateResult.error.message}`);
      }

      await this.logger.info('Queue item processed successfully', { 
        queueItemId,
        duration: processDuration
      });

      return {
        success: true,
        data: updateResult.data,
        error: null
      };
    } catch (error) {
      // Log error and update queue item status
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const endTime = Date.now();
      const duration = endTime - startTime;

      await this.logger.error('Queue item processing failed', {
        queueItemId,
        duration_ms: duration,
        error: errorMessage
      });

      await this.supabase
        .from('newsletter_generation_queue')
        .update({
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItemId);

      return {
        success: false,
        data: null,
        error: new Error(errorMessage)
      };
    }
  }
}
