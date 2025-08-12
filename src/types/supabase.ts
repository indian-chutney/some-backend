export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clients: {
        Row: {
          assigned_ca_id: string | null
          assigned_ca_name: string | null
          client_designation: string | null
          created_at: string | null
          date: string | null
          date_assigned: string | null
          email: string
          emails_required: number | null
          emails_submitted: number | null
          end_time: string | null
          id: string
          jobs_applied: number | null
          last_update: string | null
          name: string | null
          remarks: string | null
          start_time: string | null
          status: string | null
          team_id: string | null
          team_lead_name: string | null
          work_done_by: string | null
        }
        Insert: {
          assigned_ca_id?: string | null
          assigned_ca_name?: string | null
          client_designation?: string | null
          created_at?: string | null
          date?: string | null
          date_assigned?: string | null
          email: string
          emails_required?: number | null
          emails_submitted?: number | null
          end_time?: string | null
          id?: string
          jobs_applied?: number | null
          last_update?: string | null
          name?: string | null
          remarks?: string | null
          start_time?: string | null
          status?: string | null
          team_id?: string | null
          team_lead_name?: string | null
          work_done_by?: string | null
        }
        Update: {
          assigned_ca_id?: string | null
          assigned_ca_name?: string | null
          client_designation?: string | null
          created_at?: string | null
          date?: string | null
          date_assigned?: string | null
          email?: string
          emails_required?: number | null
          emails_submitted?: number | null
          end_time?: string | null
          id?: string
          jobs_applied?: number | null
          last_update?: string | null
          name?: string | null
          remarks?: string | null
          start_time?: string | null
          status?: string | null
          team_id?: string | null
          team_lead_name?: string | null
          work_done_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_ca_id_fkey"
            columns: ["assigned_ca_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_work_done_by_fkey"
            columns: ["work_done_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      incentives: {
        Row: {
          badge: string | null
          created_at: string | null
          incentive_amount: number | null
          month: string | null
          total_clients_completed: number | null
          total_emails: number | null
          total_jobs: number | null
          user_id: string | null
        }
        Insert: {
          badge?: string | null
          created_at?: string | null
          incentive_amount?: number | null
          month?: string | null
          total_clients_completed?: number | null
          total_emails?: number | null
          total_jobs?: number | null
          user_id?: string | null
        }
        Update: {
          badge?: string | null
          created_at?: string | null
          incentive_amount?: number | null
          month?: string | null
          total_clients_completed?: number | null
          total_emails?: number | null
          total_jobs?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incentives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_checks: {
        Row: {
          created_at: string
          id: string
          issue_found: boolean
          remarks: string | null
          work_log_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_found?: boolean
          remarks?: string | null
          work_log_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_found?: boolean
          remarks?: string | null
          work_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_checks_work_log_id_fkey"
            columns: ["work_log_id"]
            isOneToOne: false
            referencedRelation: "work_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          base_salary: number | null
          created_at: string | null
          department: string | null
          designation: string | null
          email: string
          id: string
          isactive: boolean | null
          name: string | null
          role: string | null
          team_id: string | null
        }
        Insert: {
          base_salary?: number | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email: string
          id?: string
          isactive?: boolean | null
          name?: string | null
          role?: string | null
          team_id?: string | null
        }
        Update: {
          base_salary?: number | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string
          id?: string
          isactive?: boolean | null
          name?: string | null
          role?: string | null
          team_id?: string | null
        }
        Relationships: []
      }
      work_history: {
        Row: {
          ca_id: string | null
          ca_name: string | null
          completed_profiles: Json | null
          date: string | null
          id: string
          incentives: number | null
        }
        Insert: {
          ca_id?: string | null
          ca_name?: string | null
          completed_profiles?: Json | null
          date?: string | null
          id?: string
          incentives?: number | null
        }
        Update: {
          ca_id?: string | null
          ca_name?: string | null
          completed_profiles?: Json | null
          date?: string | null
          id?: string
          incentives?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_history_ca_id_fkey"
            columns: ["ca_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      work_logs: {
        Row: {
          client_id: string | null
          created_at: string | null
          date: string | null
          emails_submitted: number | null
          id: string
          jobs_applied: number | null
          remarks: string | null
          status: string | null
          work_done_by: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          date?: string | null
          emails_submitted?: number | null
          id?: string
          jobs_applied?: number | null
          remarks?: string | null
          status?: string | null
          work_done_by?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          date?: string | null
          emails_submitted?: number | null
          id?: string
          jobs_applied?: number | null
          remarks?: string | null
          status?: string | null
          work_done_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_work_done_by_fkey"
            columns: ["work_done_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_profile_emails: {
        Row: {
          emails_submitted: number | null
          work_date: string | null
          work_doneby: string | null
        }
        Relationships: []
      }
      v_emails_all: {
        Row: {
          emails_submitted: number | null
          work_date: string | null
          work_doneby: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_emails_stats: {
        Args: {
          target_user_id: string
          today_date: string
          yesterday_date: string
          week_start: string
          last_week_start: string
          last_week_end: string
          month_start: string
          last_month_start: string
          last_month_end: string
        }
        Returns: {
          todays_tasks: number
          yesterdays_tasks: number
          weeks_tasks: number
          last_weeks_tasks: number
          months_tasks: number
          last_months_tasks: number
          all_time_tasks: number
        }[]
      }
      get_individual_leaderboard: {
        Args: {
          start_date: string
          end_date: string
          lim?: number
          off?: number
        }
        Returns: {
          username: string
          user_score: number
          rnk: number
        }[]
      }
      get_individual_leaderboard_in_team: {
        Args: {
          target_team_name: string
          start_date: string
          end_date: string
          lim?: number
          off?: number
        }
        Returns: {
          username: string
          user_score: number
          rnk: number
        }[]
      }
      get_individual_position: {
        Args: { target_user_id: string; start_date: string; end_date: string }
        Returns: {
          rank: number
          user_score: number
          total_participants: number
        }[]
      }
      get_team_leaderboard: {
        Args: {
          start_date: string
          end_date: string
          lim?: number
          off?: number
        }
        Returns: {
          team_name: string
          team_score: number
          rnk: number
        }[]
      }
      get_team_position_for_user: {
        Args: { target_user_id: string; start_date: string; end_date: string }
        Returns: {
          rank: number
          team_name: string
          team_score: number
          total_teams: number
        }[]
      }
      get_total_emails_today: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_graph_30days: {
        Args: { target_user_id: string; start_date: string }
        Returns: {
          date: string
          tasks: number
        }[]
      }
      get_user_graph_all_time: {
        Args: { target_user_id: string }
        Returns: {
          month: string
          tasks: number
        }[]
      }
      get_user_graph_week: {
        Args: { target_user_id: string; start_date: string }
        Returns: {
          date: string
          tasks: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
