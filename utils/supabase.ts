import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

type Company = Database['public']['Tables']['companies']['Row']
type Newsletter = Database['public']['Tables']['newsletters']['Row']
type Contact = Database['public']['Tables']['contacts']['Row']
type NewsletterContact = Database['public']['Tables']['newsletter_contacts']['Row']
type NewsletterSection = Database['public']['Tables']['newsletter_sections']['Row']
type CompiledNewsletter = Database['public']['Tables']['compiled_newsletters']['Row']

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/**
 * Get a company by its ID
 * Uses companies_pkey index
 */
export async function getCompanyById(id: string): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

interface NewsletterWithCompany extends Newsletter {
  company: Company
}

/**
 * Get the latest draft newsletter for a company
 * Uses newsletters_pkey index
 */
export async function getLatestNewsletter(companyId: string): Promise<NewsletterWithCompany> {
  const { data, error } = await supabase
    .from('newsletters')
    .select(`
      *,
      company:companies(*)
    `)
    .eq('company_id', companyId)
    .eq('draft_status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) throw error
  return data
}

/**
 * Get active contacts for a company
 * Uses contacts_company_id_email_key index
 */
export async function getActiveContacts(companyId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active')

  if (error) throw error
  return data
}

/**
 * Update newsletter status
 * Uses newsletters_pkey index
 */
export async function updateNewsletterStatus(
  id: string,
  status: 'draft' | 'published' | 'archived',
  sentAt?: string | null
): Promise<void> {
  const updateData: Partial<Newsletter> = {
    status,
  }

  if (sentAt) {
    updateData.sent_at = sentAt
  }

  const { error } = await supabase
    .from('newsletters')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Failed to update newsletter status:', error)
    throw error
  }
}

/**
 * Update newsletter contact status
 * Uses newsletter_contacts_pkey index
 */
export async function updateNewsletterContactStatus(
  id: string,
  status: NewsletterContact['status'],
  sentAt?: string
): Promise<void> {
  const { error } = await supabase
    .from('newsletter_contacts')
    .update({
      status,
      sent_at: sentAt,
    })
    .eq('id', id)

  if (error) throw error
}

/**
 * Get newsletter with all its contacts
 * Uses newsletter_contacts_newsletter_id_idx index for efficient joins
 */
export async function getNewsletterWithContacts(
  newsletterId: string
): Promise<NewsletterWithCompany & {
  newsletter_contacts: Array<NewsletterContact & { contact: Contact }>;
  newsletter_sections: NewsletterSection[];
}> {
  const { data, error } = await supabase
    .from('newsletters')
    .select(`
      *,
      companies (*),
      newsletter_contacts (
        id,
        status,
        contact (*)
      ),
      newsletter_sections (
        *
      )
    `)
    .eq('id', newsletterId)
    .order('section_number', { foreignTable: 'newsletter_sections' })
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get compiled newsletter by newsletter ID
 * Uses compiled_newsletters_newsletter_id_key index
 */
export async function getCompiledNewsletter(
  newsletterId: string
): Promise<CompiledNewsletter | null> {
  const { data, error } = await supabase
    .from('compiled_newsletters')
    .select('*')
    .eq('newsletter_id', newsletterId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data
}

/**
 * Check if a contact email exists for a company
 * Uses contacts_company_id_email_key index
 */
export async function checkContactExists(
  companyId: string,
  email: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('contacts')
    .select('id')
    .eq('company_id', companyId)
    .eq('email', email)
    .maybeSingle()

  if (error) throw error
  return data !== null
}

/**
 * Get newsletter sections in order
 * Uses newsletter_sections_newsletter_id_section_number_key index
 */
export async function getNewsletterSections(
  newsletterId: string
): Promise<NewsletterSection[]> {
  const { data, error } = await supabase
    .from('newsletter_sections')
    .select('*')
    .eq('newsletter_id', newsletterId)
    .order('section_number', { ascending: true })

  if (error) throw error
  return data || []
}
