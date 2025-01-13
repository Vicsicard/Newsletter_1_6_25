import { Database } from '../../types/supabase';

type QueueItem = Database['public']['Tables']['newsletter_generation_queue']['Row'];
type Newsletter = Database['public']['Tables']['newsletters']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];
type NewsletterSection = Database['public']['Tables']['newsletter_sections']['Row'];
type NewsletterSectionType = {
  id: string;
  section_type: string;
  display_name: string;
  prompt_template: string;
  section_number: number;
  is_required: boolean;
  is_active: boolean;
  company_id: string | null;
  created_at: string;
  updated_at: string;
};

export const createTestData = {
  newsletter: (overrides: Partial<Newsletter> = {}): Newsletter => ({
    id: 'test-newsletter-id',
    company_id: 'test-company-id',
    subject: 'Test Newsletter',
    status: 'draft',
    draft_status: 'pending',
    sent_count: 0,
    failed_count: 0,
    last_sent_status: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  company: (overrides: Partial<Company> = {}): Company => ({
    id: 'test-company-id',
    company_name: 'Test Company',
    industry: 'Technology',
    target_audience: 'Developers',
    audience_description: 'Software developers and engineers',
    contact_email: 'test@example.com',
    contact_name: 'John Doe',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  sectionType: (overrides: Partial<NewsletterSectionType> = {}): NewsletterSectionType => ({
    id: 'test-section-type-id',
    section_type: 'welcome',
    display_name: 'Welcome Section',
    prompt_template: 'Write a welcome section',
    section_number: 1,
    is_required: true,
    is_active: true,
    company_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  queueItem: (overrides: Partial<QueueItem> = {}): QueueItem => ({
    id: 'test-queue-item-id',
    newsletter_id: 'test-newsletter-id',
    section_type: 'welcome',
    section_number: 1,
    status: 'pending',
    attempts: 0,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  newsletterSection: (overrides: Partial<NewsletterSection> = {}): NewsletterSection => ({
    id: 'test-section-id',
    newsletter_id: 'test-newsletter-id',
    section_type: 'welcome',
    section_number: 1,
    content: 'Test content',
    status: 'pending',
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  })
};
