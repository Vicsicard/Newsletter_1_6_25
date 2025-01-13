import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';

type Tables = Database['public']['Tables'];
type DbResult<T> = {
  data: T;
  error: null;
} | {
  data: null;
  error: {
    message: string;
    details: string;
    hint: string;
    code: string;
  };
};

type MockSupabaseQuery = {
  eq: jest.Mock;
  single: jest.Mock;
  order: jest.Mock;
  execute: jest.Mock;
};

export const createMockSupabaseClient = () => {
  const mockQuery: MockSupabaseQuery = {
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  const mockBuilder = {
    select: jest.fn(() => mockQuery),
    insert: jest.fn(() => mockQuery),
    update: jest.fn(() => mockQuery),
    delete: jest.fn(() => mockQuery),
  };

  const mockClient = {
    from: jest.fn().mockReturnValue(mockBuilder),
  } as unknown as jest.Mocked<SupabaseClient<Database>>;

  return {
    client: mockClient,
    query: mockQuery,
    builder: mockBuilder,
  };
};

export const createMockData = {
  company: (override = {}): Tables['companies']['Row'] => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    company_name: 'Test Company Inc.',
    industry: 'Technology',
    target_audience: null,
    audience_description: null,
    contact_email: 'test@example.com',
    contact_name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...override
  }),

  newsletter: (override = {}): Tables['newsletters']['Row'] => ({
    id: '123e4567-e89b-12d3-a456-426614174001',
    company_id: '123e4567-e89b-12d3-a456-426614174000',
    subject: 'Test Newsletter',
    status: 'draft',
    draft_status: 'draft',
    sent_count: 0,
    failed_count: 0,
    last_sent_status: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...override
  }),

  newsletterSection: (override = {}): Tables['newsletter_sections']['Row'] => ({
    id: '123e4567-e89b-12d3-a456-426614174002',
    newsletter_id: '123e4567-e89b-12d3-a456-426614174001',
    section_type: 'welcome',
    section_number: 1,
    content: null,
    status: 'pending',
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...override
  }),

  queueItem: (override = {}): Tables['newsletter_generation_queue']['Row'] => ({
    id: '123e4567-e89b-12d3-a456-426614174003',
    newsletter_id: '123e4567-e89b-12d3-a456-426614174001',
    section_type: 'welcome',
    section_number: 1,
    status: 'pending',
    attempts: 0,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...override
  })
};

export const createMockResponse = {
  success: <T>(data: T): DbResult<T> => ({
    data,
    error: null
  }),

  error: (message: string): DbResult<never> => ({
    data: null,
    error: {
      message,
      details: '',
      hint: '',
      code: 'ERROR'
    }
  })
};
