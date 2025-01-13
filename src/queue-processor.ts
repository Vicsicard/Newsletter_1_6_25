import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { OpenAI } from 'openai';

export class QueueProcessor {
  constructor(
    private readonly openai: OpenAI,
    private readonly supabase: SupabaseClient<Database>
  ) {}

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

    // Fetch section type
    const { data: sectionType, error: sectionError } = await this.supabase
      .from('newsletter_section_types')
      .select()
      .eq('name', queueItem.section_type)
      .single();

    if (sectionError) {
      throw new Error(`Failed to fetch section type: ${sectionError.message}`);
    }

    // Generate content using OpenAI
    try {
      const prompt = sectionType.prompt_template.replace(
        '{company_name}',
        company.company_name
      );

      const completion = await this.openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo'
      });

      const generatedContent = completion.choices[0].message.content;

      // Update newsletter section
      await this.supabase
        .from('newsletter_sections')
        .update({ content: generatedContent })
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
