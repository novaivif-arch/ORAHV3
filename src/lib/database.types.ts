export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'super_admin' | 'admin' | 'member' | 'user';
export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          timezone: string | null;
          date_format: string | null;
          subscription_tier: SubscriptionTier;
          subscription_status: SubscriptionStatus;
          max_users: number;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          timezone?: string | null;
          date_format?: string | null;
          subscription_tier?: SubscriptionTier;
          subscription_status?: SubscriptionStatus;
          max_users?: number;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          timezone?: string | null;
          date_format?: string | null;
          subscription_tier?: SubscriptionTier;
          subscription_status?: SubscriptionStatus;
          max_users?: number;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          company_id: string | null;
          role: UserRole;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          phone?: string | null;
          company_id?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          phone?: string | null;
          company_id?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          company_id: string;
          assigned_user_id: string | null;
          name: string;
          mobile: string;
          email: string | null;
          budget: string | null;
          possession_timeline: string | null;
          unit_preference: string | null;
          location_preference: string | null;
          notes: string | null;
          status: LeadStatus;
          source: string | null;
          next_follow_up: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          assigned_user_id?: string | null;
          name: string;
          mobile: string;
          email?: string | null;
          budget?: string | null;
          possession_timeline?: string | null;
          unit_preference?: string | null;
          location_preference?: string | null;
          notes?: string | null;
          status?: LeadStatus;
          source?: string | null;
          next_follow_up?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          assigned_user_id?: string | null;
          name?: string;
          mobile?: string;
          email?: string | null;
          budget?: string | null;
          possession_timeline?: string | null;
          unit_preference?: string | null;
          location_preference?: string | null;
          notes?: string | null;
          status?: LeadStatus;
          source?: string | null;
          next_follow_up?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          user_id: string;
          can_view_analytics: boolean;
          can_make_calls: boolean;
          can_export_data: boolean;
          can_manage_leads: boolean;
          can_view_all_leads: boolean;
          can_edit_leads: boolean;
          can_delete_leads: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          can_view_analytics?: boolean;
          can_make_calls?: boolean;
          can_export_data?: boolean;
          can_manage_leads?: boolean;
          can_view_all_leads?: boolean;
          can_edit_leads?: boolean;
          can_delete_leads?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          can_view_analytics?: boolean;
          can_make_calls?: boolean;
          can_export_data?: boolean;
          can_manage_leads?: boolean;
          can_view_all_leads?: boolean;
          can_edit_leads?: boolean;
          can_delete_leads?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          company_id: string | null;
          action: string;
          resource: string;
          resource_id: string | null;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          company_id?: string | null;
          action: string;
          resource: string;
          resource_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          company_id?: string | null;
          action?: string;
          resource?: string;
          resource_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          company_id: string;
          lead_id: string;
          agent_id: string | null;
          vapi_call_id: string | null;
          status: string;
          duration: number | null;
          recording_url: string | null;
          transcript: string | null;
          summary: string | null;
          intent: string | null;
          sentiment: string | null;
          success_evaluation: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          lead_id: string;
          agent_id?: string | null;
          vapi_call_id?: string | null;
          status?: string;
          duration?: number | null;
          recording_url?: string | null;
          transcript?: string | null;
          summary?: string | null;
          intent?: string | null;
          sentiment?: string | null;
          success_evaluation?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          lead_id?: string;
          agent_id?: string | null;
          vapi_call_id?: string | null;
          status?: string;
          duration?: number | null;
          recording_url?: string | null;
          transcript?: string | null;
          summary?: string | null;
          intent?: string | null;
          sentiment?: string | null;
          success_evaluation?: boolean;
          created_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          voice: string;
          voice_id: string | null;
          personality: string;
          greeting: string | null;
          tone: string | null;
          business_context: string | null;
          business_hours_from: string | null;
          business_hours_to: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          voice?: string;
          voice_id?: string | null;
          personality?: string;
          greeting?: string | null;
          tone?: string | null;
          business_context?: string | null;
          business_hours_from?: string | null;
          business_hours_to?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          voice?: string;
          voice_id?: string | null;
          personality?: string;
          greeting?: string | null;
          tone?: string | null;
          business_context?: string | null;
          business_hours_from?: string | null;
          business_hours_to?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
