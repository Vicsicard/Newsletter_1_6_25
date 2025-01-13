import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetQueue() {
  const newsletterId = 'de235ba1-d121-4b94-ac54-0061073f5681';

  // Reset queue items
  const { error: queueError } = await supabase
    .from('generation_queue')
    .update({
      status: 'pending',
      attempts: 0,
      error_message: null
    })
    .eq('newsletter_id', newsletterId);

  if (queueError) {
    console.error('Error resetting queue:', queueError);
    return;
  }

  // Reset newsletter sections
  const { error: sectionError } = await supabase
    .from('newsletter_sections')
    .update({
      status: 'pending',
      error_message: null
    })
    .eq('newsletter_id', newsletterId);

  if (sectionError) {
    console.error('Error resetting sections:', sectionError);
    return;
  }

  console.log('Successfully reset queue items and sections');
}

resetQueue().catch(console.error);
