import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
const result = dotenv.config({
  path: resolve(process.cwd(), '.env.test')
});

if (result.error) {
  console.warn('No .env.test file found. Using default test environment variables.');
}

// Set required test environment variables with defaults
const requiredEnvVars = {
  // Node Environment
  NODE_ENV: 'test',
  
  // App Configuration
  PORT: '3000',
  BASE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  
  // OpenAI Configuration
  OPENAI_API_KEY: 'test_openai_key',
  OPENAI_MODEL: 'gpt-4',
  OPENAI_TEMPERATURE: '0.7',
  OPENAI_MAX_TOKENS: '2000',
  
  // Supabase Configuration
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'test_service_role_key',
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_anon_key',
  
  // Brevo Configuration
  BREVO_API_KEY: 'test_brevo_key',
  BREVO_SENDER_EMAIL: 'test@example.com',
  BREVO_SENDER_NAME: 'Test Newsletter Service',
  
  // Test Database Configuration
  TEST_DATABASE_URL: 'postgresql://postgres:postgres@localhost:54321/postgres',
  
  // Test Feature Flags
  ENABLE_EMAIL_SENDING: 'false',
  ENABLE_OPENAI_CALLS: 'false',
  ENABLE_MOCK_RESPONSES: 'true',
  
  // Test Timeouts
  TEST_TIMEOUT: '10000',
  TEST_SLOW_THRESHOLD: '5000',
  
  // Test Data Configuration
  TEST_COMPANY_ID: 'test-company-id',
  TEST_NEWSLETTER_ID: 'test-newsletter-id',
  TEST_QUEUE_ITEM_ID: 'test-queue-item-id'
};

// Set environment variables, using values from .env.test if available
Object.entries(requiredEnvVars).forEach(([key, defaultValue]) => {
  if (!process.env[key]) {
    process.env[key] = defaultValue;
  }
});
