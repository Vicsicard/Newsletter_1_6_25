import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { jest } from '@jest/globals';
import { Database } from '../../types/supabase';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;
type Row<T extends TableName> = Tables[T]['Row'];

class MockPostgrestQueryBuilder<T extends TableName> {
  private mockData: Row<T> | null = null;
  private mockError: Error | null = null;
  private tableName: T;

  constructor(tableName: T) {
    this.tableName = tableName;
  }

  setMockData(data: Row<T>): this {
    this.mockData = data;
    this.mockError = null;
    return this;
  }

  setMockError(error: Error): this {
    this.mockError = error;
    this.mockData = null;
    return this;
  }

  async execute(): Promise<{ data: Row<T> | null; error: Error | null }> {
    return {
      data: this.mockData,
      error: this.mockError
    };
  }

  select(): this {
    return this;
  }

  insert(): this {
    return this;
  }

  update(): this {
    return this;
  }

  eq(_column: string, _value: string): this {
    return this;
  }

  single(): Promise<{ data: Row<T> | null; error: Error | null }> {
    return this.execute();
  }
}

export function createMockSupabase() {
  const client = {
    from: jest.fn((table: TableName) => ({
      select: jest.fn().mockReturnValue(new MockPostgrestQueryBuilder(table)),
      insert: jest.fn().mockReturnValue(new MockPostgrestQueryBuilder(table)),
      update: jest.fn().mockReturnValue(new MockPostgrestQueryBuilder(table)),
      eq: jest.fn().mockReturnValue(new MockPostgrestQueryBuilder(table)),
      single: jest.fn().mockReturnValue(new MockPostgrestQueryBuilder(table))
    }))
  } as unknown as SupabaseClient<Database>;

  const createMockQueryBuilder = <T extends TableName>(tableName: T) => {
    return new MockPostgrestQueryBuilder(tableName);
  };

  return { client, createMockQueryBuilder };
}
