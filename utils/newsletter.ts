import OpenAI from 'openai';
import type { Database } from '@/types/database';
import { NewsletterWithCompany, NewsletterSection, NewsletterSectionStatus } from '@/types/email';
import { getSupabaseAdmin } from './supabase-admin';
import { APIError } from './errors';
import { generateImage } from './image';
import { SupabaseClient } from '@supabase/supabase-js';

// Use database types
type NewsletterSectionInsert = Database['public']['Tables']['newsletter_sections']['Insert'];
type NewsletterSectionRow = Database['public']['Tables']['newsletter_sections']['Row'];
type QueueItem = Database['public']['Tables']['newsletter_generation_queue']['Row'];

interface GenerateOptions {
  companyName: string;
  industry: string;
  targetAudience?: string;
  audienceDescription?: string;
}

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

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function validateOpenAIKey() {
  try {
    // Try a simple API call to validate the key
    await openai.models.list();
    return true;
  } catch (error: any) {
    console.error('OpenAI API key validation failed:', {
      error: error.message,
      status: error.status,
      type: error.type
    });
    return false;
  }
}

async function callOpenAIWithRetry(messages: any[], retries = 5, delay = 60000): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  for (let i = 0; i < retries; i++) {
    try {
      const completion = await openai.chat.completions.create({
        messages,
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000
      }, {
        timeout: 180000 // 3 minute timeout
      });

      return completion.choices[0].message.content || '';
    } catch (error: any) {
      console.error(`OpenAI API call failed (attempt ${i + 1}/${retries}):`, error);
      
      if (i === retries - 1) {
        throw error;
      }
      
      // Exponential backoff: 1 min, 2 min, 4 min, 8 min
      const backoffDelay = delay * Math.pow(2, i);
      console.log(`Retrying in ${backoffDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw new Error('Failed to get response from OpenAI after all retries');
}

// Track DALL-E usage to stay within 15 images per minute limit
let imageGenerationTimestamps: number[] = [];
const IMAGE_RATE_LIMIT = 15;
const ONE_MINUTE = 60000;

async function waitForImageRateLimit() {
  const now = Date.now();
  imageGenerationTimestamps = imageGenerationTimestamps.filter(timestamp => 
    now - timestamp < ONE_MINUTE
  );
  
  if (imageGenerationTimestamps.length >= IMAGE_RATE_LIMIT) {
    const oldestTimestamp = imageGenerationTimestamps[0];
    const waitTime = ONE_MINUTE - (now - oldestTimestamp);
    if (waitTime > 0) {
      console.log(`Waiting ${waitTime}ms to respect DALL-E rate limit`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  imageGenerationTimestamps.push(now);
}

export async function initializeGenerationQueue(
  newsletterId: string,
  supabaseAdmin: SupabaseClient<Database>
): Promise<void> {
  console.log('Starting queue initialization for newsletter:', newsletterId);
  
  try {
    // Check if queue items exist
    const { data: existingQueue, error: checkError } = await supabaseAdmin
      .from('newsletter_generation_queue')
      .select('*')
      .eq('newsletter_id', newsletterId);

    if (checkError) {
      console.error('Error checking queue:', checkError);
      throw new APIError('Failed to check queue status', 500);
    }

    // If no queue items exist, the trigger hasn't run yet
    if (!existingQueue?.length) {
      console.log('No queue items found. Waiting for trigger to create them...');
      // Wait for up to 5 seconds for the trigger to create items
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: items, error } = await supabaseAdmin
          .from('newsletter_generation_queue')
          .select('*')
          .eq('newsletter_id', newsletterId);
        
        if (error) {
          console.error('Error checking queue items:', error);
          continue;
        }
        
        if (items?.length > 0) {
          console.log('Queue items created by trigger:', items.length);
          break;
        }
      }
    }

    // Update newsletter status to indicate generation has started
    const timestamp = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('newsletters')
      .update({
        status: 'generating',
        draft_status: 'generating',
        updated_at: timestamp
      })
      .eq('id', newsletterId);

    if (updateError) {
      console.error('Error updating newsletter status:', updateError);
      throw new APIError('Failed to update newsletter status', 500);
    }

    console.log('Successfully initialized queue');
  } catch (error) {
    console.error('Error in queue initialization:', error);
    throw error;
  }
}

async function updateQueueItemStatus(
  supabaseAdmin: SupabaseClient<Database>,
  newsletterId: string,
  sectionType: SectionType,
  status: 'in_progress' | 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Use a transaction to safely update the queue item
  const { data: queueItem, error: selectError } = await supabaseAdmin
    .from('newsletter_generation_queue')
    .select('attempts')
    .eq('newsletter_id', newsletterId)
    .eq('section_type', sectionType)
    .single();

  if (selectError) {
    console.error('Error fetching queue item:', selectError);
    return;
  }

  const attempts = status === 'failed' ? (queueItem?.attempts || 0) + 1 : undefined;

  const { error: updateError } = await supabaseAdmin
    .from('newsletter_generation_queue')
    .update({
      status,
      error_message: errorMessage,
      last_attempt_at: timestamp,
      attempts,
      updated_at: timestamp
    })
    .eq('newsletter_id', newsletterId)
    .eq('section_type', sectionType);

  if (updateError) {
    console.error('Error updating queue item status:', updateError);
    // Don't throw here as this is not critical
  }
}

export async function generateNewsletter(
  newsletterId: string,
  customPrompt?: string,
  options?: GenerateOptions
): Promise<NewsletterSection[]> {
  const supabaseAdmin = getSupabaseAdmin();
  
  try {
    console.log('Starting newsletter generation for:', { newsletterId, customPrompt });
    console.log('Current environment:', {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      env: process.env.NODE_ENV
    });

    if (!options) {
      // Get company data from newsletter if options not provided
      console.log('Fetching company data for newsletter:', newsletterId);
      type NewsletterWithCompanyResult = {
        data: NewsletterWithCompany | null;
        error: any;
      };

      const { data: newsletter, error: newsletterError } = await supabaseAdmin
        .from('newsletters')
        .select(`
          *,
          company:companies (
            company_name,
            industry,
            target_audience,
            audience_description,
            contact_email
          )
        `)
        .eq('id', newsletterId)
        .single() as NewsletterWithCompanyResult;

      if (newsletterError) {
        console.error('Error fetching newsletter data:', newsletterError);
        throw new APIError('Failed to fetch newsletter data', 500);
      }

      if (!newsletter || !newsletter.company) {
        console.error('Newsletter or company data not found');
        throw new APIError('Newsletter or company data not found', 404);
      }

      console.log('Successfully fetched newsletter data:', {
        companyName: newsletter.company.company_name,
        industry: newsletter.company.industry
      });

      options = {
        companyName: newsletter.company.company_name,
        industry: newsletter.company.industry,
        targetAudience: newsletter.company.target_audience || undefined,
        audienceDescription: newsletter.company.audience_description || undefined
      };
    }

    // Validate OpenAI key
    const isValidKey = await validateOpenAIKey();
    if (!isValidKey) {
      throw new APIError('Invalid OpenAI API key', 500);
    }

    // Initialize generation queue
    console.log('Starting queue initialization...');
    await initializeGenerationQueue(newsletterId, supabaseAdmin);
    
    // Verify queue initialization with extended retries
    let initialQueue = null;
    let verifyError = null;
    let retries = 5; // Increase retries
    
    while (retries > 0) {
      const result = await supabaseAdmin
        .from('newsletter_generation_queue')
        .select('*')
        .eq('newsletter_id', newsletterId)
        .order('section_number', { ascending: true });
      
      if (!result.error && result.data?.length === Object.keys(SECTION_CONFIG).length) {
        initialQueue = result.data;
        break;
      }
      
      verifyError = result.error;
      retries--;
      if (retries > 0) {
        console.log(`Queue verification attempt failed, retrying in 30 seconds... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay between retries
      }
    }

    if (!initialQueue) {
      console.error('Error verifying initial queue:', verifyError);
      throw new APIError('Failed to initialize generation queue', 500);
    }

    console.log('Initial queue state:', initialQueue.map((item: QueueItem) => ({
      section: item.section_number,
      type: item.section_type,
      status: item.status
    })));

    const sections: NewsletterSectionInsert[] = [];

    // Generate each section with longer delays between sections
    for (const [sectionType, config] of Object.entries(SECTION_CONFIG) as [SectionType, typeof SECTION_CONFIG[SectionType]][]) {
      console.log(`Starting generation for section ${config.sectionNumber} (${sectionType})...`);
      
      // Check queue status before starting
      const { data: queueItem, error: queueError } = await supabaseAdmin
        .from('newsletter_generation_queue')
        .select('*')
        .eq('newsletter_id', newsletterId)
        .eq('section_type', sectionType)
        .single();

      if (queueError) {
        console.error(`Error checking queue for section ${sectionType}:`, queueError);
        continue;
      }

      // Update status to in_progress
      await updateQueueItemStatus(supabaseAdmin, newsletterId, sectionType, 'in_progress');

      try {
        // Check if section already exists
        const { data: existingSection } = await supabaseAdmin
          .from('newsletter_sections')
          .select('*')
          .eq('newsletter_id', newsletterId)
          .eq('section_number', config.sectionNumber)
          .single();

        if (existingSection) {
          console.log(`Section ${config.sectionNumber} already exists, skipping...`);
          // Update queue item status to completed since section already exists
          await updateQueueItemStatus(supabaseAdmin, newsletterId, sectionType, 'completed');
          continue;
        }

        const prompt = sectionType === 'welcome' ? config.prompt : (customPrompt || config.prompt);
        
        console.log(`Calling OpenAI for section ${config.sectionNumber} with prompt:`, prompt);
        
        const response = await callOpenAIWithRetry([{
          role: "system",
          content: "You are a professional newsletter writer specializing in business content."
        }, {
          role: "user",
          content: `${prompt} for ${options.companyName}, a ${options.industry} company targeting ${options.targetAudience || 'general audience'}. 
          Make it engaging and actionable. Include a title for this section.`
        }];

        console.log(`Generated content for section ${config.sectionNumber}:`, response.substring(0, 100) + '...');

        // Extract title and content
        const lines = response.split('\n').filter(line => line.trim());
        const title = lines[0].replace(/^#*\s*/, ''); // Remove any markdown heading symbols
        const content = lines.slice(1).join('\n').trim();

        console.log(`Extracted title for section ${config.sectionNumber}:`, title);

        // Generate image for this section
        const imagePrompt = `Create a modern, professional abstract image representing ${options.industry} concepts. The image should be minimalist and symbolic, focusing on geometric shapes, gradients, or abstract patterns. Do not include any text, letters, numbers, or human figures. Use a professional color palette suitable for ${options.industry}. The image should convey the concept of ${title} through abstract visual elements only, such as flowing lines, interconnected shapes, or dynamic compositions. Make it suitable for a business newsletter background.`;
        console.log(`Generating image for section ${config.sectionNumber} with prompt:`, imagePrompt);
        
        let imageUrl = null;
        try {
          await waitForImageRateLimit();
          imageUrl = await generateImage(imagePrompt);
          console.log(`Generated image URL for section ${config.sectionNumber}:`, imageUrl);
        } catch (imageError) {
          console.error(`Error generating image for section ${config.sectionNumber}:`, imageError);
          // Continue without image if image generation fails
        }

        // Upsert this section
        const { error: upsertError } = await supabaseAdmin
          .from('newsletter_sections')
          .upsert({
            newsletter_id: newsletterId,
            section_number: config.sectionNumber,
            title,
            content,
            image_prompt: imagePrompt,
            image_url: imageUrl,
            status: 'active' as NewsletterSectionStatus,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'newsletter_id,section_number'
          });

        if (upsertError) {
          throw new Error(`Failed to upsert section: ${upsertError.message}`);
        }

        // Update status to completed
        await updateQueueItemStatus(supabaseAdmin, newsletterId, sectionType, 'completed');
        
        // Add a 15-minute delay between sections to handle OpenAI load
        if (config.sectionNumber < Object.keys(SECTION_CONFIG).length) {
          console.log(`Waiting 15 minutes before starting next section to handle potential OpenAI load...`);
          await new Promise(resolve => setTimeout(resolve, 900000)); // 15 minutes
        }
      } catch (error: any) {
        console.error(`Error generating section ${sectionType}:`, error);
        await updateQueueItemStatus(
          supabaseAdmin,
          newsletterId,
          sectionType,
          'failed',
          error.message || 'Unknown error'
        );
        
        // On failure, wait 30 minutes before trying the next section
        // This gives more time for OpenAI to recover if there are capacity issues
        if (config.sectionNumber < Object.keys(SECTION_CONFIG).length) {
          console.log('Error occurred, waiting 30 minutes before next section...');
          await new Promise(resolve => setTimeout(resolve, 1800000)); // 30 minutes
        }
        
        throw error;
      }
    }

    // Get all sections after generation
    const { data: finalSections, error: fetchError } = await supabaseAdmin
      .from('newsletter_sections')
      .select('*')
      .eq('newsletter_id', newsletterId)
      .order('section_number', { ascending: true });

    if (fetchError) {
      console.error('Error fetching final sections:', fetchError);
      throw new APIError('Failed to fetch final sections', 500);
    }

    console.log('Successfully generated/updated all sections');
    return finalSections;

  } catch (error) {
    console.error('Error generating newsletter:', error);
    throw error instanceof APIError ? error : new APIError('Failed to generate newsletter', 500);
  }
}

interface NewsletterSectionContent {
  title: string;
  content: string;
  imageUrl?: string;
}

export function formatNewsletterHtml(sections: NewsletterSectionContent[]): string {
  return `
    <!DOCTYPE html>
    <html>
      <body>
        ${sections.map(section => `
          <div class="section">
            <h2>${section.title}</h2>
            <div class="content">
              ${section.content}
            </div>
          </div>
        `).join('')}
      </body>
    </html>
  `;
}

// Format newsletter subject consistently across the application
export function formatNewsletterSubject(companyName: string, date: Date = new Date()): string {
  return `Newsletter for ${companyName} - ${date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })}`;
}

export async function validateEmailList(emails: string[]) {
  return emails.every(email => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  });
}
