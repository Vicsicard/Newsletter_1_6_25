import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';

type QueueItem = Database['public']['Tables']['newsletter_generation_queue']['Row'];
type Newsletter = Database['public']['Tables']['newsletters']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

type Result<T> = {
  success: boolean;
  data: T | null;
  error: Error | null;
};

export class QueueProcessor {
  constructor(
    private openai: OpenAI,
    private supabase: SupabaseClient<Database>
  ) {}

  async processQueueItem(queueItemId: string): Promise<Result<QueueItem>> {
    try {
      // Fetch queue item
      const { data: queueItem, error: queueError } = await this.supabase
        .from('newsletter_generation_queue')
        .select()
        .eq('id', queueItemId)
        .single();

      if (queueError) {
        return {
          success: false,
          data: null,
          error: new Error(`Failed to fetch queue item: ${queueError.message}`)
        };
      }
      if (!queueItem) {
        return {
          success: false,
          data: null,
          error: new Error('Queue item not found')
        };
      }

      // Fetch newsletter
      const { data: newsletter, error: newsletterError } = await this.supabase
        .from('newsletters')
        .select()
        .eq('id', queueItem.newsletter_id)
        .single();

      if (newsletterError) {
        return {
          success: false,
          data: null,
          error: new Error(`Failed to fetch newsletter: ${newsletterError.message}`)
        };
      }
      if (!newsletter) {
        return {
          success: false,
          data: null,
          error: new Error('Newsletter not found')
        };
      }

      // Fetch company
      const { data: company, error: companyError } = await this.supabase
        .from('companies')
        .select()
        .eq('id', newsletter.company_id)
        .single();

      if (companyError) {
        return {
          success: false,
          data: null,
          error: new Error(`Failed to fetch company: ${companyError.message}`)
        };
      }
      if (!company) {
        return {
          success: false,
          data: null,
          error: new Error('Company not found')
        };
      }

      // Generate content using OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ 
          role: 'user', 
          content: `Generate newsletter content for ${company.company_name} - Section ${queueItem.section_type}`
        }]
      });

      const generatedContent = completion.choices[0]?.message?.content;
      if (!generatedContent) {
        return {
          success: false,
          data: null,
          error: new Error('No content generated')
        };
      }

      // Update queue item status
      const { data: updatedItem, error: updateError } = await this.supabase
        .from('newsletter_generation_queue')
        .update({
          status: 'completed',
          attempts: queueItem.attempts + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', queueItemId)
        .select()
        .single();

      if (updateError) {
        return {
          success: false,
          data: null,
          error: new Error(`Failed to update queue item: ${updateError.message}`)
        };
      }

      return {
        success: true,
        data: updatedItem,
        error: null
      };
    } catch (error) {
      // Update queue item with error
      const { data: updatedItem } = await this.supabase
        .from('newsletter_generation_queue')
        .update({
          status: 'failed',
          attempts: 1,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', queueItemId)
        .select()
        .single();

      return {
        success: false,
        data: updatedItem,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }
}
