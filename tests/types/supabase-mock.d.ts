import { PostgrestQueryBuilder, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';

declare module '@supabase/supabase-js' {
  interface PostgrestQueryBuilder<T> {
    setMockData(data: T | T[]): void;
    setMockError(error: Error): void;
  }

  interface SupabaseClient<Database> {
    setMockData(table: string, data: any): void;
    setMockError(table: string, error: Error): void;
  }
}
