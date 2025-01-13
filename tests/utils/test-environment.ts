import { jest } from '@jest/globals';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Logger } from '../../src/utils/logger';
import { createMockOpenAI } from './openai-mock';
import { Result } from '../../src/types/result';
import { Database } from '../../src/types/database';

type Tables = Database['public']['Tables'];
type TableNames = keyof Tables;

export interface TestContext {
  supabase: jest.Mocked<SupabaseClient<Database>>;
  openai: jest.Mocked<OpenAI>;
  logger: jest.Mocked<Logger>;
}

export class TestEnvironment {
  private static instance: TestEnvironment;
  private context: TestContext | null = null;

  private constructor() {}

  static getInstance(): TestEnvironment {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  async setup(): Promise<TestContext> {
    const mockFrom = jest.fn();
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockSingle = jest.fn();
    const mockUpdate = jest.fn();

    // Create mock Supabase client
    const mockClient = createClient('http://localhost:54321', 'test-key');
    const supabase = {
      ...mockClient,
      from: mockFrom,
    } as unknown as jest.Mocked<SupabaseClient<Database>>;

    // Configure method chaining
    mockFrom.mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
      update: mockUpdate,
    }));

    mockSelect.mockImplementation(() => ({
      eq: mockEq,
      single: mockSingle,
    }));

    mockEq.mockImplementation(() => ({
      single: mockSingle,
      update: mockUpdate,
    }));

    mockSingle.mockImplementation(async () => ({
      data: null,
      error: null,
    }));

    mockUpdate.mockImplementation(async () => ({
      data: null,
      error: null,
    }));

    const openai = createMockOpenAI();

    // Create mock logger with all required properties
    const logger = {
      supabase: supabase,
      component: 'TestComponent',
      info: jest.fn().mockImplementation(async () => ({ success: true } as Result<void>)),
      error: jest.fn().mockImplementation(async () => ({ success: true } as Result<void>)),
      warn: jest.fn().mockImplementation(async () => ({ success: true } as Result<void>)),
      debug: jest.fn().mockImplementation(async () => ({ success: true } as Result<void>)),
      getSuccessRates: jest.fn().mockImplementation(async () => ({
        success: true,
        data: { success: 100, error: 0 }
      } as Result<{ success: number; error: number }>)),
      logToDatabase: jest.fn().mockImplementation(async () => ({ success: true } as Result<void>)),
      createLogEntry: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    this.context = {
      supabase,
      openai,
      logger,
    };

    return this.context;
  }

  async teardown(): Promise<void> {
    if (this.context) {
      jest.clearAllMocks();
      this.context = null;
    }
  }

  getContext(): TestContext {
    if (!this.context) {
      throw new Error('Test context not initialized. Call setup() first.');
    }
    return this.context;
  }

  async addMockData<T extends Record<string, any>>(table: TableNames, data: T[]): Promise<void> {
    const context = this.getContext();
    const mockSelect = jest.fn().mockImplementation(() => ({
      data,
      error: null,
    }));

    const mockEq = jest.fn().mockImplementation(() => ({
      data,
      error: null,
    }));

    const mockFrom = jest.fn().mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
    }));

    (context.supabase.from as jest.Mock).mockImplementation(() => ({
      select: mockSelect,
      eq: mockEq,
    }));
  }
}

// Global setup and teardown hooks
beforeAll(() => {
  // Set up any global test environment needs
  process.env.NODE_ENV = 'test';
  process.env.OPENAI_API_KEY = 'test-api-key';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
});

beforeEach(async () => {
  // Set up fresh test environment for each test
  await TestEnvironment.getInstance().setup();
});

afterEach(async () => {
  // Clean up after each test
  await TestEnvironment.getInstance().teardown();
});

afterAll(() => {
  // Clean up global test environment
  process.env.NODE_ENV = 'development';
  delete process.env.OPENAI_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
});
