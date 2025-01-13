import { OpenAI } from 'openai';
import { Logger } from '../src/utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';

export function createMockQueueItem(overrides = {}) {
  return {
    id: 'test-queue-item-id',
    newsletter_id: 'test-newsletter-id',
    section_type: 'welcome',
    section_number: 1,
    title: null,
    content: null,
    image_url: null,
    status: 'pending',
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

export function createMockNewsletter(overrides = {}) {
  return {
    id: 'test-newsletter-id',
    company_id: 'test-company-id',
    title: 'Test Newsletter',
    description: 'A test newsletter',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

export function createMockCompany(overrides = {}) {
  return {
    id: 'test-company-id',
    company_name: 'Test Company',
    industry: 'Technology',
    target_audience: 'Tech professionals',
    tone: 'Professional',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

export function createMockOpenAI(overrides = {}) {
  return {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Generated content for test'
              }
            }
          ]
        })
      }
    },
    ...overrides
  } as unknown as OpenAI;
}

export function createMockLogger() {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null })
  } as unknown as SupabaseClient;

  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    component: 'TestComponent',
    supabase: mockSupabase
  } as unknown as Logger;
}
