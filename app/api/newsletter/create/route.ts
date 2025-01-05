import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatNewsletterSubject } from '@/utils/newsletter';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DAYS_BETWEEN_NEWSLETTERS = 20;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if company has created a newsletter in the last 20 days
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - DAYS_BETWEEN_NEWSLETTERS);
    
    const { data: recentNewsletters, error: searchError } = await supabase
      .from('newsletters')
      .select('created_at')
      .eq('company_id', body.company_id)
      .gte('created_at', twentyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (searchError) throw searchError;

    if (recentNewsletters && recentNewsletters.length > 0) {
      const daysSinceLastNewsletter = Math.floor(
        (Date.now() - new Date(recentNewsletters[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = DAYS_BETWEEN_NEWSLETTERS - daysSinceLastNewsletter;
      
      return NextResponse.json(
        { error: `Please wait ${daysRemaining} more days before creating another newsletter` },
        { status: 429 }
      );
    }

    // Extract company name from subject (removes "Newsletter for " prefix)
    const companyName = body.subject.replace('Newsletter for ', '');
    
    const { data: newsletter, error } = await supabase
      .from('newsletters')
      .insert([{
        company_id: body.company_id,
        subject: formatNewsletterSubject(companyName),
        status: 'draft',
        draft_status: 'draft',
        draft_recipient_email: body.draft_recipient_email
      }])
      .select();

    if (error) throw error;

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error('Error creating newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to create newsletter' },
      { status: 500 }
    );
  }
}
