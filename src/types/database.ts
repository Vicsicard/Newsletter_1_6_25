export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export enum CompiledNewsletterStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed"
}

export enum ContactStatus {
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
  Deleted = "deleted"
}

export enum CsvUploadStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed"
}

export enum ImageGenerationStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed"
}

export enum NewsletterContactStatus {
  Pending = "pending",
  Sent = "sent",
  Failed = "failed"
}

export enum NewsletterSectionStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed"
}

export enum NewsletterStatus {
  Draft = "draft",
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed"
}

export interface Database {
  public: {
    Tables: {
      newsletters: {
        Row: {
          id: string
          title: string
          status: NewsletterStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          status?: NewsletterStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          status?: NewsletterStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_sections: {
        Row: {
          id: string
          newsletter_id: string
          section_type: string
          section_number: number
          title: string | null
          content: string | null
          image_url: string | null
          status: NewsletterSectionStatus
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          newsletter_id: string
          section_type: string
          section_number: number
          title?: string | null
          content?: string | null
          image_url?: string | null
          status?: NewsletterSectionStatus
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          newsletter_id?: string
          section_type?: string
          section_number?: number
          title?: string | null
          content?: string | null
          image_url?: string | null
          status?: NewsletterSectionStatus
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_sections_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "newsletters"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      CompiledNewsletterStatus: CompiledNewsletterStatus
      ContactStatus: ContactStatus
      CsvUploadStatus: CsvUploadStatus
      ImageGenerationStatus: ImageGenerationStatus
      NewsletterContactStatus: NewsletterContactStatus
      NewsletterSectionStatus: NewsletterSectionStatus
      NewsletterStatus: NewsletterStatus
    }
  }
}

export type Newsletter = Database['public']['Tables']['newsletters']['Row'];
export type NewsletterSection = Database['public']['Tables']['newsletter_sections']['Row'];
