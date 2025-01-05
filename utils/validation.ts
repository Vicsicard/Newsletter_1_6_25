import { FormErrors } from '@/types/form'

export const validateForm = (formData: FormData): FormErrors => {
  const errors: FormErrors = {}

  // Required fields
  const requiredFields = {
    company_name: 'Company name',
    industry: 'Industry',
    contact_email: 'Contact email',
    target_audience: 'Target audience'
  }

  // Optional fields that need validation if provided
  const optionalFields = {
    audience_description: 'Audience description',
    website_url: 'Website URL'
  }

  // Validate required fields
  for (const [field, label] of Object.entries(requiredFields)) {
    const value = formData.get(field) as string
    if (!value || value.trim() === '') {
      errors[field] = `${label} is required`
    }
  }

  // Validate optional fields if provided
  for (const [field, label] of Object.entries(optionalFields)) {
    const value = formData.get(field) as string
    if (value && value.trim() === '') {
      errors[field] = `${label} cannot be empty`
    }
  }

  // Validate email format
  const email = formData.get('contact_email') as string
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    errors.contact_email = 'Please enter a valid email address'
  }

  // Website URL is optional and accepts any format
  const websiteUrl = formData.get('website_url') as string
  if (websiteUrl && websiteUrl.trim() === '') {
    errors.website_url = 'Website URL cannot be empty if provided'
  }

  return errors
}
