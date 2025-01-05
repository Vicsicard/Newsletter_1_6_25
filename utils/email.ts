import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { getSupabaseAdmin } from '@/utils/supabase-admin';
import { APIError } from '@/utils/errors';
import { 
  Contact, 
  EmailContact,
  NewsletterStatus,
  NewsletterDraftStatus,
  NewsletterContactStatus 
} from '@/types/email';

// Brevo API types
interface BrevoEmailAddress {
  email: string;
  name?: string;
}

interface BrevoEmailRequest {
  sender: BrevoEmailAddress;
  to: BrevoEmailAddress[];
  subject: string;
  htmlContent: string;
  headers?: Record<string, string>;
}

interface BrevoEmailResponse {
  messageId: string;
}

interface BrevoErrorResponse {
  code: string;
  message: string;
}

interface EmailResult {
  messageId: string;
  sent_at: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3';

// Send a single email using Brevo REST API
async function sendBrevoEmail(request: BrevoEmailRequest): Promise<BrevoEmailResponse> {
  // Validate required environment variables
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL || !process.env.BREVO_SENDER_NAME) {
    throw new Error('Missing required Brevo environment variables');
  }

  const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json() as BrevoErrorResponse;
    throw new APIError(`Brevo API error: ${error.message}`, response.status);
  }

  return response.json();
}

// Validate email format
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Send a single email using Brevo API
export async function sendEmail(
  to: EmailContact,
  subject: string,
  htmlContent: string
): Promise<EmailResult> {
  if (!validateEmail(to.email)) {
    throw new APIError(`Invalid email format: ${to.email}`, 400);
  }

  const request: BrevoEmailRequest = {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL!,
      name: process.env.BREVO_SENDER_NAME
    },
    to: [{
      email: to.email,
      name: to.name
    }],
    subject,
    htmlContent
  };

  try {
    const response = await sendBrevoEmail(request);
    return {
      messageId: response.messageId,
      sent_at: new Date().toISOString()
    };
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Failed to send email',
      500
    );
  }
}
