import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/utils/supabase-admin';
import { validateEmail } from '@/utils/email';
import { 
  NewsletterStatus, 
  NewsletterDraftStatus, 
  NewsletterSectionStatus,
  NewsletterContact
} from '@/types/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyName,
      industry,
      targetAudience,
      audienceDescription,
      contactEmail,
      contactName
    } = body;

    // Validate required fields
    if (!companyName || !industry || !contactEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(contactEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        company_name: companyName,
        industry,
        target_audience: targetAudience,
        audience_description: audienceDescription,
        contact_email: contactEmail,
        contact_name: contactName || undefined
      })
      .select()
      .single();

    if (companyError) {
      console.error('Failed to create company:', companyError);
      return NextResponse.json(
        { success: false },
        { status: 500 }
      );
    }

    // Create initial newsletter
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .insert({
        company_id: company.id,
        subject: `${companyName} Newsletter`,
        status: 'draft' as NewsletterStatus,
        draft_status: 'draft' as NewsletterDraftStatus,
        draft_recipient_email: contactEmail
      })
      .select()
      .single();

    if (newsletterError) {
      console.error('Failed to create newsletter:', newsletterError);
      return NextResponse.json(
        { success: false },
        { status: 500 }
      );
    }

    // Create initial sections
    const sections = [
      {
        newsletter_id: newsletter.id,
        section_number: 1,
        section_type: 'welcome',
        title: 'Welcome',
        content: '',
        status: 'pending' as NewsletterSectionStatus
      },
      {
        newsletter_id: newsletter.id,
        section_number: 2,
        section_type: 'industry_trends',
        title: 'Industry Trends',
        content: '',
        status: 'pending' as NewsletterSectionStatus
      },
      {
        newsletter_id: newsletter.id,
        section_number: 3,
        section_type: 'practical_tips',
        title: 'Practical Tips',
        content: '',
        status: 'pending' as NewsletterSectionStatus
      }
    ];

    const { error: sectionsError } = await supabase
      .from('newsletter_sections')
      .insert(sections);

    if (sectionsError) {
      console.error('Failed to create sections:', sectionsError);
      return NextResponse.json(
        { success: false },
        { status: 500 }
      );
    }

    // Create initial contact
    const { error: contactError } = await supabase
      .from('contacts')
      .insert({
        company_id: company.id,
        email: contactEmail,
        name: contactName || undefined,
        status: 'active'
      });

    if (contactError) {
      console.error('Failed to create contact:', contactError);
      return NextResponse.json(
        { success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        company_id: company.id,
        newsletter_id: newsletter.id
      }
    });
  } catch (error) {
    console.error('Error during onboarding:', error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
