import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { data: company, error } = await supabase
      .from('companies')
      .insert([{
        company_name: body.company_name,
        website_url: body.website_url,
        industry: body.industry,
        contact_email: body.contact_email,
        target_audience: body.target_audience,
        audience_description: body.audience_description
      }])
      .select();

    if (error) throw error;

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
