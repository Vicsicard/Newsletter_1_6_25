import OpenAI from 'openai';
import { Database } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { APIError } from './errors';

type NewsletterSectionType = Database['public']['Tables']['newsletter_section_types']['Row'];
type QueueItem = Database['public']['Tables']['newsletter_generation_queue']['Row'];

interface GenerateOptions {
  companyName: string;
  industry: string;
  targetAudience?: string;
  audienceDescription?: string;
}

interface SectionContent {
  title: string;
  content: string;
  image_url?: string;
}

export class NewsletterGenerator {
  private openai: OpenAI;
  private supabase: SupabaseClient;

  constructor(openaiApiKey: string, supabase: SupabaseClient) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.supabase = supabase;
  }

  private async getSectionType(sectionType: string, companyId: string): Promise<NewsletterSectionType> {
    // Try to get company-specific section type first
    const { data: companySection } = await this.supabase
      .from('newsletter_section_types')
      .select('*')
      .eq('section_type', sectionType)
      .eq('company_id', companyId)
      .single();

    if (companySection) {
      return companySection;
    }

    // Fall back to global section type
    const { data: globalSection, error } = await this.supabase
      .from('newsletter_section_types')
      .select('*')
      .eq('section_type', sectionType)
      .is('company_id', null)
      .single();

    if (error || !globalSection) {
      throw new Error(`Section type ${sectionType} not found`);
    }

    return globalSection;
  }

  private formatPrompt(template: string, options: GenerateOptions): string {
    return template
      .replace('{company_name}', options.companyName)
      .replace('{industry}', options.industry)
      .replace('{target_audience}', options.targetAudience || 'our audience')
      .replace('{audience_description}', options.audienceDescription || 'interested in our products and services');
  }

  private async generateContent(prompt: string): Promise<SectionContent> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional newsletter content generator. Create engaging, well-structured content that is appropriate for business communications.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new APIError('Failed to generate content');
    }

    // Extract title from content (assuming first line is title)
    const lines = content.split('\n');
    const title = lines[0].replace(/^#\s*/, '');
    const mainContent = lines.slice(1).join('\n').trim();

    return {
      title,
      content: mainContent
    };
  }

  public async generateSection(
    queueItem: QueueItem,
    options: GenerateOptions
  ): Promise<SectionContent> {
    try {
      // Get section type configuration
      const sectionType = await this.getSectionType(queueItem.section_type, queueItem.newsletter_id);
      
      // Format prompt using template
      const prompt = this.formatPrompt(sectionType.prompt_template, options);
      
      // Generate content
      const content = await this.generateContent(prompt);
      
      return content;
    } catch (error) {
      console.error('Error generating section:', error);
      throw error;
    }
  }
}

// Export a factory function for creating the generator
export function createNewsletterGenerator(
  openaiApiKey: string,
  supabase: SupabaseClient
): NewsletterGenerator {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key is required');
  }
  return new NewsletterGenerator(openaiApiKey, supabase);
}
