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
      blog_api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          content: string
          created_at: string
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
          id: string
          image_url: string | null
          message: string
          phone_number: string | null
          read_by_user: boolean | null
          responded_at: string | null
          response: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          phone_number?: string | null
          read_by_user?: boolean | null
          responded_at?: string | null
          response?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string
          phone_number?: string | null
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
          created_at: string
          id: string
          persona: string | null
          updated_at: string
          user_id: string
          visit_count: number
        }
        Insert: {
          accountant_email?: string | null
          created_at?: string
          id?: string
          persona?: string | null
          updated_at?: string
          user_id: string
          visit_count?: number
        }
        Update: {
          accountant_email?: string | null
          created_at?: string
          id?: string
          persona?: string | null
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
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_shares: { Args: never; Returns: undefined }
      cleanup_old_phone_numbers: { Args: never; Returns: undefined }
      get_admin_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: Json
      }
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
      get_recent_signups: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          email: string
          user_id: string
        }[]
      }
      get_registrations_by_day: {
        Args: { days_back?: number }
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
      get_user_stats: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
              last_name: string
              user_id: string
            }[]
          }
    }
    Enums: {
      app_role: "admin" | "user" | "viewer"
      blog_post_status: "draft" | "published" | "archived"
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
      blog_post_status: ["draft", "published", "archived"],
    },
  },
} as const
