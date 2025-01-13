export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          company_name: string
          industry: string
          target_audience: string | null
          audience_description: string | null
          contact_email: string
          contact_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      newsletters: {
        Row: {
          id: string
          company_id: string
          subject: string
          status: string
          draft_status: string
          sent_count: number
          failed_count: number
          last_sent_status: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['newsletters']['Row'], 'id' | 'created_at' | 'updated_at' | 'sent_count' | 'failed_count'>
        Update: Partial<Database['public']['Tables']['newsletters']['Insert']>
      }
      newsletter_sections: {
        Row: {
          id: string
          newsletter_id: string
          section_type: string
          section_number: number
          content: string | null
          status: string
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['newsletter_sections']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['newsletter_sections']['Insert']>
      }
      newsletter_generation_queue: {
        Row: {
          id: string
          newsletter_id: string
          section_type: string
          section_number: number
          status: string
          attempts: number
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['newsletter_generation_queue']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['newsletter_generation_queue']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
