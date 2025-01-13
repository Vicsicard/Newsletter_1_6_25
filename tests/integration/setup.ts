import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
import dotenv from 'dotenv';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create Supabase client for tests
export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

// Create a Supabase client for testing
export const testSupabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test helper functions
export async function clearTestData(supabase: SupabaseClient) {
  console.log('Clearing test data...');

  // Clear email queue
  console.log('Clearing email queue...');
  const { error: emailError } = await supabase
    .from('email_queue')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');  // Delete all rows except dummy

  if (emailError) {
    console.error('Error clearing email queue:', emailError);
    throw emailError;
  } else {
    console.log('Email queue cleared successfully');
  }

  // Clear compiled newsletters
  console.log('Clearing compiled newsletters...');
  const { error: compiledError } = await supabase
    .from('compiled_newsletters')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (compiledError) {
    console.error('Error clearing compiled newsletters:', compiledError);
    throw compiledError;
  } else {
    console.log('Compiled newsletters cleared successfully');
  }

  // Clear workflow logs
  console.log('Clearing workflow logs...');
  const { error: workflowError } = await supabase
    .from('workflow_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (workflowError) {
    console.error('Error clearing workflow logs:', workflowError);
    throw workflowError;
  } else {
    console.log('Workflow logs cleared successfully');
  }

  // Clear newsletter sections
  console.log('Clearing newsletter sections...');
  const { error: sectionsError } = await supabase
    .from('newsletter_sections')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (sectionsError) {
    console.error('Error clearing newsletter sections:', sectionsError);
    throw sectionsError;
  } else {
    console.log('Newsletter sections cleared successfully');
  }

  // Clear queue items
  console.log('Clearing queue items...');
  const { error: queueError } = await supabase
    .from('newsletter_generation_queue')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (queueError) {
    console.error('Error clearing queue items:', queueError);
    throw queueError;
  } else {
    console.log('Queue items cleared successfully');
  }

  // Clear newsletters
  console.log('Clearing newsletters...');
  const { error: newslettersError } = await supabase
    .from('newsletters')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (newslettersError) {
    console.error('Error clearing newsletters:', newslettersError);
    throw newslettersError;
  } else {
    console.log('Newsletters cleared successfully');
  }

  // Clear companies
  console.log('Clearing companies...');
  const { error: companiesError } = await supabase
    .from('companies')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (companiesError) {
    console.error('Error clearing companies:', companiesError);
    throw companiesError;
  } else {
    console.log('Companies cleared successfully');
  }

  console.log('Test data cleared successfully');
}

// Clear test data after each test
afterEach(async () => {
  await clearTestData(testSupabase);
});

// Clear test data before each test
beforeEach(async () => {
  console.log('Cleaning up test data before test...');
  await clearTestData(testSupabase);
  console.log('Test data cleaned up successfully');
});
