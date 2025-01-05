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

async function validateOpenAIKey() {
  try {
    // Try a simple API call to validate the key
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

  for (const [sectionType, config] of Object.entries(SECTION_CONFIG)) {
    try {
      // Generate section content
      const prompt = customPrompt || config.prompt;
      const content = await callOpenAIWithRetry([
        {
          role: 'system',
          content: `You are a professional newsletter writer. Write a ${sectionType} section for a newsletter.
                   Keep it concise, engaging, and relevant to the target audience.`
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      // Extract title and content
      const [title, ...contentLines] = content.split('\n').filter(line => line.trim());
      
      // Generate image if needed
      let imageUrl: string | undefined = undefined;
      if (sectionType !== 'welcome') {
        imageUrl = await generateImage(title);
      }

      sections.push({
        title,
        content: contentLines.join('\n'),
        image_url: imageUrl
      });
    } catch (error: any) {
      console.error(`Error generating section ${sectionType}:`, error);
      throw error;
    }
  }

  return sections;
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
