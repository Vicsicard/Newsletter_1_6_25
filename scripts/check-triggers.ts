import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables');
}

async function checkTriggers() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Query to check triggers directly
    const { data, error } = await supabase
      .from('pg_trigger')
      .select('*')
      .eq('tgrelid', 'newsletters'::regclass);
    
    if (error) {
      console.error('Error checking triggers:', error);
      return;
    }
    
    console.log('Triggers on newsletters table:', data);
    
    // Check if our specific trigger exists
    const queueTrigger = data?.find(t => t.tgname === 'tr_create_newsletter_queue_items');
    if (queueTrigger) {
      console.log('Queue trigger is installed and enabled');
    } else {
      console.log('Queue trigger is NOT installed');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTriggers().catch(console.error);
