import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import { Result } from '../types/result';
import { NewsletterStatus, NewsletterSectionStatus } from '../types/database';

export class QueueProcessor {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly openai: OpenAI,
    private readonly logger: Logger
  ) {}

  async processNewsletter(newsletterId: string): Promise<Result<any>> {
    try {
      // Get newsletter data
      const { data: newsletter, error: newsletterError } = await this.supabase
        .from('newsletters')
        .select('*')
        .eq('id', newsletterId)
        .single();

      if (newsletterError) {
        throw new Error(`Failed to fetch newsletter: ${newsletterError.message}`);
      }

      // Get sections
      const { data: sections, error: sectionsError } = await this.supabase
        .from('sections')
        .select('*')
        .eq('newsletter_id', newsletterId);

      if (sectionsError) {
        throw new Error(`Failed to fetch sections: ${sectionsError.message}`);
      }

      // Process each section
      for (const section of sections) {
        const content = await this.generateContent(section.title);
        await this.supabase
          .from('sections')
          .update({ 
            content, 
            status: NewsletterSectionStatus.Completed 
          })
          .eq('id', section.id);
      }

      // Update newsletter status
      await this.supabase
        .from('newsletters')
        .update({ status: NewsletterStatus.Completed })
        .eq('id', newsletterId);

      this.logger.info('Successfully processed newsletter', { newsletterId });
      return { success: true, data: newsletter };

    } catch (error: any) {
      this.logger.error('Failed to process newsletter', { 
        newsletterId, 
        error: error.message 
      });
      return { success: false, error };
    }
  }

  private async generateContent(title: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional newsletter content writer.'
        },
        {
          role: 'user',
          content: `Write a newsletter section about: ${title}`
        }
      ]
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }
    return content;
  }
}
