const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNewsletterStatus() {
  // Get the latest newsletter
  const { data: newsletter, error: newsletterError } = await supabase
    .from('newsletters')
    .select(`
      *,
      company:companies(*),
      newsletter_sections(*)
    `)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (newsletterError) {
    console.error('Error:', newsletterError);
    return;
  }

  // Get all sections for this newsletter
  const { data: sections, error: sectionsError } = await supabase
    .from('newsletter_sections')
    .select('*')
    .eq('newsletter_id', newsletter.id)
    .order('section_number', { ascending: true });

  if (sectionsError) {
    console.error('Error fetching sections:', sectionsError);
  }

  // Check generation queue
  const { data: queueItems, error: queueError } = await supabase
    .from('newsletter_generation_queue')
    .select('*')
    .eq('newsletter_id', newsletter.id)
    .order('created_at', { ascending: true });

  if (queueError) {
    console.error('Error fetching queue:', queueError);
  }

  console.log('Latest Newsletter:', JSON.stringify(newsletter, null, 2));
  console.log('\nAll Sections:', JSON.stringify(sections, null, 2));
  if (queueItems && queueItems.length > 0) {
    console.log('\nGeneration Queue:', JSON.stringify(queueItems, null, 2));
  }
}

checkNewsletterStatus();
