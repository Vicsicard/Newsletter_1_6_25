import { Database } from './database';

// Status types - must match database CHECK constraints exactly
export type NewsletterStatus = 'draft' | 'published' | 'archived';
export type NewsletterDraftStatus = 'draft' | 'draft_sent' | 'pending_contacts' | 'ready_to_send' | 'sending' | 'sent' | 'failed';
export type ContactStatus = 'active' | 'deleted';
export type NewsletterContactStatus = 'pending' | 'sent' | 'failed';
export type NewsletterSectionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type ImageGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type CsvUploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type CompiledNewsletterStatus = 'draft' | 'ready' | 'sent' | 'error';

// Basic types from database
export type Newsletter = Database['public']['Tables']['newsletters']['Row'];
export type NewsletterSection = Database['public']['Tables']['newsletter_sections']['Row'];
export type Contact = Database['public']['Tables']['contacts']['Row'];
export type Company = Database['public']['Tables']['companies']['Row'];
export type NewsletterContact = Database['public']['Tables']['newsletter_contacts']['Row'];

// Extended types with relationships
export type NewsletterWithCompany = Newsletter & {
  company: {
    company_name: string;
    industry: string;
  };
};

export type NewsletterWithSections = Newsletter & {
  newsletter_sections: NewsletterSection[];
};

export type NewsletterWithContacts = Newsletter & {
  newsletter_contacts: Array<{
    contact: Contact;
    status: NewsletterContactStatus;
  }>;
};

export type NewsletterWithAll = Newsletter & {
  company: Company;
  newsletter_sections: NewsletterSection[];
  newsletter_contacts: Array<{
    contact: Contact;
    status: NewsletterContactStatus;
  }>;
};

// Email specific types
export interface EmailContact {
  email: string;
  name?: string;
}

export interface BulkEmailResult {
  successful: Array<{
    email: string;
    messageId: string;
    sent_at: string;
  }>;
  failed: Array<{
    email: string;
    error: string;
    error_message: string;
  }>;
}

// Content types
export interface NewsletterSectionContent {
  title: string;
  content: string;
  image_url?: string;
}

export interface NewsletterEmailData {
  subject: string;
  sections: NewsletterSectionContent[];
}

export interface EmailApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    messageId?: string;
    results?: BulkEmailResult;
  };
}

export interface SendNewsletterDraftResult {
  success: boolean;
  error?: string;
}
