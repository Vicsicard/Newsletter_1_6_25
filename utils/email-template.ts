interface EmailTemplateProps {
  subject: string;
  sections: Array<{
    title: string;
    content: string;
    imageUrl?: string;
  }>;
}

export function generateEmailHTML({
  subject,
  sections
}: EmailTemplateProps): string {
  console.log('Generating email template for:', { subject, sectionsCount: sections.length });

  const sectionsHtml = sections.map((section, index) => {
    console.log(`Processing section ${index + 1}:`, {
      title: section.title,
      hasImage: !!section.imageUrl,
      contentLength: section.content.length
    });

    return `
      <section style="
        margin-bottom: 30px;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      ">
        <h2 style="
          color: #1a56db;
          margin-bottom: 15px;
          font-size: 20px;
          font-weight: 600;
          line-height: 1.4;
        ">
          ${section.title}
        </h2>
        ${section.imageUrl ? `
          <img src="${section.imageUrl}" 
            alt="${section.title}" 
            style="
              max-width: 100%;
              height: auto;
              margin: 15px 0;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            "
          />
        ` : ''}
        <div style="
          color: #374151;
          font-size: 16px;
          line-height: 1.6;
          margin-top: 15px;
        ">
          ${section.content.split('\n').map(paragraph => 
            paragraph.trim() ? `<p style="margin: 0 0 15px 0;">${paragraph}</p>` : ''
          ).join('')}
        </div>
      </section>
    `;
  }).join('');

  const template = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>${subject}</title>
      </head>
      <body style="
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f3f4f6;
      ">
        <!-- Preheader Text (hidden) -->
        <div style="display: none; max-height: 0px; overflow: hidden;">
          ${subject}
        </div>
        
        <!-- Main Container -->
        <div style="
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        ">
          <!-- Header -->
          <header style="
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          ">
            <h1 style="
              color: #1a56db;
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            ">
              ${subject}
            </h1>
          </header>

          <!-- Content -->
          ${sectionsHtml}

          <!-- Footer -->
          <footer style="
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            color: #6b7280;
            font-size: 14px;
          ">
            <p style="margin: 0;">
              This email was sent by the newsletter system.
            </p>
          </footer>
        </div>
      </body>
    </html>
  `;

  console.log('Generated HTML length:', template.length);
  return template;
}

export function generatePlainText(content: string): string {
  // Remove HTML tags and convert to plain text
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
}

export function generateUnsubscribeUrl(subscriberId: string, companyId: string): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  return `${baseUrl}/unsubscribe?sid=${subscriberId}&cid=${companyId}`
}

import { NewsletterSection } from '@/src/types';

export function formatNewsletterContent(sections: NewsletterSection[]): string {
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Newsletter</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .section {
          margin-bottom: 30px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 5px;
        }
        .section-title {
          font-size: 24px;
          color: #2c3e50;
          margin-bottom: 15px;
        }
        .section-content {
          font-size: 16px;
        }
        .section-image {
          max-width: 100%;
          height: auto;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
  `;

  sections.forEach((section) => {
    htmlContent += `
      <div class="section">
        ${section.title ? `<h2 class="section-title">${section.title}</h2>` : ''}
        ${section.content ? `<div class="section-content">${section.content}</div>` : ''}
        ${section.image_url ? `<img class="section-image" src="${section.image_url}" alt="${section.title || 'Newsletter section image'}" />` : ''}
      </div>
    `;
  });

  htmlContent += `
    </body>
    </html>
  `;

  return htmlContent;
}
