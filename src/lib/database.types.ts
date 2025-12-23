export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          company_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          company_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          company_id?: string;
          role?: string;
          created_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          mobile: string;
          email: string | null;
          budget: string | null;
          unit_preference: string | null;
          location_preference: string | null;
          notes: string | null;
          status: string;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          mobile: string;
          email?: string | null;
          budget?: string | null;
          unit_preference?: string | null;
          location_preference?: string | null;
          notes?: string | null;
          status?: string;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          mobile?: string;
          email?: string | null;
          budget?: string | null;
          unit_preference?: string | null;
          location_preference?: string | null;
          notes?: string | null;
          status?: string;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          company_id: string;
          lead_id: string;
          status: string;
          duration: number | null;
          recording_url: string | null;
          transcript: string | null;
          summary: string | null;
          success_evaluation: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          lead_id: string;
          status?: string;
          duration?: number | null;
          recording_url?: string | null;
          transcript?: string | null;
          summary?: string | null;
          success_evaluation?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          lead_id?: string;
          status?: string;
          duration?: number | null;
          recording_url?: string | null;
          transcript?: string | null;
          summary?: string | null;
          success_evaluation?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          voice_id: string | null;
          system_prompt: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          voice_id?: string | null;
          system_prompt?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          description?: string | null;
          voice_id?: string | null;
          system_prompt?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
