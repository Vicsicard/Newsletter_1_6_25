export interface Result<T> {
  success: boolean;
  data: T | null;
  error: Error | null;
}

export interface Newsletter {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: string;
}

export interface NewsletterSection {
  id: string;
  newsletter_id: string;
  section_type: string;
  section_number: number;
  title: string | null;
  content: string | null;
  image_url: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueItem {
  id: string;
  newsletter_id: string;
  section_type: string;
  section_number: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GenerateParams {
  newsletter_id: string;
  section_type: string;
  section_number: number;
}
