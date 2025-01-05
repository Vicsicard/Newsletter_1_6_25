import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkNewsletters() {
  const { data: newsletters, error } = await supabase
    .from('newsletters')
    .select(`
      *,
      companies (
        company_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching newsletters:', error);
    return;
  }

  console.log('Latest 5 newsletters:');
  newsletters.forEach((newsletter) => {
    console.log(`
Subject: ${newsletter.subject}
Company: ${newsletter.companies?.company_name}
Created: ${newsletter.created_at}
Status: ${newsletter.status}
Draft Status: ${newsletter.draft_status}
-------------------
    `);
  });
}

checkNewsletters();
