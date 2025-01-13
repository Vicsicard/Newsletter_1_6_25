import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

export class NewsletterGenerator {
  constructor(
    private readonly openai: OpenAI,
    private readonly supabase: SupabaseClient<Database>
  ) {}

  async generateNewsletter(newsletterId: string): Promise<void> {
    // Fetch newsletter
    const { data: newsletter, error: newsletterError } = await this.supabase
      .from('newsletters')
      .select()
      .eq('id', newsletterId)
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

    // Generate content using OpenAI
    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `Generate a newsletter for ${company.company_name} in the ${company.industry} industry.`
        }
      ],
      model: 'gpt-3.5-turbo'
    });

    const generatedContent = completion.choices[0].message.content;

    // Update newsletter content
    const { error: updateError } = await this.supabase
      .from('newsletters')
      .update({ content: generatedContent })
      .eq('id', newsletterId);

    if (updateError) {
      throw new Error(`Failed to update newsletter: ${updateError.message}`);
    }
  }
}
