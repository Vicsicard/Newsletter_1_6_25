import { NextResponse } from 'next/server';
import { generateNewsletter } from '@/utils/newsletter';
import { createClient } from '@supabase/supabase-js';
import { APIError } from '@/utils/errors';

// Configure API route
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

interface GenerateRequest {
  newsletterId: string;
  prompt?: string;
  sections?: {
    title: string;
    content: string;
    image_prompt?: string;
    type?: string;
  }[];
}

export async function POST(req: Request) {
  // Initialize Supabase client with environment variables
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json() as GenerateRequest;
    const { newsletterId, prompt, sections } = body;

    if (!newsletterId) {
      throw new APIError('Missing newsletter ID', 400);
    }

    // First, fetch the newsletter
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .select('id, company_id, status, draft_status')
      .eq('id', newsletterId)
      .single();

    if (newsletterError || !newsletter) {
      console.error('Newsletter fetch error:', newsletterError);
      throw new APIError('Failed to fetch newsletter', 500);
    }

    // Update newsletter status to generating
    const { error: statusError } = await supabase
      .from('newsletters')
      .update({ 
        status: 'draft',
        draft_status: 'draft' 
      })
      .eq('id', newsletterId);

    if (statusError) {
      console.error('Error updating newsletter status:', statusError);
      throw new APIError('Failed to update newsletter status', 500);
    }

    // Then fetch the company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('company_name, industry, target_audience, audience_description')
      .eq('id', newsletter.company_id)
      .single();

    if (companyError || !company) {
      console.error('Company fetch error:', companyError);
      throw new APIError('Failed to fetch company details', 500);
    }

    // Delete existing sections for this newsletter
    const { error: deleteError } = await supabase
      .from('newsletter_sections')
      .delete()
      .eq('newsletter_id', newsletterId);

    if (deleteError) {
      console.error('Error deleting existing sections:', deleteError);
      throw new APIError('Failed to delete existing sections', 500);
    }

    // If sections are provided, use those
    if (sections) {
      const { error: insertError } = await supabase
        .from('newsletter_sections')
        .insert(
          sections.map((section, index) => ({
            newsletter_id: newsletterId,
            section_number: index + 1,
            section_type: section.type || 'welcome',
            title: section.title,
            content: section.content,
            image_prompt: section.image_prompt,
            status: 'completed'
          }))
        );

      if (insertError) {
        console.error('Section insert error:', insertError);
        throw new APIError('Failed to insert sections', 500);
      }

      return NextResponse.json({ sections });
    }

    // Otherwise generate new sections
    const generatedSections = await generateNewsletter(
      newsletterId,
      prompt,
      {
        companyName: company.company_name,
        industry: company.industry,
        targetAudience: company.target_audience,
        audienceDescription: company.audience_description
      }
    );

    // Insert the generated sections
    const { error: insertError } = await supabase
      .from('newsletter_sections')
      .insert(
        generatedSections.map((section, index) => ({
          newsletter_id: newsletterId,
          section_number: index + 1,
          section_type: 'welcome',
          title: section.title,
          content: section.content,
          image_prompt: section.image_prompt,
          image_url: section.imageUrl,
          status: 'completed'
        }))
      );

    if (insertError) {
      console.error('Error inserting generated sections:', insertError);
      throw new APIError('Failed to save generated sections', 500);
    }

    // Update newsletter status to draft
    const { error: statusUpdateError } = await supabase
      .from('newsletters')
      .update({ draft_status: 'draft' })
      .eq('id', newsletterId);

    if (statusUpdateError) {
      console.error('Error updating newsletter status:', statusUpdateError);
      throw new APIError('Failed to update newsletter status', 500);
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
