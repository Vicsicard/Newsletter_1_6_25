import { PostgrestQueryBuilder, SupabaseClient } from '@supabase/supabase-js';

interface MockQueryBuilder<T> extends PostgrestQueryBuilder<T> {
  setMockData(data: any): void;
  setMockError(error: Error): void;
}

class MockQuery<T> implements Partial<PostgrestQueryBuilder<T>> {
  private mockData: any = null;
  private mockError: Error | null = null;
  private insertData: any = null;

  constructor(private table: string) {}

  setMockData(data: any) {
    this.mockData = data;
  }

  setMockError(error: Error) {
    this.mockError = error;
  }

  select(columns?: string) {
    return this;
  }

  eq(column: string, value: any) {
    return this;
  }

  single() {
    return this;
  }

  insert(data: any) {
    this.insertData = data;
    return this;
  }

  update(data: any) {
    return this;
  }

  async then(resolve: (value: any) => void, reject: (error: any) => void) {
    if (this.mockError) {
      reject({ error: this.mockError });
    } else {
      if (this.insertData) {
        // For insert operations, return the inserted data
        resolve({
          data: {
            ...this.insertData,
            id: 'test-id'
          },
          error: null
        });
      } else {
        // For select operations, return the mock data
        resolve({
          data: this.mockData?.[0] || null,
          error: null
        });
      }
    }
  }
}

class MockSupabaseClient {
  private mockData: Record<string, any> = {};
  private mockErrors: Record<string, Error> = {};

  from<T = any>(table: string): MockQueryBuilder<T> {
    const queryBuilder = new MockQuery<T>(table);
    if (this.mockData[table]) {
      queryBuilder.setMockData(this.mockData[table]);
    }
    if (this.mockErrors[table]) {
      queryBuilder.setMockError(this.mockErrors[table]);
    }
    return queryBuilder as unknown as MockQueryBuilder<T>;
  }

  setMockData(table: string, data: any) {
    this.mockData[table] = data;
  }

  setMockError(table: string, error: Error) {
    this.mockErrors[table] = error;
  }
}

export const createMockSupabaseClient = (): SupabaseClient => {
  return new MockSupabaseClient() as unknown as SupabaseClient;
};
