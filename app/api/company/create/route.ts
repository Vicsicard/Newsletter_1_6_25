import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// First, verify environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey
  });
}

// Initialize Supabase client
const supabase = createClient(
  supabaseUrl!,
  supabaseKey!
);

export async function POST(request: Request) {
  try {
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

    // Parse and log request body
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

    // Try the insert
    const { data, error } = await supabase
      .from('companies')
      .insert(insertData)
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
