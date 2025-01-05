import { NextResponse } from 'next/server';
import { generateNewsletter } from '@/utils/newsletter';
import { getSupabaseAdmin } from '@/utils/supabase-admin';
import { APIError } from '@/utils/errors';

// Configure API route
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  newsletterId: string;
  prompt?: string;
  sections?: {
    title: string;
    content: string;
    image_prompt?: string;
  }[];
}

export async function POST(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const body = await req.json() as GenerateRequest;
    const { newsletterId, prompt, sections } = body;

    if (!newsletterId) {
      throw new APIError('Missing newsletter ID', 400);
    }

    // Verify newsletter exists and belongs to company
    const { data: newsletter, error: newsletterError } = await supabaseAdmin
      .from('newsletters')
      .select(`
        *,
        companies (
          company_name,
          industry,
          target_audience,
          audience_description
        )
      `)
      .eq('id', newsletterId)
      .single();

    if (newsletterError || !newsletter) {
      throw new APIError('Failed to fetch newsletter', 500);
    }

    // If sections are provided, use those instead of generating new ones
    let generatedSections;
    if (sections) {
      // Insert provided sections
      const { error: insertError } = await supabaseAdmin
        .from('newsletter_sections')
        .insert(
          sections.map((section, index) => ({
            newsletter_id: newsletterId,
            section_number: index + 1,
            title: section.title,
            content: section.content,
            image_prompt: section.image_prompt,
            status: 'completed'
          }))
        );

      if (insertError) {
        throw new APIError('Failed to insert sections', 500);
      }

      generatedSections = sections;
    } else {
      // Generate new sections using OpenAI
      generatedSections = await generateNewsletter(
        newsletterId,
        prompt,
        {
          companyName: newsletter.companies.company_name,
          industry: newsletter.companies.industry,
          targetAudience: newsletter.companies.target_audience,
          audienceDescription: newsletter.companies.audience_description
        }
      );
    }

    return NextResponse.json({ sections: generatedSections });
  } catch (error: any) {
    console.error('Error generating newsletter:', error);

    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate newsletter' },
      { status: 500 }
    );
  }
}
