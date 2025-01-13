import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with anon key instead of service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    console.log('Supabase configuration:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL
    });

    // First verify Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('companies')
      .select('count(*)')
      .limit(1);

    if (testError) {
      console.error('Supabase connection test failed:', testError);
      return NextResponse.json(
        { error: 'Database connection failed', details: testError },
        { status: 500 }
      );
    }

    console.log('Supabase connection successful, proceeding with request');

    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);
    
    let body;
    try {
      body = JSON.parse(rawBody);
      console.log('Parsed request body:', body);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.company_name || !body.industry || !body.contact_email) {
      console.log('Missing required fields:', {
        hasCompanyName: !!body.company_name,
        hasIndustry: !!body.industry,
        hasContactEmail: !!body.contact_email
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prepare insert data
    const insertData = {
      company_name: body.company_name,
      industry: body.industry,
      contact_email: body.contact_email,
      target_audience: body.target_audience || null,
      audience_description: body.audience_description || null,
      website_url: body.website_url || null,
      status: 'active'
    };
    console.log('Attempting to insert:', insertData);

    // Try the insert with explicit error handling
    const { data, error } = await supabase
      .from('companies')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Supabase insert error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        data: insertData
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

    console.log('Successfully created company:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Unexpected error:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
