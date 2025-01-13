import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);
    
    // Validate required fields
    if (!body.company_name || !body.industry || !body.contact_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Try using raw SQL query
    const { data, error } = await supabase.from('companies').insert({
      company_name: body.company_name,
      industry: body.industry,
      contact_email: body.contact_email,
      target_audience: body.target_audience || null,
      audience_description: body.audience_description || null,
      website_url: body.website_url || null,
      status: 'active'
    }).select('*');

    if (error) {
      console.error('Database error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { 
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
