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

async function generateSectionsWithOpenAI(
  openai: OpenAI,
  customPrompt?: string,
  companyInfo?: {
    companyName: string;
    industry: string;
    targetAudience?: string;
    audienceDescription?: string;
  }
): Promise<NewsletterSection[]> {
  const sections: NewsletterSection[] = [];

  for (const [sectionType, config] of Object.entries(SECTION_CONFIG) as [SectionType, typeof SECTION_CONFIG[SectionType]][]) {
    try {
      const prompt = sectionType === 'welcome' ? config.prompt : (customPrompt || config.prompt);
      
      console.log(`Calling OpenAI for section ${config.sectionNumber} with prompt:`, prompt);
      
      const response = await callOpenAIWithRetry([
        {
          role: "system",
          content: "You are a professional newsletter writer specializing in business content."
        },
        {
          role: "user",
          content: `${prompt} for ${companyInfo?.companyName}, a ${companyInfo?.industry} company targeting ${companyInfo?.targetAudience || 'general audience'}. 
          Make it engaging and actionable. Include a title for this section.`
        }
      ]);

      console.log(`Generated content for section ${config.sectionNumber}:`, response.substring(0, 100) + '...');

      // Extract title and content
      const lines = response.split('\n').filter(line => line.trim());
      const title = lines[0].replace(/^#*\s*/, ''); // Remove any markdown heading symbols
      const content = lines.slice(1).join('\n').trim();

      console.log(`Extracted title for section ${config.sectionNumber}:`, title);

      // Generate image for this section
      const imagePrompt = `Create a modern, professional abstract image representing ${companyInfo?.industry} concepts. The image should be minimalist and symbolic, focusing on geometric shapes, gradients, or abstract patterns. Do not include any text, letters, numbers, or human figures. Use a professional color palette suitable for ${companyInfo?.industry}. The image should convey the concept of ${title} through abstract visual elements only, such as flowing lines, interconnected shapes, or dynamic compositions. Make it suitable for a business newsletter background.`;
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

      sections.push({
        title,
        content,
        imageUrl,
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
) {
  try {
    console.log('Starting newsletter generation for:', {
      newsletterId,
      customPrompt
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate sections using OpenAI
    const sections = await generateSectionsWithOpenAI(
      openai,
      customPrompt,
      companyInfo
    );

    return sections;
  } catch (error) {
    console.error('Error generating newsletter:', error);
    throw error;
  }
}

interface NewsletterSectionContent {
  title: string;
  content: string;
  imageUrl?: string;
}

export function formatNewsletterHtml(sections: NewsletterSectionContent[]): string {
  const sectionHtml = sections.map(section => `
    <div class="section">
      <h2>${section.title}</h2>
      <div class="content">
        ${section.content}
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body>
        ${sectionHtml}
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

export function validateEmailList(emails: string[]): boolean {
  return emails.every(email => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  });
}
