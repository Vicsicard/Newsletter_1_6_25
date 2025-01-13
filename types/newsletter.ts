import { Database } from './database';

export type NewsletterSectionType = Database['public']['Tables']['newsletter_section_types']['Row'];
export type NewsletterSection = {
  title: string;
  content: string;
  image_url: string | null;
};

export type GenerateOptions = {
  companyName: string;
  industry: string;
  targetAudience: string | null;
  audienceDescription: string | null;
};
