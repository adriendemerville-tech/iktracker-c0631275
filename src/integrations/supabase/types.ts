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
      feedback: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string
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
          read_by_user?: boolean | null
          responded_at?: string | null
          response?: string | null
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
          page?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      trips: {
        Row: {
          calendar_event_id: string | null
          created_at: string
          date: string
          distance: number
          end_location: string
          id: string
          ik_amount: number
          purpose: string | null
          round_trip: boolean
          source: string | null
          start_location: string
          tour_stops: Json | null
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          calendar_event_id?: string | null
          created_at?: string
          date: string
          distance: number
          end_location: string
          id?: string
          ik_amount?: number
          purpose?: string | null
          round_trip?: boolean
          source?: string | null
          start_location: string
          tour_stops?: Json | null
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          calendar_event_id?: string | null
          created_at?: string
          date?: string
          distance?: number
          end_location?: string
          id?: string
          ik_amount?: number
          purpose?: string | null
          round_trip?: boolean
          source?: string | null
          start_location?: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          accountant_email?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accountant_email?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
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
      get_admin_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: Json
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
      get_top_users: {
        Args: { limit_count?: number; sort_by?: string }
        Returns: {
          total_ik: number
          total_km: number
          total_trips: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
