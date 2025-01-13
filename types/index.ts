export interface Company {
  id: string;
  company_name: string;
  industry: string;
  contact_email: string;
  website_url?: string;
  phone_number?: string;
  target_audience?: string;
  audience_description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Newsletter {
  id: string;
  company_id: string;
  title: string;
  status: 'draft' | 'draft_sent' | 'pending_contacts' | 'ready_to_send' | 'sending' | 'sent' | 'failed';
  draft_status: 'pending' | 'sent' | 'failed';
  draft_recipient_email: string;
  draft_sent_at?: string;
  created_at: string;
  updated_at?: string;
  company?: Company;
  newsletter_sections?: NewsletterSection[];
  newsletter_contacts?: NewsletterContact[];
  compiled_newsletter?: CompiledNewsletter;
}

export interface NewsletterSection {
  id?: string;
  newsletter_id: string;
  section_number: number;
  title: string;
  content: string;
  image_prompt?: string;
  image_url?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  image_generations?: ImageGenerationHistory[];
}

export interface Contact {
  id: string;
  company_id: string;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed';
  created_at: string;
}

export interface NewsletterContact {
  id: string;
  newsletter_id: string;
  contact_id: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  created_at: string;
  contact?: Contact;
}

export interface CompiledNewsletter {
  id: string;
  newsletter_id: string;
  compiled_content: string;
  compiled_status: 'pending' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
}

export interface ImageGenerationHistory {
  id: string;
  newsletter_section_id: string;
  prompt: string;
  image_url?: string;
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface CsvUpload {
  id: string;
  company_id: string;
  filename: string;
  status: 'pending' | 'processed' | 'failed';
  error_message?: string;
  created_at: string;
}

export interface IndustryInsight {
  id: string;
  industry: string;
  content: string;
  created_at: string;
}

export interface OnboardingResponse {
  company: Company;
  contacts?: Contact[];
  error?: string;
}

export * from './api';
export * from './database';
export * from './email';
export * from './form';
export * from './modal';
export * from './newsletter';
export * from './supabase';
export * from './result';
