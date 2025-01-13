import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { Database } from '../types/database';
import { createNewsletterGenerator } from '../utils/newsletter-generator';
import { APIError } from '../utils/errors';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

// Constants
const MAX_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 5000;
const MAX_RETRY_DELAY = 60000;
const MAX_CONSECUTIVE_ERRORS = 5;
const ERROR_COOLDOWN = 300000;

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const defaultSupabase = createClient<Database>(supabaseUrl, supabaseKey);

// Initialize newsletter generator
const defaultGenerator = createNewsletterGenerator(
  process.env.OPENAI_API_KEY!,
  defaultSupabase
);

type QueueItem = Database['public']['Tables']['newsletter_generation_queue']['Row'];

export async function updateQueueItemStatus(
  item: QueueItem,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: Error,
  supabase: SupabaseClient<Database> = defaultSupabase
): Promise<void> {
  const updates = {
    status,
    error_message: error?.message || null,
    last_attempt_at: new Date().toISOString(),
    attempts: item.attempts + (status === 'failed' ? 1 : 0),
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('newsletter_generation_queue')
    .update(updates)
    .eq('id', item.id);

  if (updateError) {
    throw new Error(`Failed to update queue item status: ${updateError.message}`);
  }
}

export async function processQueueItem(
  item: QueueItem,
  supabase: SupabaseClient<Database> = defaultSupabase,
  generator = defaultGenerator
): Promise<void> {
  console.log(`Processing queue item ${item.id} (${item.section_type})`);

  try {
    // Update status to processing
    await updateQueueItemStatus(item, 'processing', undefined, supabase);

    // Get newsletter data
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .select()
      .eq('id', item.newsletter_id)
      .single();

    if (newsletterError || !newsletter) {
      throw new Error(`Newsletter not found: ${newsletterError?.message}`);
    }

    // Get company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select()
      .eq('id', newsletter.company_id)
      .single();

    if (companyError || !company) {
      throw new Error(`Company not found: ${companyError?.message}`);
    }

    // Generate section content
    await generator.generateSection(item, {
      companyName: company.company_name,
      industry: company.industry,
      targetAudience: company.target_audience,
      audienceDescription: company.audience_description
    });

    // Update status to completed
    await updateQueueItemStatus(item, 'completed', undefined, supabase);

  } catch (error) {
    console.error(`Error processing queue item ${item.id}:`, error);
    
    const shouldRetry = item.attempts < MAX_ATTEMPTS && 
      !(error instanceof APIError && error.message.includes('rate limit'));

    await updateQueueItemStatus(
      item,
      shouldRetry ? 'pending' : 'failed',
      error instanceof Error ? error : new Error(String(error)),
      supabase
    );
  }
}

export async function acquireNextQueueItem(
  supabase: SupabaseClient<Database> = defaultSupabase
): Promise<QueueItem | null> {
  const { data: items, error } = await supabase
    .from('newsletter_generation_queue')
    .select()
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !items || items.length === 0) {
    return null;
  }

  return items[0];
}

export async function runWorker(
  supabase: SupabaseClient<Database> = defaultSupabase,
  generator = defaultGenerator
): Promise<void> {
  let consecutiveErrors = 0;
  let lastErrorTime = 0;

  while (true) {
    try {
      const item = await acquireNextQueueItem(supabase);
      if (!item) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      await processQueueItem(item, supabase, generator);
      consecutiveErrors = 0;
    } catch (error) {
      console.error('Worker error:', error);
      consecutiveErrors++;

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        const now = Date.now();
        if (now - lastErrorTime < ERROR_COOLDOWN) {
          console.log('Too many errors, cooling down...');
          await new Promise(resolve => setTimeout(resolve, ERROR_COOLDOWN));
        }
        lastErrorTime = now;
      }

      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, consecutiveErrors - 1),
        MAX_RETRY_DELAY
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Start the worker
if (require.main === module) {
  runWorker(defaultSupabase, defaultGenerator).catch(console.error);
}
