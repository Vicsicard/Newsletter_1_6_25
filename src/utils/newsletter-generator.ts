import { OpenAI } from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';
import { Logger } from './logger';

type Company = Database['public']['Tables']['companies']['Row'];
type Newsletter = Database['public']['Tables']['newsletters']['Row'];
type NewsletterSection = Database['public']['Tables']['newsletter_sections']['Row'];

export type GenerateSectionParams = {
  section_type: string;
  newsletter_id: string;
  section_number: number;
};

export type Result<T> = {
  success: boolean;
  data: T | null;
  error: Error | null;
};

export class NewsletterGenerator {
  private logger: Logger;

  constructor(
    private openai: OpenAI,
    private supabase: SupabaseClient,
    logger?: Logger
  ) {
    this.logger = logger || new Logger(supabase, 'NewsletterGenerator');
  }

  async generateSection(params: GenerateSectionParams): Promise<Result<NewsletterSection>> {
    try {
      await this.logger.info('Generating section', params);

      // Fetch newsletter
      const { data: newsletter, error: newsletterError } = await this.supabase
        .from('newsletters')
        .select()
        .eq('id', params.newsletter_id)
        .single();

      if (newsletterError) {
        throw new Error(`Failed to fetch newsletter: ${newsletterError.message}`);
      }

      if (!newsletter) {
        throw new Error('Newsletter not found');
      }

      if (newsletter.status !== 'draft') {
        throw new Error('Newsletter is not in draft status');
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

      if (!company) {
        throw new Error('Company not found');
      }

      // Generate content using OpenAI
      const prompt = `You are a professional newsletter writer for ${company.company_name}, a ${company.industry} company targeting ${company.target_audience}. Generate a ${params.section_type} section for the newsletter.`;
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional newsletter content writer.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const generatedContent = completion.choices[0]?.message?.content;
      if (!generatedContent) {
        throw new Error('No content generated');
      }

      // Track OpenAI usage
      const tokensUsed = completion.usage?.total_tokens || 0;
      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;

      await this.logger.info('OpenAI usage stats', {
        model: completion.model,
        total_tokens: tokensUsed,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens
      });

      // Create or update newsletter section
      const { data: section, error: sectionError } = await this.supabase
        .from('newsletter_sections')
        .upsert({
          newsletter_id: params.newsletter_id,
          section_number: params.section_number,
          type: params.section_type,
          content: generatedContent,
          status: 'completed',
          updated_at: new Date().toISOString(),
          openai_model: completion.model,
          openai_tokens_used: tokensUsed,
          openai_prompt_tokens: promptTokens,
          openai_completion_tokens: completionTokens
        })
        .select()
        .single();

      if (sectionError) {
        throw new Error(`Failed to save section: ${sectionError.message}`);
      }

      await this.logger.info('Section generated successfully', { sectionId: section.id });

      return {
        success: true,
        data: section,
        error: null
      };

    } catch (error) {
      await this.logger.error('Error generating section', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}
