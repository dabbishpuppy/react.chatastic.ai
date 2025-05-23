export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          color: string
          created_at: string | null
          id: string
          image: string | null
          name: string
          rate_limit_enabled: boolean
          rate_limit_message: string
          rate_limit_messages: number
          rate_limit_time_window: number
          status: string | null
          team_id: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          image?: string | null
          name: string
          rate_limit_enabled?: boolean
          rate_limit_message?: string
          rate_limit_messages?: number
          rate_limit_time_window?: number
          status?: string | null
          team_id: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          image?: string | null
          name?: string
          rate_limit_enabled?: boolean
          rate_limit_message?: string
          rate_limit_messages?: number
          rate_limit_time_window?: number
          status?: string | null
          team_id?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_interface_settings: {
        Row: {
          agent_id: string | null
          allow_regenerate: boolean
          auto_show_delay: number
          bubble_color: string | null
          bubble_position: string
          chat_icon: string | null
          created_at: string
          display_name: string
          footer: string | null
          id: string
          initial_message: string
          message_placeholder: string
          primary_color: string | null
          profile_picture: string | null
          show_feedback: boolean
          show_suggestions_after_chat: boolean
          suggested_messages: Json
          sync_colors: boolean | null
          theme: string
          updated_at: string
          user_message_color: string | null
        }
        Insert: {
          agent_id?: string | null
          allow_regenerate?: boolean
          auto_show_delay?: number
          bubble_color?: string | null
          bubble_position?: string
          chat_icon?: string | null
          created_at?: string
          display_name?: string
          footer?: string | null
          id?: string
          initial_message?: string
          message_placeholder?: string
          primary_color?: string | null
          profile_picture?: string | null
          show_feedback?: boolean
          show_suggestions_after_chat?: boolean
          suggested_messages?: Json
          sync_colors?: boolean | null
          theme?: string
          updated_at?: string
          user_message_color?: string | null
        }
        Update: {
          agent_id?: string | null
          allow_regenerate?: boolean
          auto_show_delay?: number
          bubble_color?: string | null
          bubble_position?: string
          chat_icon?: string | null
          created_at?: string
          display_name?: string
          footer?: string | null
          id?: string
          initial_message?: string
          message_placeholder?: string
          primary_color?: string | null
          profile_picture?: string | null
          show_feedback?: boolean
          show_suggestions_after_chat?: boolean
          suggested_messages?: Json
          sync_colors?: boolean | null
          theme?: string
          updated_at?: string
          user_message_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_interface_settings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_default_team_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_team_role: {
        Args: { team_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      is_team_member: {
        Args: { team_id: string }
        Returns: boolean
      }
      is_team_owner: {
        Args: { team_id: string }
        Returns: boolean
      }
    }
    Enums: {
      team_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      team_role: ["owner", "admin", "member"],
    },
  },
} as const
