import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import OpenAI from 'openai';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Section types and their prompts
const SECTION_CONFIG = {
  welcome: {
    prompt: "Write a welcome message",
    sectionNumber: 1
  },
  industry_trends: {
    prompt: "Write about current industry trends and innovations",
    sectionNumber: 2
  },
  practical_tips: {
    prompt: "Provide practical tips and best practices",
    sectionNumber: 3
  }
} as const;

type SectionType = keyof typeof SECTION_CONFIG;

interface QueueItem {
  id: string;
  newsletter_id: string;
  section_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message?: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getNextPendingItem(): Promise<QueueItem | null> {
  const { data, error } = await supabase
    .from('newsletter_generation_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

async function updateQueueItem(id: string, updates: Partial<QueueItem>) {
  const { error } = await supabase
    .from('newsletter_generation_queue')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating queue item:', error);
    throw error;
  }
}

async function processQueueItem(item: QueueItem): Promise<void> {
  console.log(`Processing queue item ${item.id} for newsletter ${item.newsletter_id}`);
  
  try {
    // Update status to in_progress
    await updateQueueItem(item.id, {
      status: 'in_progress',
      attempts: item.attempts + 1
    });

    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .select(`
        *,
        companies:company_id (
          id,
          company_name,
          industry,
          target_audience,
          audience_description
        )
      `)
      .eq('id', item.newsletter_id)
      .single();

    if (newsletterError || !newsletter) {
      throw new Error('Failed to fetch newsletter details');
    }

    const company = newsletter.companies;
    if (!company) {
      throw new Error('Failed to fetch company details');
    }

    // Generate content based on section type
    const config = SECTION_CONFIG[item.section_type as SectionType];
    if (!config) {
      throw new Error(`Invalid section type: ${item.section_type}`);
    }

    console.log(`Generating content for section ${item.section_type}...`);
    const messages = [
      {
        role: 'system',
        content: `You are a professional newsletter writer. Write content for a ${company.industry} company newsletter. The company name is ${company.company_name}.`
      },
      {
        role: 'user',
        content: `${config.prompt} for ${company.company_name}. Target audience: ${company.target_audience || 'general audience'}. ${company.audience_description ? `Audience details: ${company.audience_description}` : ''}`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = completion.choices[0].message.content;
    console.log(`Generated content for section ${item.section_type}`);

    // Create or update section
    const { error: sectionError } = await supabase
      .from('newsletter_sections')
      .upsert({
        newsletter_id: item.newsletter_id,
        section_type: item.section_type,
        section_number: config.sectionNumber,
        content,
        status: 'completed'
      }, {
        onConflict: 'newsletter_id,section_type'
      });

    if (sectionError) {
      throw new Error('Failed to save section content');
    }

    // Update queue item status to completed
    await updateQueueItem(item.id, {
      status: 'completed',
      error_message: null
    });

    console.log(`Successfully processed section ${item.section_type}`);

  } catch (error) {
    console.error(`Error processing section ${item.section_type}:`, error);
    
    // Update queue item with error
    await updateQueueItem(item.id, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function processQueue() {
  while (true) {
    try {
      const item = await getNextPendingItem();
      if (!item) {
        console.log('No pending items found');
        await sleep(5000); // Wait 5 seconds before checking again
        continue;
      }

      await processQueueItem(item);

    } catch (error) {
      console.error('Error processing queue:', error);
      await sleep(5000); // Wait 5 seconds before retrying
    }
  }
}

// Start processing the queue
console.log('Starting queue processor...');
processQueue().catch(error => {
  console.error('Fatal error in queue processor:', error);
  process.exit(1);
});
