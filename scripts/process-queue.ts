import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import OpenAI from 'openai';
import { validateEmail, sendEmail } from '../utils/email';
import { generateEmailHTML } from '../utils/email-template';

// Load environment variables from .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types based on database schema
type NewsletterStatus = 'draft' | 'published';
type NewsletterDraftStatus = 'draft' | 'ready_to_send' | 'sent';
type NewsletterSectionStatus = 'pending' | 'completed';
type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface DatabaseCompany {
  id: string;
  company_name: string;
  industry: string;
  target_audience?: string | null;
  audience_description?: string | null;
  contact_email: string;
  contact_name?: string | null;
}

interface DatabaseNewsletter {
  id: string;
  subject: string;
  status: NewsletterStatus;
  draft_status: NewsletterDraftStatus;
  draft_recipient_email?: string | null;
  company: DatabaseCompany;
}

interface DatabaseQueueItem {
  id: string;
  newsletter_id: string;
  section_type: string;
  section_number: number;
  status: QueueStatus;
  attempts: number;
  last_attempt_at?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  newsletter?: DatabaseNewsletter;
}

interface QueueItemUpdate {
  status?: QueueStatus;
  attempts?: number;
  last_attempt_at?: string | null;
  error_message?: string | null;
}

interface NewsletterSectionUpdate {
  title?: string;
  content?: string;
  status?: NewsletterSectionStatus;
}

async function getNextPendingItem(): Promise<DatabaseQueueItem | null> {
  console.log('Checking for pending items...');
  
  // First get the next pending queue item
  const { data: items, error: queueError } = await supabase
    .from('newsletter_generation_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (queueError) {
    console.error('Error fetching next item:', queueError);
    return null;
  }

  if (!items || items.length === 0) {
    console.log('No pending items found');
    return null;
  }

  const queueItem = items[0];

  // Then get the newsletter and company details
  const { data: newsletter, error: newsletterError } = await supabase
    .from('newsletters')
    .select(`
      *,
      company:company_id (*)
    `)
    .eq('id', queueItem.newsletter_id)
    .single();

  if (newsletterError) {
    console.error('Error fetching newsletter:', newsletterError);
    return null;
  }

  // Combine the data
  const item: DatabaseQueueItem = {
    ...queueItem,
    newsletter
  };

  console.log('Found pending item:', {
    id: item.id,
    newsletter_id: item.newsletter_id,
    section_type: item.section_type,
    section_number: item.section_number,
    newsletter_subject: item.newsletter?.subject,
    company_name: item.newsletter?.company?.company_name
  });

  return item;
}

async function updateQueueItem(id: string, updates: QueueItemUpdate): Promise<void> {
  const { error } = await supabase
    .from('newsletter_generation_queue')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating queue item:', error);
    throw error;
  }
}

async function updateNewsletterSection(id: string, updates: NewsletterSectionUpdate): Promise<void> {
  const { error } = await supabase
    .from('newsletter_sections')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating newsletter section:', error);
    throw error;
  }
}

async function getNewsletterSections(newsletterId: string): Promise<DatabaseNewsletterSection[]> {
  const { data: sections, error } = await supabase
    .from('newsletter_sections')
    .select('*')
    .eq('newsletter_id', newsletterId)
    .order('section_number', { ascending: true });

  if (error) {
    console.error('Error fetching newsletter sections:', error);
    throw error;
  }

  return sections;
}

interface DatabaseNewsletterSection {
  id: string;
  newsletter_id: string;
  section_type: string;
  section_number: number;
  title?: string;
  content?: string;
  status: NewsletterSectionStatus;
  created_at: string;
  updated_at: string;
}

async function processQueueItems() {
  console.log('Starting queue processor...');
  console.log('Checking queue status...');

  // First get the queue items
  const { data: queueItems, error: queueError } = await supabase
    .from('newsletter_generation_queue')
    .select('*')
    .in('status', ['pending', 'failed'])
    .order('created_at', { ascending: true });

  if (queueError) {
    console.error('Error fetching queue items:', queueError);
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    console.log('No pending items found.');
    return;
  }

  // Then get the newsletters
  const { data: newsletters, error: newslettersError } = await supabase
    .from('newsletters')
    .select('*')
    .in('id', queueItems.map(item => item.newsletter_id));

  if (newslettersError) {
    console.error('Error fetching newsletters:', newslettersError);
    return;
  }

  // Then get the companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .in('id', newsletters.map(n => n.company_id));

  if (companiesError) {
    console.error('Error fetching companies:', companiesError);
    return;
  }

  // Combine the data
  const combinedItems = queueItems.map(item => {
    const newsletter = newsletters?.find(n => n.id === item.newsletter_id);
    const company = newsletter ? companies?.find(c => c.id === newsletter.company_id) : undefined;
    return {
      ...item,
      newsletter: newsletter ? {
        ...newsletter,
        company: company as DatabaseCompany
      } : undefined
    } as DatabaseQueueItem;
  });

  console.log('Found queue items:');
  for (const item of combinedItems) {
    console.log(`- Queue Item ${item.id}:`);
    console.log(`  Newsletter: ${item.newsletter?.subject}`);
    console.log(`  Section: ${item.section_type}`);
    console.log(`  Status: ${item.status}`);
    console.log(`  Created: ${item.created_at}\n`);
  }

  console.log('\nProcessing queue...');
  for (const item of combinedItems) {
    try {
      if (!item.newsletter) {
        console.error(`Newsletter not found for queue item ${item.id}`);
        continue;
      }
      await processQueueItem(item);
    } catch (error) {
      console.error(`Failed to process queue item ${item.id}:`, error);
      // Continue with next item
    }
  }
}

async function processQueueItem(item: DatabaseQueueItem): Promise<void> {
  console.log(`Processing queue item ${item.id} for section ${item.section_type}`);

  try {
    if (!item.newsletter) {
      throw new Error(`Newsletter not found for queue item ${item.id}`);
    }

    // Update queue item status to processing
    await updateQueueItem(item.id, {
      status: 'processing',
      attempts: item.attempts + 1,
      last_attempt_at: new Date().toISOString()
    });

    if (!item.newsletter.company) {
      throw new Error(`Failed to fetch company details for newsletter ${item.newsletter.id}`);
    }

    // Generate section content using OpenAI
    const prompt = generatePrompt(item.section_type, item.newsletter.company);
    console.log(`Generating content for section ${item.section_type} of newsletter ${item.newsletter.subject}`);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional newsletter writer. Write engaging and informative content that is relevant to the target audience.'
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
      throw new Error('Failed to generate content');
    }

    // Generate title using OpenAI
    console.log('Generating title for the section...');
    const titleCompletion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Generate a short, engaging title for this newsletter section.'
        },
        {
          role: 'user',
          content: `Content: ${content}\n\nGenerate a title (max 5-7 words):`
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    const title = titleCompletion.choices[0]?.message?.content;
    if (!title) {
      throw new Error('Failed to generate title');
    }

    // Update newsletter section
    console.log('Updating newsletter section...');
    const { data: sections, error: sectionsError } = await supabase
      .from('newsletter_sections')
      .select('*')
      .eq('newsletter_id', item.newsletter_id)
      .eq('section_type', item.section_type)
      .eq('section_number', item.section_number);

    if (sectionsError) {
      throw sectionsError;
    }

    if (!sections || sections.length === 0) {
      throw new Error('Newsletter section not found');
    }

    const section = sections[0];
    await updateNewsletterSection(section.id, {
      title: title.trim(),
      content: content.trim(),
      status: 'completed'
    });

    // Update queue item status to completed
    await updateQueueItem(item.id, {
      status: 'completed',
      error_message: null
    });

    console.log(`Successfully processed section ${item.section_type}`);

  } catch (error) {
    console.error('Error processing queue item:', error);

    // Update queue item status to failed
    await updateQueueItem(item.id, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

function generatePrompt(sectionType: string, company: DatabaseCompany): string {
  const basePrompt = `Write a newsletter section for ${company.company_name}, a company in the ${company.industry} industry.`;
  
  let audienceInfo = '';
  if (company.target_audience) {
    audienceInfo += `\nTarget Audience: ${company.target_audience}`;
  }
  if (company.audience_description) {
    audienceInfo += `\nAudience Description: ${company.audience_description}`;
  }

  let sectionPrompt = '';
  switch (sectionType) {
    case 'welcome':
      sectionPrompt = 'Write a warm welcome message that introduces the newsletter and sets the tone.';
      break;
    case 'industry_trends':
      sectionPrompt = `Write about current trends in the ${company.industry} industry that would be relevant to our audience.`;
      break;
    case 'practical_tips':
      sectionPrompt = `Provide practical tips and actionable advice related to ${company.industry} that would benefit our readers.`;
      break;
    default:
      throw new Error(`Unknown section type: ${sectionType}`);
  }

  return `${basePrompt}${audienceInfo}\n\n${sectionPrompt}\n\nWrite approximately 300-400 words.`;
}

// Start queue processor
async function startQueueProcessor() {
  console.log('Starting queue processor with configuration:', {
    openaiKey: process.env.OPENAI_API_KEY ? 'set' : 'not set',
    supabaseUrl: process.env.SUPABASE_URL ? 'set' : 'not set',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'not set',
    brevoKey: process.env.BREVO_API_KEY ? 'set' : 'not set',
    brevoEmail: process.env.BREVO_SENDER_EMAIL ? 'set' : 'not set',
    brevoName: process.env.BREVO_SENDER_NAME ? 'set' : 'not set'
  });

  await processQueueItems();
}

// Start the processor
startQueueProcessor();
