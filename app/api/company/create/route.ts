import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a simple test endpoint first
export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    // Initialize client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Log config
    console.log('Config:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });

    // Try a simple query first
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Initialize client with no session persistence
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Log config
    console.log('Supabase config:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });

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

    // Try a simple query first to test connection
    const { data: testData, error: testError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('Connection test failed:', testError);
      return NextResponse.json(
        { error: 'Database connection failed', details: testError },
        { status: 500 }
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
      .insert([insertData])
      .select();

    if (error) {
      console.error('Insert error:', {
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
