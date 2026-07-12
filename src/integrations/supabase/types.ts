export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      affiliate_codes: {
        Row: {
          code: string
          commission_pct: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          code: string
          commission_pct?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          code?: string
          commission_pct?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      affiliate_uses: {
        Row: {
          affiliate_code_id: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          affiliate_code_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          affiliate_code_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_uses_affiliate_code_id_fkey"
            columns: ["affiliate_code_id"]
            isOneToOne: false
            referencedRelation: "affiliate_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      api_access_logs: {
        Row: {
          api_key_name: string | null
          created_at: string
          id: string
          method: string
          path: string
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          api_key_name?: string | null
          created_at?: string
          id?: string
          method: string
          path: string
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          api_key_name?: string | null
          created_at?: string
          id?: string
          method?: string
          path?: string
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: []
      }
      api_audit_logs: {
        Row: {
          action: string
          api_key_name: string | null
          created_at: string
          id: string
          new_data: Json | null
          previous_data: Json | null
          resource_id: string
          resource_type: string
          reverted: boolean
          reverted_at: string | null
        }
        Insert: {
          action: string
          api_key_name?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          resource_id: string
          resource_type: string
          reverted?: boolean
          reverted_at?: string | null
        }
        Update: {
          action?: string
          api_key_name?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          resource_id?: string
          resource_type?: string
          reverted?: boolean
          reverted_at?: string | null
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          cost_euros: number | null
          created_at: string
          function_name: string
          id: string
          metadata: Json | null
          model: string | null
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          cost_euros?: number | null
          created_at?: string
          function_name: string
          id?: string
          metadata?: Json | null
          model?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          cost_euros?: number | null
          created_at?: string
          function_name?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      autopilot_events: {
        Row: {
          audit_log_id: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
          message: string
          page_key: string | null
          resolved: boolean
          resolved_at: string | null
          severity: string
        }
        Insert: {
          audit_log_id?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          message: string
          page_key?: string | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          audit_log_id?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          message?: string
          page_key?: string | null
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_events_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "api_audit_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          monthly_quota: number
          name: string
          usage_current_month: number
          usage_reset_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          monthly_quota?: number
          name: string
          usage_current_month?: number
          usage_reset_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          monthly_quota?: number
          name?: string
          usage_current_month?: number
          usage_reset_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          content: string
          created_at: string
          deleted_at: string | null
          display_order: number | null
          featured_image_url: string | null
          id: string
          is_listed: boolean
          meta_description: string | null
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number | null
          featured_image_url?: string | null
          id?: string
          is_listed?: boolean
          meta_description?: string | null
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          display_order?: number | null
          featured_image_url?: string | null
          id?: string
          is_listed?: boolean
          meta_description?: string | null
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_slug_blacklist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_pattern: boolean
          reason: string | null
          slug_pattern: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_pattern?: boolean
          reason?: string | null
          slug_pattern: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_pattern?: boolean
          reason?: string | null
          slug_pattern?: string
        }
        Relationships: []
      }
      calendar_connection_attempts: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          created_at: string
          ics_url: string | null
          id: string
          is_active: boolean
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          ics_url?: string | null
          id?: string
          is_active?: boolean
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          ics_url?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      code_injections: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          location: string
          page_key: string | null
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          location: string
          page_key?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          location?: string
          page_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      distance_cache: {
        Row: {
          created_at: string
          distance: number
          end_address: string
          id: string
          start_address: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance: number
          end_address: string
          id?: string
          start_address: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance?: number
          end_address?: string
          id?: string
          start_address?: string
          user_id?: string
        }
        Relationships: []
      }
      download_clicks: {
        Row: {
          clicked_at: string
          id: string
          user_id: string
        }
        Insert: {
          clicked_at?: string
          id?: string
          user_id: string
        }
        Update: {
          clicked_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          description: string | null
          error_type: string
          id: string
          message: string
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          error_type: string
          id?: string
          message: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          error_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      excluded_ips: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          image_url: string | null
          is_admin_message: boolean
          message: string
          phone_number: string | null
          rating: number | null
          read_by_user: boolean | null
          responded_at: string | null
          response: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          image_url?: string | null
          is_admin_message?: boolean
          message: string
          phone_number?: string | null
          rating?: number | null
          read_by_user?: boolean | null
          responded_at?: string | null
          response?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          image_url?: string | null
          is_admin_message?: boolean
          message?: string
          phone_number?: string | null
          rating?: number | null
          read_by_user?: boolean | null
          responded_at?: string | null
          response?: string | null
          user_id?: string
        }
        Relationships: []
      }
      frequent_destinations: {
        Row: {
          address: string
          created_at: string
          id: string
          keyword: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          keyword: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          keyword?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_post_log: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          id: string
          linkedin_asset_urn: string | null
          linkedin_post_id: string | null
          post_text: string | null
          posted_at: string
          status: string
          topic_slug: string
          topic_title: string
          triggered_by: string
          video_bytes: number | null
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          linkedin_asset_urn?: string | null
          linkedin_post_id?: string | null
          post_text?: string | null
          posted_at?: string
          status?: string
          topic_slug: string
          topic_title: string
          triggered_by?: string
          video_bytes?: number | null
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          linkedin_asset_urn?: string | null
          linkedin_post_id?: string | null
          post_text?: string | null
          posted_at?: string
          status?: string
          topic_slug?: string
          topic_title?: string
          triggered_by?: string
          video_bytes?: number | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          type: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          type?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_analytics: {
        Row: {
          created_at: string
          device_type: string
          event_type: string
          id: string
          ip_address: string | null
          page: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string
          event_type: string
          id?: string
          ip_address?: string | null
          page: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          page?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      outbound_partners: {
        Row: {
          category: Database["public"]["Enums"]["partner_category"]
          commission_amount: number | null
          commission_model: Database["public"]["Enums"]["commission_model"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          priority: number
          slug: string
          tagline: string | null
          target_pages: string[]
          target_personas: string[]
          target_url: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["partner_category"]
          commission_amount?: number | null
          commission_model?: Database["public"]["Enums"]["commission_model"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          priority?: number
          slug: string
          tagline?: string | null
          target_pages?: string[]
          target_personas?: string[]
          target_url: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["partner_category"]
          commission_amount?: number | null
          commission_model?: Database["public"]["Enums"]["commission_model"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          priority?: number
          slug?: string
          tagline?: string | null
          target_pages?: string[]
          target_personas?: string[]
          target_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_contents: {
        Row: {
          canonical_url: string | null
          content: Json
          id: string
          meta_description: string | null
          meta_title: string | null
          page_key: string
          schema_org: Json | null
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          content?: Json
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          page_key: string
          schema_org?: Json | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          content?: Json
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          page_key?: string
          schema_org?: Json | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      partner_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          jwt_secret: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          monthly_quota: number
          partner_name: string
          scopes: string[]
          updated_at: string
          usage_current_month: number
          usage_reset_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          jwt_secret: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          monthly_quota?: number
          partner_name: string
          scopes?: string[]
          updated_at?: string
          usage_current_month?: number
          usage_reset_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          jwt_secret?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          monthly_quota?: number
          partner_name?: string
          scopes?: string[]
          updated_at?: string
          usage_current_month?: number
          usage_reset_at?: string
        }
        Relationships: []
      }
      partner_clicks: {
        Row: {
          clicked_at: string
          id: string
          ip_address: unknown
          page: string | null
          partner_id: string
          persona: string | null
          placement: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          ip_address?: unknown
          page?: string | null
          partner_id: string
          persona?: string | null
          placement?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          ip_address?: unknown
          page?: string | null
          partner_id?: string
          persona?: string | null
          placement?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_clicks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "outbound_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_request_logs: {
        Row: {
          created_at: string
          error_message: string | null
          external_user_id: string | null
          id: string
          iktracker_user_id: string | null
          method: string
          partner_id: string | null
          path: string
          response_time_ms: number | null
          status_code: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          external_user_id?: string | null
          id?: string
          iktracker_user_id?: string | null
          method: string
          partner_id?: string | null
          path: string
          response_time_ms?: number | null
          status_code: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          external_user_id?: string | null
          id?: string
          iktracker_user_id?: string | null
          method?: string
          partner_id?: string | null
          path?: string
          response_time_ms?: number | null
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_request_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_request_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_api_keys_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_users: {
        Row: {
          created_at: string
          external_email: string
          external_user_id: string
          id: string
          iktracker_user_id: string
          last_sso_at: string | null
          metadata: Json
          partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_email: string
          external_user_id: string
          id?: string
          iktracker_user_id: string
          last_sso_at?: string | null
          metadata?: Json
          partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_email?: string
          external_user_id?: string
          id?: string
          iktracker_user_id?: string
          last_sso_at?: string | null
          metadata?: Json
          partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_users_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_api_keys_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_webhooks: {
        Row: {
          created_at: string
          events: string[]
          failure_count: number
          hmac_secret: string
          id: string
          is_active: boolean
          last_called_at: string | null
          partner_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          failure_count?: number
          hmac_secret: string
          id?: string
          is_active?: boolean
          last_called_at?: string | null
          partner_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          failure_count?: number
          hmac_secret?: string
          id?: string
          is_active?: boolean
          last_called_at?: string | null
          partner_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_webhooks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_webhooks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_api_keys_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_trips: {
        Row: {
          active_months: number[] | null
          base_distance: number
          created_at: string
          days_of_week: number[]
          distance: number
          end_location: Json
          id: string
          is_active: boolean
          last_generated_date: string | null
          purpose: string | null
          round_trip: boolean
          start_location: Json
          updated_at: string
          user_id: string
          vehicle_id: string | null
          weeks_duration: number | null
        }
        Insert: {
          active_months?: number[] | null
          base_distance?: number
          created_at?: string
          days_of_week?: number[]
          distance?: number
          end_location: Json
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          purpose?: string | null
          round_trip?: boolean
          start_location: Json
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
          weeks_duration?: number | null
        }
        Update: {
          active_months?: number[] | null
          base_distance?: number
          created_at?: string
          days_of_week?: number[]
          distance?: number
          end_location?: Json
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          purpose?: string | null
          round_trip?: boolean
          start_location?: Json
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
          weeks_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_sources: {
        Row: {
          created_at: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      report_shares: {
        Row: {
          accessed_count: number
          created_at: string
          expires_at: string
          html_content: string
          id: string
          user_id: string
        }
        Insert: {
          accessed_count?: number
          created_at?: string
          expires_at?: string
          html_content: string
          id?: string
          user_id: string
        }
        Update: {
          accessed_count?: number
          created_at?: string
          expires_at?: string
          html_content?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      request_logs: {
        Row: {
          bot: boolean | null
          country: string | null
          created_at: string
          host: string | null
          id: string
          ip_address: string | null
          method: string | null
          path: string | null
          status_code: number | null
          timestamp: string | null
          url: string | null
          user_agent: string | null
        }
        Insert: {
          bot?: boolean | null
          country?: string | null
          created_at?: string
          host?: string | null
          id?: string
          ip_address?: string | null
          method?: string | null
          path?: string | null
          status_code?: number | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          bot?: boolean | null
          country?: string | null
          created_at?: string
          host?: string | null
          id?: string
          ip_address?: string | null
          method?: string | null
          path?: string | null
          status_code?: number | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          source_path: string
          status_code: number
          target_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          source_path: string
          status_code?: number
          target_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          source_path?: string
          status_code?: number
          target_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_events: {
        Row: {
          id: string
          shared_at: string
          total_ik: number | null
          total_km: number | null
          user_id: string
        }
        Insert: {
          id?: string
          shared_at?: string
          total_ik?: number | null
          total_km?: number | null
          user_id: string
        }
        Update: {
          id?: string
          shared_at?: string
          total_ik?: number | null
          total_km?: number | null
          user_id?: string
        }
        Relationships: []
      }
      site_config: {
        Row: {
          config_key: string
          config_value: Json
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_seo_config: {
        Row: {
          config_key: string
          content: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          content?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      survey_impressions: {
        Row: {
          action: string
          created_at: string
          id: string
          survey_id: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          survey_id: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          survey_id?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_impressions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_impressions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "survey_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          responses: Json
          screenshot_url: string | null
          survey_id: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          responses?: Json
          screenshot_url?: string | null
          survey_id: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          responses?: Json
          screenshot_url?: string | null
          survey_id?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "survey_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_variants: {
        Row: {
          content_blocks: Json
          created_at: string
          distribution_pct: number
          id: string
          name: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          content_blocks?: Json
          created_at?: string
          distribution_pct?: number
          id?: string
          name?: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          content_blocks?: Json
          created_at?: string
          distribution_pct?: number
          id?: string
          name?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_variants_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          created_by: string | null
          delay_between_impressions_hours: number
          description: string | null
          duration_days: number
          id: string
          max_impressions_per_user: number
          published_at: string | null
          status: string
          target_max_days_since_signup: number | null
          target_min_days_since_signup: number | null
          target_page: string
          target_personas: string[] | null
          target_user_count: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delay_between_impressions_hours?: number
          description?: string | null
          duration_days?: number
          id?: string
          max_impressions_per_user?: number
          published_at?: string | null
          status?: string
          target_max_days_since_signup?: number | null
          target_min_days_since_signup?: number | null
          target_page?: string
          target_personas?: string[] | null
          target_user_count?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delay_between_impressions_hours?: number
          description?: string | null
          duration_days?: number
          id?: string
          max_impressions_per_user?: number
          published_at?: string | null
          status?: string
          target_max_days_since_signup?: number | null
          target_min_days_since_signup?: number | null
          target_page?: string
          target_personas?: string[] | null
          target_user_count?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      takeout_import_attempts: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          status: string
          total_ik: number | null
          total_km: number | null
          trips_imported: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          total_ik?: number | null
          total_km?: number | null
          trips_imported?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          total_ik?: number | null
          total_km?: number | null
          trips_imported?: number | null
          user_id?: string
        }
        Relationships: []
      }
      tour_recovery_events: {
        Row: {
          context: string | null
          created_at: string
          distance_km: number | null
          error_message: string | null
          event_type: string
          id: string
          inactivity_seconds: number | null
          is_mobile: boolean | null
          metadata: Json | null
          session_id: string | null
          stops_count: number | null
          trip_id: string | null
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          distance_km?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          inactivity_seconds?: number | null
          is_mobile?: boolean | null
          metadata?: Json | null
          session_id?: string | null
          stops_count?: number | null
          trip_id?: string | null
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          distance_km?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          inactivity_seconds?: number | null
          is_mobile?: boolean | null
          metadata?: Json | null
          session_id?: string | null
          stops_count?: number | null
          trip_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tour_sessions: {
        Row: {
          created_at: string
          gps_points: Json
          id: string
          is_active: boolean
          last_activity: string
          last_error: string | null
          last_recovery_at: string | null
          notifications_count: number
          pending_stop: Json | null
          recovery_attempts: number
          recovery_success: number
          started_at: string
          stops: Json
          total_distance_km: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gps_points?: Json
          id?: string
          is_active?: boolean
          last_activity?: string
          last_error?: string | null
          last_recovery_at?: string | null
          notifications_count?: number
          pending_stop?: Json | null
          recovery_attempts?: number
          recovery_success?: number
          started_at?: string
          stops?: Json
          total_distance_km?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gps_points?: Json
          id?: string
          is_active?: boolean
          last_activity?: string
          last_error?: string | null
          last_recovery_at?: string | null
          notifications_count?: number
          pending_stop?: Json | null
          recovery_attempts?: number
          recovery_success?: number
          started_at?: string
          stops?: Json
          total_distance_km?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          calendar_event_id: string | null
          created_at: string
          date: string
          deleted_at: string | null
          distance: number
          end_location: string
          id: string
          ik_amount: number
          purpose: string | null
          round_trip: boolean
          source: string | null
          start_location: string
          status: string
          tour_stops: Json | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          calendar_event_id?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          distance: number
          end_location: string
          id?: string
          ik_amount?: number
          purpose?: string | null
          round_trip?: boolean
          source?: string | null
          start_location: string
          status?: string
          tour_stops?: Json | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          calendar_event_id?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          distance?: number
          end_location?: string
          id?: string
          ik_amount?: number
          purpose?: string | null
          round_trip?: boolean
          source?: string | null
          start_location?: string
          status?: string
          tour_stops?: Json | null
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          accountant_email: string | null
          calendar_import_mode: string
          created_at: string
          id: string
          ik_rate_override: string
          persona: string
          tutorial_completed_at: string | null
          updated_at: string
          user_id: string
          visit_count: number
        }
        Insert: {
          accountant_email?: string | null
          calendar_import_mode?: string
          created_at?: string
          id?: string
          ik_rate_override?: string
          persona?: string
          tutorial_completed_at?: string | null
          updated_at?: string
          user_id: string
          visit_count?: number
        }
        Update: {
          accountant_email?: string | null
          calendar_import_mode?: string
          created_at?: string
          id?: string
          ik_rate_override?: string
          persona?: string
          tutorial_completed_at?: string | null
          updated_at?: string
          user_id?: string
          visit_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_cache: {
        Row: {
          created_at: string
          id: string
          license_plate: string
          source: string
          vehicle_data: Json
        }
        Insert: {
          created_at?: string
          id?: string
          license_plate: string
          source: string
          vehicle_data?: Json
        }
        Update: {
          created_at?: string
          id?: string
          license_plate?: string
          source?: string
          vehicle_data?: Json
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          fiscal_power: number
          id: string
          is_electric: boolean
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          owner_first_name: string | null
          owner_last_name: string | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string
          fiscal_power: number
          id?: string
          is_electric?: boolean
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          owner_first_name?: string | null
          owner_last_name?: string | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string
          fiscal_power?: number
          id?: string
          is_electric?: boolean
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          owner_first_name?: string | null
          owner_last_name?: string | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      partner_api_keys_safe: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          is_active: boolean | null
          key_prefix: string | null
          last_used_at: string | null
          monthly_quota: number | null
          partner_name: string | null
          scopes: string[] | null
          updated_at: string | null
          usage_current_month: number | null
          usage_reset_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          key_prefix?: string | null
          last_used_at?: string | null
          monthly_quota?: number | null
          partner_name?: string | null
          scopes?: string[] | null
          updated_at?: string | null
          usage_current_month?: number | null
          usage_reset_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          key_prefix?: string | null
          last_used_at?: string | null
          monthly_quota?: number | null
          partner_name?: string | null
          scopes?: string[] | null
          updated_at?: string | null
          usage_current_month?: number | null
          usage_reset_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_shares: { Args: never; Returns: undefined }
      cleanup_old_phone_numbers: { Args: never; Returns: undefined }
      get_admin_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: Json
      }
      get_aggregate_rating: { Args: never; Returns: Json }
      get_api_cost_by_day: {
        Args: { days_back?: number }
        Returns: {
          cost: number
          day: string
          request_count: number
          tokens: number
        }[]
      }
      get_api_cost_by_function: {
        Args: { days_back?: number }
        Returns: {
          cost: number
          function_name: string
          request_count: number
          tokens_in: number
          tokens_out: number
        }[]
      }
      get_api_cost_by_model: {
        Args: { days_back?: number }
        Returns: {
          cost: number
          model: string
          request_count: number
          tokens_in: number
          tokens_out: number
        }[]
      }
      get_api_cost_stats: { Args: { days_back?: number }; Returns: Json }
      get_bareme_simulations_by_day: {
        Args: { days_back?: number }
        Returns: {
          count: number
          day: string
        }[]
      }
      get_calendar_attempts_by_day: {
        Args: { _provider?: string; days_back?: number }
        Returns: {
          day: string
          failed_attempts: number
          successful_attempts: number
          total_attempts: number
        }[]
      }
      get_calendar_connection_stats: {
        Args: { days_back?: number }
        Returns: {
          failed_attempts: number
          provider: string
          successful_attempts: number
          total_attempts: number
        }[]
      }
      get_daily_active_users: {
        Args: { days_back?: number }
        Returns: {
          count: number
          day: string
        }[]
      }
      get_download_clicks_by_day: {
        Args: { days_back?: number }
        Returns: {
          count: number
          day: string
        }[]
      }
      get_download_stats: { Args: never; Returns: Json }
      get_marketing_stats: { Args: { days_back?: number }; Returns: Json }
      get_marketing_stats_by_page: {
        Args: { days_back?: number }
        Returns: {
          cta_clicks: number
          page: string
          simulations: number
          views: number
        }[]
      }
      get_marketing_views_by_day: {
        Args: { days_back?: number }
        Returns: {
          day: string
          unique_visitors: number
          views: number
        }[]
      }
      get_monthly_stats: {
        Args: { months_back?: number }
        Returns: {
          month: string
          total_ik: number
          total_km: number
          total_trips: number
          total_users: number
        }[]
      }
      get_partner_clicks_by_day: {
        Args: { _partner_id?: string; days_back?: number }
        Returns: {
          clicks: number
          day: string
        }[]
      }
      get_partner_stats: {
        Args: { days_back?: number }
        Returns: {
          category: Database["public"]["Enums"]["partner_category"]
          estimated_revenue: number
          is_active: boolean
          last_click_at: string
          name: string
          partner_id: string
          slug: string
          top_page: string
          total_clicks: number
          unique_sessions: number
        }[]
      }
      get_persona_distribution: {
        Args: never
        Returns: {
          count: number
          persona: string
        }[]
      }
      get_recent_signups: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          email: string
          user_id: string
        }[]
      }
      get_recurring_trips_stats: {
        Args: never
        Returns: {
          count: number
          day: string
          total_count: number
        }[]
      }
      get_registrations_by_day: {
        Args: { days_back?: number }
        Returns: {
          count: number
          day: string
        }[]
      }
      get_rolling_active_users: {
        Args: { days_back?: number; window_size?: number }
        Returns: {
          count: number
          day: string
        }[]
      }
      get_share_stats: { Args: never; Returns: Json }
      get_shares_by_day: {
        Args: { days_back?: number }
        Returns: {
          count: number
          day: string
        }[]
      }
      get_signup_clicks_by_day: {
        Args: { end_date: string; start_date: string }
        Returns: {
          clicks: number
          day: string
        }[]
      }
      get_signup_funnel: { Args: { days_back?: number }; Returns: Json }
      get_takeout_import_stats: { Args: never; Returns: Json }
      get_top_users: {
        Args: { limit_count?: number; sort_by?: string }
        Returns: {
          total_ik: number
          total_km: number
          total_trips: number
          user_id: string
        }[]
      }
      get_total_tours_count:
        | { Args: { end_date?: string; start_date?: string }; Returns: number }
        | { Args: { end_date?: string; start_date?: string }; Returns: number }
      get_tour_mode_daily: {
        Args: { days_back?: number }
        Returns: {
          day: string
          tours_created: number
          unique_users_7d_rolling: number
        }[]
      }
      get_tour_mode_personas: {
        Args: { days_back?: number }
        Returns: {
          persona: string
          tours_count: number
          users_count: number
        }[]
      }
      get_tour_mode_stats: { Args: { days_back?: number }; Returns: Json }
      get_tour_mode_users: {
        Args: { days_back?: number }
        Returns: {
          email: string
          first_tour_at: string
          last_tour_at: string
          persona: string
          total_km: number
          tours_count: number
          user_id: string
        }[]
      }
      get_tour_recovery_registry: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          distance_km: number
          errors_count: number
          finalized_at: string
          is_active: boolean
          last_activity: string
          last_error: string
          notifications_count: number
          recovery_attempts: number
          recovery_success: number
          session_id: string
          source: string
          started_at: string
          stops_count: number
          trip_id: string
          user_email: string
          user_id: string
        }[]
      }
      get_tour_recovery_stats: { Args: { days_back?: number }; Returns: Json }
      get_user_stats: { Args: { _user_id: string }; Returns: Json }
      has_admin_or_viewer_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_api_usage: {
        Args: { _api_key_name: string }
        Returns: undefined
      }
      increment_partner_usage: {
        Args: { _partner_id: string }
        Returns: undefined
      }
      is_slug_blacklisted: { Args: { _slug: string }; Returns: boolean }
      purge_old_deleted_trips: { Args: never; Returns: number }
      search_users:
        | {
            Args: { search_term: string }
            Returns: {
              created_at: string
              email: string
              first_name: string
              id: string
              last_name: string
              raw_user_meta_data: Json
            }[]
          }
        | {
            Args: { limit_count?: number; search_term?: string }
            Returns: {
              created_at: string
              email: string
              first_name: string
              has_plate_detection: boolean
              last_name: string
              user_id: string
            }[]
          }
      validate_partner_key: {
        Args: { _key_hash: string }
        Returns: {
          is_active: boolean
          jwt_secret: string
          partner_id: string
          partner_name: string
          quota_remaining: number
          scopes: string[]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "viewer"
      blog_post_status: "draft" | "published" | "archived" | "deleted"
      commission_model: "cpa" | "cps" | "cpc"
      partner_category:
        | "neobank"
        | "accounting"
        | "insurance"
        | "fuel_card"
        | "leasing"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "viewer"],
      blog_post_status: ["draft", "published", "archived", "deleted"],
      commission_model: ["cpa", "cps", "cpc"],
      partner_category: [
        "neobank",
        "accounting",
        "insurance",
        "fuel_card",
        "leasing",
        "other",
      ],
    },
  },
} as const
