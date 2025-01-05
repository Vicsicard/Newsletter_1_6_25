import { NextRequest, NextResponse } from 'next/server';
import { generateNewsletter } from '@/utils/newsletter';
import { sendNewsletterDraft } from '@/utils/newsletter-draft';
import { getSupabaseAdmin } from '@/utils/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get newsletter details
    const supabase = getSupabaseAdmin();
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .select(`
        *,
        company:companies (
          company_name,
          industry,
          target_audience,
          audience_description
        )
      `)
      .eq('id', params.id)
      .single();

    if (newsletterError || !newsletter) {
      console.error('Failed to fetch newsletter:', newsletterError);
      return NextResponse.json(
        { success: false },
        { status: 404 }
      );
    }

    // Generate newsletter sections
    const sections = await generateNewsletter(
      params.id,
      undefined,
      {
        companyName: newsletter.company.company_name,
        industry: newsletter.company.industry,
        targetAudience: newsletter.company.target_audience || undefined,
        audienceDescription: newsletter.company.audience_description || undefined
      }
    );

    // Send draft to recipient
    if (newsletter.draft_recipient_email) {
      const result = await sendNewsletterDraft(
        params.id,
        newsletter.draft_recipient_email,
        sections
      );

      if (!result.success) {
        console.error('Failed to send draft:', result.error);
        return NextResponse.json(
          { success: false },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error generating newsletter:', error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
