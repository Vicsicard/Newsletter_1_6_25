// Email Types
import { Database } from './supabase';

type Contact = Database['public']['Tables']['contacts']['Row'];
type NewsletterContact = Database['public']['Tables']['newsletter_contacts']['Row'];
type Newsletter = Database['public']['Tables']['newsletters']['Row'];

export interface EmailContact {
  email: string;
  name?: string;
}

export interface BulkEmailResult {
  successful: Array<{
    email: string;
    messageId: string;
  }>;
  failed: Array<{
    email: string;
    error: string;
  }>;
}

export interface EmailApiResponse {
  success: boolean;
  message: string;
  data?: {
    messageId?: string;
    results?: BulkEmailResult;
  };
  error?: {
    type: string;
    message: string;
  };
}

export interface NewsletterEmailData {
  subject: string;
  sections: Array<{
    title: string;
    content: string;
    image_url?: string;
  }>;
  contacts: Array<{
    newsletterContactId: string;
    contact: Contact;
  }>;
}

export interface NewsletterSendResult extends BulkEmailResult {
  newsletterId: string;
  totalSent: number;
  totalFailed: number;
  updatedContacts: NewsletterContact[];
}

export type NewsletterContactStatus = 'pending' | 'sent' | 'failed';
export type NewsletterStatus = Database['public']['Tables']['newsletters']['Row']['status'];
