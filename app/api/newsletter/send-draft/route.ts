import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabase-admin';
import { sendNewsletterDraft } from '@/utils/newsletter-draft';
import { NewsletterSectionContent, NewsletterDraftStatus } from '@/types/email';

if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL || !process.env.BREVO_SENDER_NAME) {
  throw new Error('Missing required Brevo environment variables');
}

// Configure API route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { recipientEmail } = body;

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    // Get newsletter sections
    const supabase = getSupabaseAdmin();
    const { data: sections, error: sectionsError } = await supabase
      .from('newsletter_sections')
      .select('*')
      .eq('newsletter_id', params.id)
      .order('section_number');

    if (sectionsError) {
      console.error('Failed to fetch sections:', sectionsError);
      return NextResponse.json(
        { success: false },
        { status: 500 }
      );
    }

    // Format sections
    const formattedSections: NewsletterSectionContent[] = sections.map(section => ({
      title: section.title,
      content: section.content,
      image_url: section.image_url || undefined
    }));

    // Send draft
    const result = await sendNewsletterDraft(
      params.id,
      recipientEmail,
      formattedSections
    );

    if (!result.success) {
      console.error('Failed to send draft:', result.error);
      return NextResponse.json(
        { success: false },
        { status: 500 }
      );
    }

    // Update newsletter status
    const { error: updateError } = await supabase
      .from('newsletters')
      .update({
        draft_status: 'draft_sent' as NewsletterDraftStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Failed to update newsletter status:', updateError);
      return NextResponse.json(
        { success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending draft:', error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
