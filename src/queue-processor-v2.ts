import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { OpenAI } from 'openai';
import { NewsletterGenerator } from './utils/newsletter-generator';

export class QueueProcessorV2 {
  private generator: NewsletterGenerator;

  constructor(
    private readonly openai: OpenAI,
    private readonly supabase: SupabaseClient<Database>
  ) {
    this.generator = new NewsletterGenerator(openai, supabase);
  }

  async processQueueItem(queueItemId: string): Promise<void> {
    // Fetch queue item
    const { data: queueItem, error: queueError } = await this.supabase
      .from('newsletter_generation_queue')
      .select()
      .eq('id', queueItemId)
      .single();

    if (queueError) {
      throw new Error(`Failed to fetch queue item: ${queueError.message}`);
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

    // Fetch company
    const { data: company, error: companyError } = await this.supabase
      .from('companies')
      .select()
      .eq('id', newsletter.company_id)
      .single();

    if (companyError) {
      throw new Error(`Failed to fetch company: ${companyError.message}`);
    }

    try {
      // Generate content using NewsletterGenerator
      const { content } = await (this.generator as any).generateSection({
        section_type: queueItem.section_type,
        newsletter_id: newsletter.id
      });

      // Update newsletter section
      await this.supabase
        .from('newsletter_sections')
        .update({ content })
        .eq('newsletter_id', newsletter.id)
        .eq('section_type', queueItem.section_type);

      // Update queue item status
      await this.supabase
        .from('newsletter_generation_queue')
        .update({
          status: 'completed',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItemId);
    } catch (error) {
      // Update queue item with error
      await this.supabase
        .from('newsletter_generation_queue')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : String(error),
          updated_at: new Date().toISOString()
        })
        .eq('id', queueItemId);

      throw error;
    }
  }
}
