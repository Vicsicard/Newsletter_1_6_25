import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabase-admin';
import { sendEmail } from '@/utils/email';
import { generateNewsletter } from '@/utils/newsletter';
import { formatNewsletterContent } from '@/utils/email-template';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();
  const { id } = params;

  try {
    const body = await request.json();
    const { recipientEmail } = body;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    // Get newsletter and its sections
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .select('*, newsletter_sections(*)')
      .eq('id', id)
      .single();

    if (newsletterError) {
      console.error('Error fetching newsletter:', newsletterError);
      return NextResponse.json(
        { error: 'Failed to fetch newsletter' },
        { status: 500 }
      );
    }

    // Format newsletter content
    const sections = newsletter.newsletter_sections
      .sort((a: any, b: any) => a.section_number - b.section_number)
      .map((section: any) => ({
        title: section.title,
        content: section.content,
        imageUrl: section.image_url
      }));

    const htmlContent = formatNewsletterContent(sections);

    // Send email
    const messageId = await sendEmail(
      { email: recipientEmail, name: recipientEmail },
      newsletter.subject || 'Your Newsletter',
      htmlContent
    );

    // Update newsletter status
    const { error: updateError } = await supabase
      .from('newsletters')
      .update({
        draft_status: 'sent',
        draft_recipient_email: recipientEmail,
        draft_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating newsletter status:', updateError);
      // Continue since email was sent successfully
    }

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    console.error('Error sending draft:', error);
    return NextResponse.json(
      { error: 'Failed to send draft newsletter' },
      { status: 500 }
    );
  }
}
