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
      agent_sources: {
        Row: {
          agent_id: string
          compressed_size: number | null
          compression_ratio: number | null
          content: string | null
          content_summary: string | null
          crawl_status: string | null
          created_at: string
          created_by: string | null
          extraction_method: string | null
          file_path: string | null
          id: string
          is_active: boolean
          is_excluded: boolean | null
          keywords: string[] | null
          last_crawled_at: string | null
          links_count: number | null
          metadata: Json | null
          original_size: number | null
          parent_source_id: string | null
          progress: number | null
          raw_text: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          team_id: string
          title: string
          updated_at: string
          updated_by: string | null
          url: string | null
        }
        Insert: {
          agent_id: string
          compressed_size?: number | null
          compression_ratio?: number | null
          content?: string | null
          content_summary?: string | null
          crawl_status?: string | null
          created_at?: string
          created_by?: string | null
          extraction_method?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          is_excluded?: boolean | null
          keywords?: string[] | null
          last_crawled_at?: string | null
          links_count?: number | null
          metadata?: Json | null
          original_size?: number | null
          parent_source_id?: string | null
          progress?: number | null
          raw_text?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          team_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          agent_id?: string
          compressed_size?: number | null
          compression_ratio?: number | null
          content?: string | null
          content_summary?: string | null
          crawl_status?: string | null
          created_at?: string
          created_by?: string | null
          extraction_method?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          is_excluded?: boolean | null
          keywords?: string[] | null
          last_crawled_at?: string | null
          links_count?: number | null
          metadata?: Json | null
          original_size?: number | null
          parent_source_id?: string | null
          progress?: number | null
          raw_text?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          team_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_sources_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sources_parent_source_id_fkey"
            columns: ["parent_source_id"]
            isOneToOne: false
            referencedRelation: "agent_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sources_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_training_jobs: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          processed_chunks: number | null
          processed_sources: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["training_status"]
          total_chunks: number | null
          total_sources: number | null
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          processed_chunks?: number | null
          processed_sources?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          total_chunks?: number | null
          total_sources?: number | null
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          processed_chunks?: number | null
          processed_sources?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          total_chunks?: number | null
          total_sources?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_training_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
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
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          agent_id: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          team_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          agent_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          agent_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          team_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_team_id_fkey"
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
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string
          created_at: string
          ended_at: string | null
          id: string
          session_id: string
          source: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          session_id: string
          source?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          session_id?: string
          source?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_performance_metrics: {
        Row: {
          agent_id: string
          created_at: string
          duration_ms: number | null
          end_time: string | null
          error_message: string | null
          id: string
          input_size: number | null
          items_processed: number | null
          metadata: Json | null
          output_size: number | null
          phase: string
          source_id: string | null
          start_time: string
          success_rate: number | null
          team_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          duration_ms?: number | null
          end_time?: string | null
          error_message?: string | null
          id?: string
          input_size?: number | null
          items_processed?: number | null
          metadata?: Json | null
          output_size?: number | null
          phase: string
          source_id?: string | null
          start_time: string
          success_rate?: number | null
          team_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          duration_ms?: number | null
          end_time?: string | null
          error_message?: string | null
          id?: string
          input_size?: number | null
          items_processed?: number | null
          metadata?: Json | null
          output_size?: number | null
          phase?: string
          source_id?: string | null
          start_time?: string
          success_rate?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_performance_metrics_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "agent_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          auto_delete: boolean
          created_at: string
          id: string
          resource_type: string
          retention_days: number
          team_id: string
          updated_at: string
        }
        Insert: {
          auto_delete?: boolean
          created_at?: string
          id?: string
          resource_type: string
          retention_days?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          auto_delete?: boolean
          created_at?: string
          id?: string
          resource_type?: string
          retention_days?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_settings: {
        Row: {
          agent_id: string
          collect_email: boolean
          collect_name: boolean
          collect_phone: boolean
          created_at: string
          email_placeholder: string
          enabled: boolean
          id: string
          name_placeholder: string
          phone_placeholder: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          collect_email?: boolean
          collect_name?: boolean
          collect_phone?: boolean
          created_at?: string
          email_placeholder?: string
          enabled?: boolean
          id?: string
          name_placeholder?: string
          phone_placeholder?: string
          title?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          collect_email?: boolean
          collect_name?: boolean
          collect_phone?: boolean
          created_at?: string
          email_placeholder?: string
          enabled?: boolean
          id?: string
          name_placeholder?: string
          phone_placeholder?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_settings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          submitted_at: string
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          submitted_at?: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          feedback: string | null
          id: string
          is_agent: boolean
          timestamp: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          is_agent?: boolean
          timestamp?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          is_agent?: boolean
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          agent_id: string
          conversations_emails: string[]
          created_at: string
          daily_conversations_enabled: boolean
          daily_leads_enabled: boolean
          id: string
          leads_emails: string[]
          updated_at: string
        }
        Insert: {
          agent_id: string
          conversations_emails?: string[]
          created_at?: string
          daily_conversations_enabled?: boolean
          daily_leads_enabled?: boolean
          id?: string
          leads_emails?: string[]
          updated_at?: string
        }
        Update: {
          agent_id?: string
          conversations_emails?: string[]
          created_at?: string
          daily_conversations_enabled?: boolean
          daily_leads_enabled?: boolean
          id?: string
          leads_emails?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      source_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string | null
          created_at: string
          duplicate_of_chunk_id: string | null
          id: string
          is_duplicate: boolean | null
          metadata: Json | null
          source_id: string
          token_count: number
        }
        Insert: {
          chunk_index: number
          content: string
          content_hash?: string | null
          created_at?: string
          duplicate_of_chunk_id?: string | null
          id?: string
          is_duplicate?: boolean | null
          metadata?: Json | null
          source_id: string
          token_count?: number
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string | null
          created_at?: string
          duplicate_of_chunk_id?: string | null
          id?: string
          is_duplicate?: boolean | null
          metadata?: Json | null
          source_id?: string
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "source_chunks_duplicate_of_chunk_id_fkey"
            columns: ["duplicate_of_chunk_id"]
            isOneToOne: false
            referencedRelation: "source_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "agent_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_embeddings: {
        Row: {
          chunk_id: string
          created_at: string
          embedding: string | null
          id: string
          model_name: string
        }
        Insert: {
          chunk_id: string
          created_at?: string
          embedding?: string | null
          id?: string
          model_name?: string
        }
        Update: {
          chunk_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
          model_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "source_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      user_consents: {
        Row: {
          consent_date: string | null
          consent_type: string
          consented: boolean
          created_at: string
          id: string
          ip_address: unknown | null
          team_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
          withdrawal_date: string | null
        }
        Insert: {
          consent_date?: string | null
          consent_type: string
          consented?: boolean
          created_at?: string
          id?: string
          ip_address?: unknown | null
          team_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
          withdrawal_date?: string | null
        }
        Update: {
          consent_date?: string | null
          consent_type?: string
          consented?: boolean
          created_at?: string
          id?: string
          ip_address?: unknown | null
          team_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          withdrawal_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      migration_progress: {
        Row: {
          completion_percentage: number | null
          migrated_rows: number | null
          table_name: string | null
          total_rows: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation_with_signup: {
        Args: { invitation_id_param: string; password_param: string }
        Returns: Json
      }
      accept_team_invitation: {
        Args: { invitation_id: string }
        Returns: Json
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      bulk_populate_content_hashes: {
        Args: { batch_size?: number }
        Returns: number
      }
      calculate_content_hash: {
        Args: { content: string }
        Returns: string
      }
      can_manage_team_members: {
        Args: { team_id_param: string }
        Returns: boolean
      }
      cleanup_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_orphaned_chunks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      decrypt_sensitive_data: {
        Args:
          | { encrypted_data: string }
          | { encrypted_data: string; key_id?: string }
        Returns: string
      }
      delete_agent_and_related_data: {
        Args: { agent_id_param: string }
        Returns: Json
      }
      delete_conversation: {
        Args: { conversation_id: string }
        Returns: boolean
      }
      delete_user_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      encrypt_sensitive_data: {
        Args: { data: string } | { data: string; key_id?: string }
        Returns: string
      }
      export_user_data: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_agent_source_stats: {
        Args: { target_agent_id: string }
        Returns: {
          total_sources: number
          total_bytes: number
          sources_by_type: Json
        }[]
      }
      get_compression_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_compression_ratio: number
          total_original_size: number
          total_compressed_size: number
          space_saved_percentage: number
        }[]
      }
      get_default_team_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_invitation_details: {
        Args: { invitation_id_param: string }
        Returns: Json
      }
      get_team_role: {
        Args: { team_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      get_user_email: {
        Args: { user_id_param: string }
        Returns: string
      }
      get_user_team_role: {
        Args: { team_id_param: string; user_id_param?: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      get_users_emails: {
        Args: { user_ids: string[] }
        Returns: {
          id: string
          email: string
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_team_member: {
        Args: { team_id: string }
        Returns: boolean
      }
      is_team_owner: {
        Args: { team_id: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      safe_migration_backfill: {
        Args: { batch_size?: number }
        Returns: Json
      }
      send_team_invitation: {
        Args: {
          team_id_param: string
          email_param: string
          role_param?: Database["public"]["Enums"]["team_role"]
        }
        Returns: Json
      }
      send_team_invitation_with_email: {
        Args: {
          team_id_param: string
          email_param: string
          role_param?: Database["public"]["Enums"]["team_role"]
        }
        Returns: Json
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      audit_action:
        | "create"
        | "read"
        | "update"
        | "delete"
        | "export"
        | "train"
        | "query"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      source_type: "text" | "file" | "website" | "qa"
      team_role: "owner" | "admin" | "member"
      training_status: "pending" | "in_progress" | "completed" | "failed"
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
      audit_action: [
        "create",
        "read",
        "update",
        "delete",
        "export",
        "train",
        "query",
      ],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      source_type: ["text", "file", "website", "qa"],
      team_role: ["owner", "admin", "member"],
      training_status: ["pending", "in_progress", "completed", "failed"],
    },
  },
} as const
