import OpenAI from 'openai';
import type { Database } from '@/types/database';
import { NewsletterWithCompany, NewsletterSection, NewsletterSectionStatus } from '@/types/email';
import { getSupabaseAdmin } from './supabase-admin';
import { APIError } from './errors';
import { generateImage } from './image';

// Use Supabase types
type NewsletterSectionInsert = Database['public']['Tables']['newsletter_sections']['Insert'];
type NewsletterSectionRow = Database['public']['Tables']['newsletter_sections']['Row'];

interface GenerateOptions {
  companyName: string;
  industry: string;
  targetAudience?: string;
  audienceDescription?: string;
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function callOpenAIWithRetry(messages: any[], retries = 3, delay = 2000): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }
      return response;
    } catch (error: any) {
      console.error(`OpenAI API attempt ${i + 1} failed:`, error);
      
      if (error?.status === 429) { // Rate limit error
        const waitTime = delay * Math.pow(2, i); // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (i === retries - 1) { // Last attempt
        throw error;
      }
      
      // For other errors, wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed after all retry attempts');
}

export async function generateNewsletter(
  newsletterId: string,
  customPrompt?: string,
  options?: GenerateOptions
): Promise<NewsletterSection[]> {
  const supabaseAdmin = getSupabaseAdmin();
  
  try {
    console.log('Starting newsletter generation for:', { newsletterId, customPrompt });

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

    // Generate sections using OpenAI
    const sectionPrompts = [
      customPrompt || "Write about current industry trends and innovations",
      "Provide practical tips and best practices",
      "Share success stories or case studies"
    ];

    console.log('Starting section generation with prompts:', sectionPrompts);
    const sections: NewsletterSectionInsert[] = [];

    for (let i = 0; i < sectionPrompts.length; i++) {
      const prompt = sectionPrompts[i];
      console.log(`Generating section ${i + 1} with prompt:`, prompt);
      
      try {
        const response = await callOpenAIWithRetry([{
          role: "system",
          content: "You are a professional newsletter writer specializing in business content."
        }, {
          role: "user",
          content: `${prompt} for ${options.companyName}, a ${options.industry} company targeting ${options.targetAudience || 'general audience'}. 
          Make it engaging and actionable. Include a title for this section.`
        }]);

        console.log(`Generated content for section ${i + 1}:`, response.substring(0, 100) + '...');

        // Extract title and content
        const lines = response.split('\n').filter(line => line.trim());
        const title = lines[0].replace(/^#*\s*/, ''); // Remove any markdown heading symbols
        const content = lines.slice(1).join('\n').trim();

        console.log(`Extracted title for section ${i + 1}:`, title);

        // Generate image for this section
        const imagePrompt = `Create a modern, professional abstract image representing ${options.industry} concepts. The image should be minimalist and symbolic, focusing on geometric shapes, gradients, or abstract patterns. Do not include any text, letters, numbers, or human figures. Use a professional color palette suitable for ${options.industry}. The image should convey the concept of ${title} through abstract visual elements only, such as flowing lines, interconnected shapes, or dynamic compositions. Make it suitable for a business newsletter background.`;
        console.log(`Generating image for section ${i + 1} with prompt:`, imagePrompt);
        
        try {
          const imageUrl = await generateImage(imagePrompt);
          console.log(`Generated image URL for section ${i + 1}:`, imageUrl);

          sections.push({
            newsletter_id: newsletterId,
            section_number: i + 1,
            title,
            content,
            image_prompt: imagePrompt,
            image_url: imageUrl,
            status: 'active' as NewsletterSectionStatus,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        } catch (imageError) {
          console.error(`Error generating image for section ${i + 1}:`, imageError);
          // Continue without image if image generation fails
          sections.push({
            newsletter_id: newsletterId,
            section_number: i + 1,
            title,
            content,
            image_prompt: imagePrompt,
            image_url: null,
            status: 'active' as NewsletterSectionStatus,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }

        // Add delay between sections to avoid rate limits
        if (i < sectionPrompts.length - 1) {
          console.log('Waiting before generating next section...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (sectionError) {
        console.error(`Error generating section ${i + 1}:`, sectionError);
        throw sectionError;
      }
    }

    console.log('Generated all sections:', sections);

    // Insert sections into database and get back the rows with IDs
    console.log('Inserting sections into database...');
    const { data, error } = await supabaseAdmin
      .from('newsletter_sections')
      .insert(sections)
      .select()
      .returns<NewsletterSection[]>();

    if (error || !data) {
      console.error('Error inserting newsletter sections into database:', error);
      throw new APIError('Failed to insert newsletter sections into database', 500);
    }

    console.log('Successfully inserted sections into database:', data);

    return data;

  } catch (error) {
    console.error('Error generating newsletter:', error);
    throw error instanceof APIError ? error : new APIError('Failed to generate newsletter', 500);
  }
}

export function validateEmailList(emails: string[]) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emails.every(email => emailRegex.test(email));
}

export function formatNewsletterHtml(content: string) {
  // Convert markdown-like content to HTML
  let html = content
    .split('\n')
    .map(line => {
      // Headers
      if (line.startsWith('# ')) {
        return `<h1>${line.slice(2)}</h1>`;
      }
      if (line.startsWith('## ')) {
        return `<h2>${line.slice(3)}</h2>`;
      }
      if (line.startsWith('### ')) {
        return `<h3>${line.slice(4)}</h3>`;
      }
      
      // Lists
      if (line.startsWith('- ')) {
        return `<li>${line.slice(2)}</li>`;
      }
      
      // Paragraphs
      if (line.trim()) {
        return `<p>${line}</p>`;
      }
      
      return '';
    })
    .join('\n');

  // Wrap lists in <ul> tags
  html = html.replace(/<li>.*?<\/li>/g, match => `<ul>${match}</ul>`);
  
  return html;
}
