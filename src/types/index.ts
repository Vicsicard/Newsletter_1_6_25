import type { Database, Json } from './database';
import type {
  CompiledNewsletterStatus,
  ContactStatus,
  CsvUploadStatus,
  ImageGenerationStatus,
  NewsletterContactStatus,
  NewsletterSectionStatus,
  NewsletterStatus
} from './database';

// Re-export all types
export type {
  Database,
  Json,
  CompiledNewsletterStatus,
  ContactStatus,
  CsvUploadStatus,
  ImageGenerationStatus,
  NewsletterContactStatus,
  NewsletterSectionStatus,
  NewsletterStatus
};

// Define our application-specific types
export type Newsletter = Database['public']['Tables']['newsletters']['Row'] & {
  sections: NewsletterSection[];
};

export type NewsletterSection = Database['public']['Tables']['newsletter_sections']['Row'];

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface GenerateSectionParams {
  newsletter_id: string;
  section_type: string;
  section_number: number;
}

export interface CreateNewsletterInput {
  title: string;
  section_type: string;
  section_number: number;
}
