import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabase-admin';
import { sendEmail } from '@/utils/email';
import { NewsletterSectionContent, NewsletterContactStatus, NewsletterStatus } from '@/types/email';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();

    // Get newsletter and contacts
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .select(`
        *,
        newsletter_sections (
          title,
          content,
          image_url,
          section_number
        ),
        newsletter_contacts (
          contact:contacts (
            email,
            name
          ),
          status
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

    // Format sections
    const sections = newsletter.newsletter_sections
      .sort((a: any, b: any) => a.section_number - b.section_number)
      .map((section: any) => ({
        title: section.title,
        content: section.content,
        image_url: section.image_url || undefined
      }));

    // Format HTML content
    const htmlContent = formatNewsletterHtml(sections);

    // Send to each contact
    const sendPromises = newsletter.newsletter_contacts
      .filter((nc: any) => nc.status === 'pending')
      .map(async (nc: any) => {
        try {
          const result = await sendEmail(
            {
              email: nc.contact.email,
              name: nc.contact.name || undefined
            },
            newsletter.subject,
            htmlContent
          );

          // Update contact status
          await supabase
            .from('newsletter_contacts')
            .update({ status: 'sent' as NewsletterContactStatus })
            .eq('newsletter_id', params.id)
            .eq('contact_id', nc.contact.id);

          return { success: true, email: nc.contact.email };
        } catch (error) {
          console.error(`Failed to send to ${nc.contact.email}:`, error);
          
          // Update contact status
          await supabase
            .from('newsletter_contacts')
            .update({ status: 'failed' as NewsletterContactStatus })
            .eq('newsletter_id', params.id)
            .eq('contact_id', nc.contact.id);

          return { success: false, email: nc.contact.email, error };
        }
      });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Update newsletter status
    await supabase
      .from('newsletters')
      .update({
        status: failed.length === 0 ? 'published' : 'draft' as NewsletterStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    return NextResponse.json({
      success: true,
      sent: successful.length,
      failed: failed.length
    });
  } catch (error) {
    console.error('Error sending newsletter:', error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
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
