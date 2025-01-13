import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Log Supabase configuration (without exposing secrets)
console.log('Supabase URL configured:', !!process.env.SUPABASE_URL);
console.log('Supabase key configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Log the raw request
    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);
    
    // Parse the body
    const body = JSON.parse(rawBody);
    console.log('Parsed request body:', body);
    
    // Log environment
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

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

    // Log the data we're about to insert
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
      .select('*');

    if (error) {
      console.error('Supabase error:', {
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
