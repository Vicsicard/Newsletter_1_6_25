import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import { Result } from '../types/result';
import { NewsletterSectionStatus } from '../types/database';

export class NewsletterGenerator {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly openai: OpenAI,
    private readonly logger: Logger
  ) {}

  async generateSection(sectionId: string): Promise<Result<any>> {
    try {
      // Get section data
      const { data: section, error: sectionError } = await this.supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .single();

      if (sectionError) {
        throw new Error(`Failed to fetch section: ${sectionError.message}`);
      }

      // Generate content
      const content = await this.generateContent(section.title);

      // Update section
      const { error: updateError } = await this.supabase
        .from('sections')
        .update({ 
          content, 
          status: NewsletterSectionStatus.Completed 
        })
        .eq('id', sectionId);

      if (updateError) {
        throw new Error(`Failed to update section: ${updateError.message}`);
      }

      this.logger.info('Successfully generated section content', { sectionId });
      return { success: true, data: section };

    } catch (error: any) {
      this.logger.error('Failed to generate section content', {
        sectionId,
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
