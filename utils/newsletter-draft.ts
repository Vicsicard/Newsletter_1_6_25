import { NewsletterSectionContent, SendNewsletterDraftResult } from '@/types/email';
import { getSupabaseAdmin } from './supabase-admin';
import { sendEmail } from './email';

export async function sendNewsletterDraft(
  newsletterId: string,
  recipientEmail: string,
  sections: NewsletterSectionContent[]
): Promise<SendNewsletterDraftResult> {
  try {
    // Get newsletter details
    const supabase = getSupabaseAdmin();
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .select(`
        *,
        company:companies (
          company_name,
          industry
        )
      `)
      .eq('id', newsletterId)
      .single();

    if (newsletterError || !newsletter) {
      console.error('Failed to fetch newsletter:', newsletterError);
      return { success: false, error: 'Failed to fetch newsletter details' };
    }

    // Format HTML content
    const htmlContent = formatNewsletterHtml(sections);

    // Send email
    await sendEmail(
      { email: recipientEmail },
      `[DRAFT] ${newsletter.subject}`,
      htmlContent
    );

    // Update draft status
    const { error: updateError } = await supabase
      .from('newsletters')
      .update({
        draft_status: 'draft_sent'
      })
      .eq('id', newsletterId);

    if (updateError) {
      console.error('Failed to update draft status:', updateError);
      return { success: false, error: 'Failed to update draft status' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending draft:', error);
    return { success: false, error: 'Failed to send draft email' };
  }
}

function formatNewsletterHtml(sections: NewsletterSectionContent[]): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        ${sections.map(section => `
          <div class="section">
            <h2>${section.title}</h2>
            ${section.content}
            ${section.image_url ? `<img src="${section.image_url}" alt="${section.title}">` : ''}
          </div>
        `).join('')}
      </body>
    </html>
  `;
}
