import { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestBuilder, PostgrestFilterBuilder, PostgrestResponse } from '@supabase/postgrest-js';
import { Database } from '../../types/database';

// Types for mock responses
type PostgrestResponseSuccess<T> = {
  data: T;
  error: null;
  count: number | null;
  status: number;
  statusText: string;
};

type PostgrestResponseError = {
  data: null;
  error: any;
  count: null;
  status: number;
  statusText: string;
};

type PostgrestSingleResponse<T> = Promise<PostgrestResponseSuccess<T> | PostgrestResponseError>;
type PostgrestArrayResponse<T> = Promise<PostgrestResponseSuccess<T[]> | PostgrestResponseError>;

interface ChainedCall {
  method: string;
  args: any[];
}

// Define table row types for better type safety
interface QueueItem {
  id: string;
  newsletter_id: string;
  section_type: string;
  section_number: number;
  status: string;
  attempts: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface Newsletter {
  id: string;
  newsletter_id: string;
  section_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  company_name: string;
  industry: string;
  target_audience: string;
  audience_description: string;
  contact_email: string;
  contact_name: string;
  website_url: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

interface NewsletterSection {
  id: string;
  newsletter_id: string;
  section_type: string;
  section_number: number;
  content: string;
  status: string;
  error_message: null;
  created_at: string;
  updated_at: string;
}

type TableName = 'newsletter_generation_queue' | 'newsletters' | 'companies' | 'newsletter_sections';

type TableRow<T extends TableName> = 
  T extends 'newsletter_generation_queue' ? QueueItem :
  T extends 'newsletters' ? Newsletter :
  T extends 'companies' ? Company :
  T extends 'newsletter_sections' ? NewsletterSection :
  never;

// Helper type for the filter builder
interface GenericTable {
  id: string;
  [key: string]: any;
}

interface PostgrestBuilderMock<T> {
  select: (...args: string[]) => PostgrestBuilderMock<T>;
  update: (data: Partial<T>) => PostgrestUpdateBuilderMock<T>;
  single: () => PostgrestSingleResponse<T>;
  eq: (column: string, value: any) => PostgrestBuilderMock<T>;
}

interface PostgrestUpdateBuilderMock<T> {
  eq: (column: string, value: any) => PostgrestArrayResponse<T>;
}

// Base mock query builder with proper typing
class MockQueryBuilder<T extends TableName> implements PostgrestBuilderMock<TableRow<T>> {
  protected chainedCalls: ChainedCall[] = [];
  protected mockData: TableRow<T> | null;
  protected mockError: any | null;
  protected whereConditions: { column: string; value: any }[] = [];
  protected selectedColumns?: string;
  protected updateData?: Partial<TableRow<T>>;

  constructor(mockData: TableRow<T> | null = null, mockError: any = null) {
    this.mockData = mockData;
    this.mockError = mockError;
  }

  select(...args: string[]): PostgrestBuilderMock<TableRow<T>> {
    this.addCall('select', args);
    return this;
  }

  eq(column: string, value: any): PostgrestBuilderMock<TableRow<T>> {
    this.addCall('eq', [column, value]);
    this.whereConditions.push({ column, value });
    return this;
  }

  single(): PostgrestSingleResponse<TableRow<T>> {
    this.addCall('single', []);
    const matchesConditions = this.whereConditions.every(
      ({ column, value }) => (this.mockData as any)?.[column] === value
    );

    if (matchesConditions && this.mockData) {
      return Promise.resolve({
        data: this.mockData,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      });
    }

    return Promise.resolve({
      data: null,
      error: null,
      count: null,
      status: 404,
      statusText: 'Not Found'
    });
  }

  update(data: Partial<TableRow<T>>): PostgrestUpdateBuilderMock<TableRow<T>> {
    this.addCall('update', [data]);
    this.updateData = data;
    
    const builder = {
      ...this,
      eq: (column: string, value: any): PostgrestArrayResponse<TableRow<T>> => {
        this.addCall('eq', [column, value]);
        this.whereConditions.push({ column, value });
        const matchesConditions = this.whereConditions.every(
          ({ column, value }) => (this.mockData as any)?.[column] === value
        );

        if (matchesConditions && this.mockData) {
          const updatedData = {
            ...this.mockData,
            ...this.updateData,
            updated_at: new Date().toISOString()
          };
          return Promise.resolve({
            data: [updatedData],
            error: null,
            count: 1,
            status: 200,
            statusText: 'OK'
          });
        }

        return Promise.resolve({
          data: [],
          error: null,
          count: 0,
          status: 404,
          statusText: 'Not Found'
        });
      }
    };
    
    return builder as PostgrestUpdateBuilderMock<TableRow<T>>;
  }

  protected addCall(method: string, args: any[]) {
    this.chainedCalls.push({ method, args });
  }

  protected addWhereCondition(column: string, value: any) {
    this.whereConditions.push({ column, value });
  }

  // Helper to check the chain
  getChainedCalls(): ChainedCall[] {
    return this.chainedCalls;
  }
}

// Create a function to get mock data based on table name
function getMockData<T extends TableName>(table: T): TableRow<T> {
  switch (table) {
    case 'newsletter_generation_queue':
      return {
        id: '123',
        newsletter_id: '456',
        section_type: 'introduction',
        section_number: 1,
        status: 'pending',
        attempts: 0,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as TableRow<T>;
    case 'newsletters':
      return {
        id: '456',
        newsletter_id: '456',
        section_type: 'conclusion',
        content: 'Test content',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as TableRow<T>;
    case 'companies':
      return {
        id: '789',
        company_name: 'Test Company',
        industry: 'Technology',
        target_audience: 'Developers',
        audience_description: 'Software developers',
        contact_email: 'test@example.com',
        contact_name: 'John Doe',
        website_url: 'https://example.com',
        phone_number: '123-456-7890',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as TableRow<T>;
    case 'newsletter_sections':
      return {
        id: '123',
        newsletter_id: '456',
        section_type: 'introduction',
        section_number: 1,
        content: 'Test content',
        status: 'pending',
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as TableRow<T>;
    default:
      throw new Error(`Unknown table: ${table}`);
  }
}

// Mock implementation of the Supabase client
class MockSupabaseClient {
  from<T extends TableName>(table: T): {
    select: (...args: string[]) => PostgrestBuilderMock<TableRow<T>>;
    update: (data: Partial<TableRow<T>>) => PostgrestUpdateBuilderMock<TableRow<T>>;
    eq: (column: string, value: any) => PostgrestBuilderMock<TableRow<T>>;
    single: () => PostgrestSingleResponse<TableRow<T>>;
  } {
    const mockData = getMockData(table);
    const queryBuilder = new MockQueryBuilder<T>(mockData);
    
    return {
      select: (...args: string[]) => queryBuilder.select(...args),
      update: (data: Partial<TableRow<T>>) => queryBuilder.update(data),
      eq: (column: string, value: any) => queryBuilder.eq(column, value),
      single: () => queryBuilder.single()
    };
  }
}

// Test cases
describe('MockSupabaseClient', () => {
  let client: MockSupabaseClient;

  beforeEach(() => {
    client = new MockSupabaseClient();
  });

  it('should handle update with eq chaining', async () => {
    const result = await client
      .from('newsletter_generation_queue')
      .update({
        status: 'completed',
        attempts: 1
      })
      .eq('id', '123');

    expect(result.data?.[0]?.status).toBe('completed');
    expect(result.data?.[0]?.attempts).toBe(1);
  });

  it('should handle select with eq and single', async () => {
    const result = await client
      .from('newsletters')
      .select()
      .eq('id', '456')
      .single();

    expect(result.data?.newsletter_id).toBe('456');
    expect(result.data?.section_type).toBe('conclusion');
  });

  it('should track method calls', () => {
    const queryBuilder = new MockQueryBuilder<'newsletter_generation_queue'>(getMockData('newsletter_generation_queue'));
    queryBuilder
      .select()
      .eq('id', '123')
      .single();

    const calls = queryBuilder.getChainedCalls();
    expect(calls).toEqual([
      { method: 'select', args: [] },
      { method: 'eq', args: ['id', '123'] },
      { method: 'single', args: [] }
    ]);
  });
});

export { MockSupabaseClient, MockQueryBuilder };
