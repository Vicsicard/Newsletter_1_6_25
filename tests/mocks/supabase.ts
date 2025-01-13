import { SupabaseClient, PostgrestResponse, PostgrestSingleResponse, PostgrestQueryBuilder } from '@supabase/supabase-js';
import { Database } from '../../src/types/database';
import { jest } from '@jest/globals';

export type MockSupabaseClient = jest.Mocked<SupabaseClient<Database>>;

export interface MockResponse<T> {
  data: T | null;
  error: Error | null;
  count: null;
  status: number;
  statusText: string;
}

export class MockPostgrestQueryBuilder<T> implements PostgrestQueryBuilder<T> {
  private mockData: T | T[] | null = null;
  private mockError: Error | null = null;

  setMockData(data: T | T[]) {
    this.mockData = data;
    return this;
  }

  setMockError(error: Error) {
    this.mockError = error;
    return this;
  }

  select(columns?: string) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  insert(values: T | T[], options?: { returning?: boolean }): PostgrestResponse<T> {
    if (this.mockError) {
      return Promise.resolve({ data: null, error: this.mockError, count: null, status: 500, statusText: 'Error' });
    }
    return Promise.resolve({ data: values as any, error: null, count: null, status: 200, statusText: 'OK' });
  }

  upsert(values: T | T[], options?: { returning?: boolean; onConflict?: string }): PostgrestResponse<T> {
    if (this.mockError) {
      return Promise.resolve({ data: null, error: this.mockError, count: null, status: 500, statusText: 'Error' });
    }
    return Promise.resolve({ data: values as any, error: null, count: null, status: 200, statusText: 'OK' });
  }

  update(values: Partial<T>, options?: { returning?: boolean }): PostgrestResponse<T> {
    if (this.mockError) {
      return Promise.resolve({ data: null, error: this.mockError, count: null, status: 500, statusText: 'Error' });
    }
    return Promise.resolve({ data: values as any, error: null, count: null, status: 200, statusText: 'OK' });
  }

  delete(options?: { returning?: boolean }): PostgrestResponse<T> {
    if (this.mockError) {
      return Promise.resolve({ data: null, error: this.mockError, count: null, status: 500, statusText: 'Error' });
    }
    return Promise.resolve({ data: null, error: null, count: null, status: 200, statusText: 'OK' });
  }

  contains(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  containedBy(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  overlaps(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  eq(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  neq(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  gt(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  gte(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  lt(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  lte(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  like(column: string, pattern: string) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  ilike(column: string, pattern: string) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  is(column: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  in(column: string, values: any[]) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  filter(column: string, operator: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  match(query: Partial<Record<string, any>>) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  not(column: string, operator: string, value: any) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  or(filters: string, options?: { foreignTable?: string }) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  limit(count: number, options?: { foreignTable?: string }) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  range(from: number, to: number, options?: { foreignTable?: string }) {
    return this as unknown as PostgrestQueryBuilder<T>;
  }

  single(): PostgrestSingleResponse<T> {
    if (this.mockError) {
      return Promise.resolve({ data: null, error: this.mockError, count: null, status: 500, statusText: 'Error' });
    }
    return Promise.resolve({ data: Array.isArray(this.mockData) ? this.mockData[0] : this.mockData, error: null, count: null, status: 200, statusText: 'OK' });
  }

  maybeSingle(): PostgrestSingleResponse<T | null> {
    return this.single();
  }

  then(): PostgrestResponse<T> {
    if (this.mockError) {
      return Promise.resolve({ data: null, error: this.mockError, count: null, status: 500, statusText: 'Error' });
    }
    return Promise.resolve({ data: this.mockData, error: null, count: null, status: 200, statusText: 'OK' });
  }
}

export class MockSupabaseClient implements Partial<SupabaseClient<Database>> {
  private mockData: Record<string, any> = {};
  private mockError: Error | null = null;

  setMockData(data: any) {
    this.mockData = data;
  }

  setMockError(error: Error | null) {
    this.mockError = error;
  }

  from<T extends keyof Database['public']['Tables']>(table: T): PostgrestQueryBuilder<Database['public'], Database['public']['Tables'][T]> {
    return {
      select: () => {
        return {
          eq: () => {
            return {
              single: () => {
                if (this.mockError) {
                  return Promise.resolve({
                    data: null,
                    error: this.mockError,
                    count: null,
                    status: 500,
                    statusText: 'Error'
                  } as PostgrestSingleResponse<any>);
                }
                return Promise.resolve({
                  data: this.mockData,
                  error: null,
                  count: null,
                  status: 200,
                  statusText: 'OK'
                } as PostgrestSingleResponse<any>);
              },
              update: (data: any) => {
                if (this.mockError) {
                  return Promise.resolve({
                    data: null,
                    error: this.mockError,
                    count: null,
                    status: 500,
                    statusText: 'Error'
                  } as PostgrestResponse<any>);
                }
                return Promise.resolve({
                  data: { ...this.mockData, ...data },
                  error: null,
                  count: null,
                  status: 200,
                  statusText: 'OK'
                } as PostgrestResponse<any>);
              }
            };
          }
        };
      },
      insert: () => {
        if (this.mockError) {
          return Promise.resolve({
            data: null,
            error: this.mockError,
            count: null,
            status: 500,
            statusText: 'Error'
          } as PostgrestResponse<any>);
        }
        return Promise.resolve({
          data: this.mockData,
          error: null,
          count: null,
          status: 200,
          statusText: 'OK'
        } as PostgrestResponse<any>);
      }
    } as unknown as PostgrestQueryBuilder<Database['public'], Database['public']['Tables'][T]>;
  }

  auth = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    refreshSession: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn()
  };
}

export function createMockSupabaseClient(): jest.Mocked<SupabaseClient<Database>> {
  return new MockSupabaseClient() as unknown as jest.Mocked<SupabaseClient<Database>>;
}
