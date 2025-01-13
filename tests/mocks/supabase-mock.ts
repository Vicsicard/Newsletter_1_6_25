import { Database } from '../../types/database';
import { SupabaseClient } from '@supabase/supabase-js';

// Types for mock responses
type MockSingleResponse<T> = Promise<{
  data: T | null;
  error: null | { message: string };
  status: number;
  statusText: string;
}>;

type MockArrayResponse<T> = Promise<{
  data: T[];
  error: null | { message: string };
  status: number;
  statusText: string;
}>;

// Define table types
type Tables = Database['public']['Tables'];
type TableName = keyof Tables;
type Row<T extends TableName> = Tables[T]['Row'];
type Insert<T extends TableName> = Tables[T]['Insert'];
type Update<T extends TableName> = Tables[T]['Update'];

class SimpleMockQueryBuilder<T extends TableName> {
  protected whereConditions: { column: string; value: any }[] = [];

  constructor(private mockData: Row<T> | null) {}

  // Query builder methods that return this for chaining
  select() {
    return this;
  }

  eq(column: string, value: any) {
    this.whereConditions.push({ column, value });
    return this;
  }

  // Terminal operations
  async single(): MockSingleResponse<Row<T>> {
    const matchesConditions = this.whereConditions.every(
      ({ column, value }) => (this.mockData as any)?.[column] === value
    );

    if (matchesConditions && this.mockData) {
      return {
        data: this.mockData,
        error: null,
        status: 200,
        statusText: 'OK'
      };
    }

    return {
      data: null,
      error: { message: 'Record not found' },
      status: 404,
      statusText: 'Not Found'
    };
  }

  update(data: Update<T>) {
    return {
      eq: async (column: string, value: any): MockArrayResponse<Row<T>> => {
        const matchesConditions = this.mockData && (this.mockData as any)[column] === value;

        if (matchesConditions) {
          const updatedData = {
            ...this.mockData,
            ...data,
            updated_at: new Date().toISOString()
          } as Row<T>;

          return {
            data: [updatedData],
            error: null,
            status: 200,
            statusText: 'OK'
          };
        }

        return {
          data: [],
          error: { message: 'Record not found' },
          status: 404,
          statusText: 'Not Found'
        };
      }
    };
  }

  insert(data: Insert<T>): MockSingleResponse<Row<T>> {
    const newData = {
      ...data,
      id: 'new-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Row<T>;

    return Promise.resolve({
      data: newData,
      error: null,
      status: 201,
      statusText: 'Created'
    });
  }
}

// Function to get mock data for a specific table
function getMockData<T extends TableName>(table: T): Row<T> {
  const timestamp = new Date().toISOString();
  
  const mockData: Record<TableName, any> = {
    newsletter_generation_queue: {
      id: '123',
      newsletter_id: '456',
      section_type: 'welcome',
      section_number: 1,
      status: 'pending',
      attempts: 0,
      error_message: null,
      created_at: timestamp,
      updated_at: timestamp
    },
    newsletters: {
      id: '456',
      company_id: '789',
      subject: 'Test Newsletter',
      status: 'draft',
      draft_status: 'draft',
      sent_count: 0,
      failed_count: 0,
      last_sent_status: null,
      error_message: null,
      created_at: timestamp,
      updated_at: timestamp
    },
    companies: {
      id: '789',
      company_name: 'Test Company',
      industry: 'Technology',
      target_audience: 'Developers',
      audience_description: 'Software developers and engineers',
      contact_email: 'test@example.com',
      contact_name: 'John Doe',
      website_url: 'https://example.com',
      phone_number: '123-456-7890',
      created_at: timestamp,
      updated_at: timestamp
    },
    newsletter_sections: {
      id: '123',
      newsletter_id: '456',
      section_type: 'welcome',
      section_number: 1,
      content: 'Generated content for test',
      status: 'completed',
      error_message: null,
      created_at: timestamp,
      updated_at: timestamp
    },
    contacts: {
      id: '123',
      email: 'test@example.com',
      name: 'Test Contact',
      created_at: timestamp,
      updated_at: timestamp
    },
    csv_uploads: {
      id: '123',
      file_name: 'test.csv',
      status: 'completed',
      error_message: null,
      created_at: timestamp,
      updated_at: timestamp
    },
    compiled_newsletters: {
      id: '123',
      newsletter_id: '456',
      content: 'Compiled newsletter content',
      created_at: timestamp,
      updated_at: timestamp
    },
    image_generation_history: {
      id: '123',
      prompt: 'Test prompt',
      image_url: 'https://example.com/image.jpg',
      created_at: timestamp,
      updated_at: timestamp
    },
    industry_insights: {
      id: '123',
      industry: 'Technology',
      insight: 'Test insight',
      created_at: timestamp,
      updated_at: timestamp
    },
    newsletter_contacts: {
      id: '123',
      newsletter_id: '456',
      contact_id: '789',
      status: 'pending',
      created_at: timestamp,
      updated_at: timestamp
    },
    newsletter_section_types: {
      id: '123',
      name: 'welcome',
      description: 'Welcome section',
      created_at: timestamp,
      updated_at: timestamp
    },
    workflow_logs: {
      id: '123',
      level: 'info',
      message: 'Test log message',
      context: {},
      component: 'TestComponent',
      created_at: timestamp
    }
  };

  return mockData[table] as Row<T>;
}

// Create the mock Supabase client
const mockSupabase = {
  from: <T extends TableName>(table: T) => {
    const data = getMockData(table);
    return new SimpleMockQueryBuilder<T>(data);
  }
} as unknown as SupabaseClient<Database>;

export { mockSupabase, SimpleMockQueryBuilder };
