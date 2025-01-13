import { OpenAI } from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '@/src/utils/logger';
import { NewsletterGenerator } from '@/src/utils/newsletter-generator';
import { Result } from '@/utils/types';
import { Database } from '@/types/database';
import { ChatCompletion } from 'openai/resources/chat/completions';

export type MockOpenAIResponse = ChatCompletion & {
  _request_id?: string | null;
};

export type MockSupabaseResponse<T = any> = {
  data: T | null;
  error: Error | null;
};

export type MockLoggerResponse = Result<void>;

export type MockNewsletterGeneratorResponse<T = any> = Result<T>;

export interface MockSupabaseQueryBuilder<T> {
  select: () => MockSupabaseQueryBuilder<T>;
  eq: (field: string, value: any) => MockSupabaseQueryBuilder<T>;
  single: () => Promise<MockSupabaseResponse<T>>;
  update: (data: Partial<T>) => MockSupabaseQueryBuilder<T>;
}
