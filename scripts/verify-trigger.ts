import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables');
}

async function verifyTrigger() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // First get a valid company ID
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .single();
      
    if (companyError || !company) {
      console.error('Error getting company ID:', companyError);
      return;
    }
    
    // Test the trigger by creating a test newsletter
    const { data: newsletter, error: createError } = await supabase
      .from('newsletters')
      .insert({
        company_id: company.id,
        subject: 'Trigger Test Newsletter',
        status: 'draft',
        draft_status: 'draft'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating test newsletter:', createError);
      return;
    }
    
    console.log('Created test newsletter:', newsletter);
    
    // Check if queue items were created
    const { data: queueItems, error: queueError } = await supabase
      .from('newsletter_generation_queue')
      .select('*')
      .eq('newsletter_id', newsletter.id);
      
    if (queueError) {
      console.error('Error checking queue items:', queueError);
      return;
    }
    
    console.log('\nQueue items created:', queueItems?.length || 0);
    if (queueItems && queueItems.length > 0) {
      queueItems.forEach(item => {
        console.log(`- ${item.section_type}: ${item.status}`);
      });
    } else {
      console.log('No queue items were created - trigger may not be working');
    }
    
    // Check if sections were created
    const { data: sections, error: sectionsError } = await supabase
      .from('newsletter_sections')
      .select('*')
      .eq('newsletter_id', newsletter.id);
      
    if (sectionsError) {
      console.error('Error checking sections:', sectionsError);
      return;
    }
    
    console.log('\nNewsletter sections created:', sections?.length || 0);
    if (sections && sections.length > 0) {
      sections.forEach(section => {
        console.log(`- Section ${section.section_number} (${section.section_type}): ${section.status}`);
      });
    } else {
      console.log('No sections were created - trigger may not be working');
    }
    
    // Clean up test data
    const { error: deleteError } = await supabase
      .from('newsletters')
      .delete()
      .eq('id', newsletter.id);
      
    if (deleteError) {
      console.error('Error cleaning up test newsletter:', deleteError);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

verifyTrigger().catch(console.error);
