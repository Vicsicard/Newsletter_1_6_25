import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugQueue() {
  const newsletterId = 'de235ba1-d121-4b94-ac54-0061073f5681';

  console.log('Checking newsletter...');
  const { data: newsletter, error: newsletterError } = await supabase
    .from('newsletters')
    .select('*')
    .eq('id', newsletterId)
    .single();

  if (newsletterError) {
    console.error('Error fetching newsletter:', newsletterError);
    return;
  }

  console.log('Newsletter found:', newsletter);

  console.log('\nChecking company...');
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', newsletter.company_id)
    .single();

  if (companyError) {
    console.error('Error fetching company:', companyError);
    return;
  }

  console.log('Company found:', company);

  console.log('\nChecking queue items...');
  const { data: queueItems, error: queueError } = await supabase
    .from('generation_queue')
    .select('*')
    .eq('newsletter_id', newsletterId);

  if (queueError) {
    console.error('Error fetching queue items:', queueError);
    return;
  }

  console.log('Queue items:', queueItems);

  console.log('\nChecking newsletter sections...');
  const { data: sections, error: sectionsError } = await supabase
    .from('newsletter_sections')
    .select('*')
    .eq('newsletter_id', newsletterId);

  if (sectionsError) {
    console.error('Error fetching sections:', sectionsError);
    return;
  }

  console.log('Newsletter sections:', sections);
}

debugQueue().catch(console.error);
