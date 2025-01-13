import OpenAI from 'openai';
import type { Database } from '@/types/database';
import type { NewsletterWithCompany, NewsletterSection, NewsletterSectionStatus } from '@/types/email';
import { getSupabaseAdmin } from './supabase-admin';
import { APIError } from './errors';
import { generateImage } from './image';
import { SupabaseClient } from '@supabase/supabase-js';

// Use database types
type NewsletterSectionInsert = Database['public']['Tables']['newsletter_sections']['Insert'];
type NewsletterSectionRow = Database['public']['Tables']['newsletter_sections']['Row'];
type QueueItem = Database['public']['Tables']['newsletter_generation_queue']['Row'];

interface NewsletterSectionContent {
  title: string;
  content: string;
  image_url?: string;
  section_type: string;
  section_number: number;
}

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

// Custom error class for API errors with retry count
class RetryableAPIError extends Error {
  retryCount: number;
  
  constructor(message: string, retryCount: number) {
    super(message);
    this.retryCount = retryCount;
  }
}

// Initialize queue items for a newsletter
export async function initializeGenerationQueue(
  newsletterId: string,
  supabase: SupabaseClient<Database>
) {
  try {
    // Get newsletter sections
    const { data: sections, error: sectionsError } = await supabase
      .from('newsletter_sections')
      .select('*')
      .eq('newsletter_id', newsletterId)
      .order('section_number');

    if (sectionsError) {
      throw new RetryableAPIError('Failed to fetch newsletter sections', 0);
    }

    // Create queue items for each section
    const queueItems = sections.map(section => ({
      newsletter_id: newsletterId,
      section_type: section.section_type,
      section_number: section.section_number,
      status: 'pending',
      attempts: 0
    }));

    const { error: queueError } = await supabase
      .from('newsletter_generation_queue')
      .insert(queueItems);

    if (queueError) {
      throw new RetryableAPIError('Failed to create queue items', 0);
    }

    // Update newsletter status
    const { error: updateError } = await supabase
      .from('newsletters')
      .update({ draft_status: 'draft_sent' })
      .eq('id', newsletterId);

    if (updateError) {
      throw new RetryableAPIError('Failed to update newsletter status', 0);
    }

    return true;
  } catch (error) {
    console.error('Error initializing generation queue:', error);
    throw error;
  }
}

// Export the function for testing
export async function validateOpenAIKey() {
  try {
    const openai = new OpenAI();
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI API key validation failed:', error);
    return false;
  }
}

async function callOpenAIWithRetry(messages: any[], retries = 5, delay = 60000): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    if (retries > 0) {
      console.log(`OpenAI API call failed, retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callOpenAIWithRetry(messages, retries - 1, delay * 2);
    }
    throw new RetryableAPIError('Failed to generate content after multiple retries', retries);
  }
}

// Track DALL-E usage to stay within 15 images per minute limit
let imageGenerationTimestamps: number[] = [];
const IMAGE_RATE_LIMIT = 15;
const ONE_MINUTE = 60000;

async function waitForImageRateLimit() {
  const now = Date.now();
  imageGenerationTimestamps = imageGenerationTimestamps.filter(
    timestamp => now - timestamp < ONE_MINUTE
  );

  if (imageGenerationTimestamps.length >= IMAGE_RATE_LIMIT) {
    const oldestTimestamp = imageGenerationTimestamps[0];
    const waitTime = ONE_MINUTE - (now - oldestTimestamp);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  imageGenerationTimestamps.push(now);
}

// Maximum tokens per section to stay within OpenAI limits
const MAX_TOKENS_PER_SECTION = 2048;
const TOKEN_BUFFER = 200; // Buffer for system message and other overhead

async function generateSectionsWithOpenAI(
  openai: OpenAI,
  customPrompt?: string,
  companyInfo?: {
    companyName: string;
    industry: string;
    targetAudience?: string;
    audienceDescription?: string;
  }
): Promise<NewsletterSectionContent[]> {
  const sections: NewsletterSectionContent[] = [];
  const supabase = getSupabaseAdmin();

  // Fetch custom section types from database
  const { data: sectionTypes, error: sectionError } = await supabase
    .from('newsletter_section_types')
    .select('*')
    .order('section_number');

  if (sectionError) {
    throw new Error('Failed to fetch section types');
  }

  for (const sectionType of sectionTypes) {
    try {
      // Create dynamic prompt using company info
      const basePrompt = sectionType.prompt_template;
      const dynamicPrompt = basePrompt
        .replace('{{company_name}}', companyInfo?.companyName || '')
        .replace('{{industry}}', companyInfo?.industry || '')
        .replace('{{target_audience}}', companyInfo?.targetAudience || '')
        .replace('{{audience_description}}', companyInfo?.audienceDescription || '');

      // Calculate available tokens
      const promptTokens = Math.ceil(dynamicPrompt.length / 4); // Rough estimate
      const availableTokens = MAX_TOKENS_PER_SECTION - promptTokens - TOKEN_BUFFER;

      // Generate section content with token limit
      const content = await callOpenAIWithRetry([
        {
          role: 'system',
          content: `You are a professional newsletter writer. Write a ${sectionType.section_type} section for a newsletter.
                   Keep it concise, engaging, and relevant to the target audience.
                   Your response must not exceed ${availableTokens} tokens.`
        },
        {
          role: 'user',
          content: dynamicPrompt || customPrompt || basePrompt
        }
      ]);

      // Extract title and content
      const [title, ...contentLines] = content.split('\n').filter(line => line.trim());
      
      // Generate image if needed
      let imageUrl: string | undefined;
      try {
        imageUrl = await generateImage(title) || undefined;
      } catch (error) {
        console.error('Failed to generate image:', error);
        // Continue without image
      }

      sections.push({
        title,
        content: contentLines.join('\n'),
        image_url: imageUrl,
        section_type: sectionType.section_type,
        section_number: sectionType.section_number
      });
    } catch (error: any) {
      console.error(`Error generating section ${sectionType.section_type}:`, error);
      throw error;
    }
  }

  return sections;
}

interface CreateSectionOptions {
  newsletterId: string;
  companyId: string;
  selectedSectionTypes?: string[];
}

async function createNewsletterSections({
  newsletterId,
  companyId,
  selectedSectionTypes
}: CreateSectionOptions): Promise<NewsletterSectionRow[]> {
  const supabase = getSupabaseAdmin();
  
  // Fetch available section types for company
  const { data: sectionTypes, error: typesError } = await supabase
    .from('newsletter_section_types')
    .select('*')
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .order('section_number');
    
  if (typesError) {
    throw new Error('Failed to fetch section types');
  }

  // Filter to selected types if provided, otherwise use all available types
  const typesToCreate = selectedSectionTypes
    ? sectionTypes.filter(type => selectedSectionTypes.includes(type.section_type))
    : sectionTypes;

  // Ensure all required sections are included
  const requiredTypes = sectionTypes.filter(type => type.required);
  const missingRequired = requiredTypes.filter(
    req => !typesToCreate.some(type => type.section_type === req.section_type)
  );

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required section types: ${missingRequired.map(t => t.section_type).join(', ')}`
    );
  }

  // Create sections in correct order
  const sections: NewsletterSectionInsert[] = typesToCreate.map((type, index) => ({
    newsletter_id: newsletterId,
    section_type: type.section_type,
    section_number: type.section_number || index + 1,
    status: 'pending',
    content: null,
    error_message: null
  }));

  // Insert sections
  const { data: createdSections, error: insertError } = await supabase
    .from('newsletter_sections')
    .insert(sections)
    .select();

  if (insertError) {
    throw new Error('Failed to create newsletter sections');
  }

  return createdSections;
}

async function createQueueItems(
  newsletterId: string,
  sections: NewsletterSectionRow[]
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Create queue items for each section
  const queueItems = sections.map(section => ({
    newsletter_id: newsletterId,
    section_type: section.section_type,
    section_number: section.section_number,
    status: 'pending',
    attempts: 0,
    error_message: null,
    processing_started_at: null,
    processing_completed_at: null
  }));

  // Insert queue items
  const { error: queueError } = await supabase
    .from('newsletter_generation_queue')
    .insert(queueItems);

  if (queueError) {
    throw new Error('Failed to create queue items');
  }

  // Update newsletter status to indicate queue items are created
  const { error: updateError } = await supabase
    .from('newsletters')
    .update({ draft_status: 'queued' })
    .eq('id', newsletterId);

  if (updateError) {
    throw new Error('Failed to update newsletter status');
  }
}

export async function generateNewsletter(
  newsletterId: string,
  customPrompt?: string,
  companyInfo?: {
    companyName: string;
    industry: string;
    targetAudience?: string;
    audienceDescription?: string;
  }
): Promise<NewsletterSectionContent[]> {
  try {
    // Validate OpenAI API key
    const isValid = await validateOpenAIKey();
    if (!isValid) {
      throw new Error('Invalid OpenAI API key');
    }

    // Generate sections
    const sections = await generateSectionsWithOpenAI(openai, customPrompt, companyInfo);

    return sections;
  } catch (error) {
    console.error('Error generating newsletter:', error);
    throw error;
  }
}

// Format newsletter subject consistently across the application
export function formatNewsletterSubject(companyName: string, date: Date = new Date()): string {
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return `${month} ${year} ${companyName} Newsletter`;
}

// Validate email list
export function validateEmailList(emails: string[]): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emails.every(email => emailRegex.test(email));
}

// Generate HTML content for newsletter
export function generateNewsletterHtml(sections: { title: string; content: string; imageUrl?: string }[]): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2 {
            color: #2c5282;
          }
          img {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
          }
          .section {
            margin-bottom: 40px;
          }
        </style>
      </head>
      <body>
        ${sections.map(section => `
          <div class="section">
            ${section.title ? `<h2>${section.title}</h2>` : ''}
            ${section.imageUrl ? `<img src="${section.imageUrl}" alt="${section.title || 'Newsletter section image'}">` : ''}
            ${section.content}
          </div>
        `).join('')}
      </body>
    </html>
  `;
}
