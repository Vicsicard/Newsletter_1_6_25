import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data: newsletter, error } = await supabase
      .from('newsletters')
      .insert([{
        company_id: body.company_id,
        subject: body.subject,
        status: body.status,
        draft_status: body.draft_status,
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
