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
          avg_compression_ratio: number | null
          children_completed: number | null
          children_failed: number | null
          children_pending: number | null
          completed_jobs: number | null
          compressed_content_size: number | null
          compressed_size: number | null
          compression_ratio: number | null
          content: string | null
          content_summary: string | null
          crawl_status: string | null
          created_at: string
          created_by: string | null
          discovery_completed: boolean | null
          duplicate_chunks: number | null
          error_message: string | null
          exclude_paths: string[] | null
          extraction_method: string | null
          failed_jobs: number | null
          file_path: string | null
          global_compression_ratio: number | null
          id: string
          include_paths: string[] | null
          is_active: boolean
          is_excluded: boolean | null
          keywords: string[] | null
          last_crawled_at: string | null
          links_count: number | null
          max_concurrent_jobs: number | null
          metadata: Json | null
          original_size: number | null
          parent_source_id: string | null
          progress: number | null
          raw_text: string | null
          requires_manual_training: boolean | null
          respect_robots: boolean | null
          source_type: Database["public"]["Enums"]["source_type"]
          status_history: Json | null
          team_id: string
          title: string
          total_children: number | null
          total_content_size: number | null
          total_jobs: number | null
          total_processing_time_ms: number | null
          unique_chunks: number | null
          updated_at: string
          updated_by: string | null
          url: string | null
        }
        Insert: {
          agent_id: string
          avg_compression_ratio?: number | null
          children_completed?: number | null
          children_failed?: number | null
          children_pending?: number | null
          completed_jobs?: number | null
          compressed_content_size?: number | null
          compressed_size?: number | null
          compression_ratio?: number | null
          content?: string | null
          content_summary?: string | null
          crawl_status?: string | null
          created_at?: string
          created_by?: string | null
          discovery_completed?: boolean | null
          duplicate_chunks?: number | null
          error_message?: string | null
          exclude_paths?: string[] | null
          extraction_method?: string | null
          failed_jobs?: number | null
          file_path?: string | null
          global_compression_ratio?: number | null
          id?: string
          include_paths?: string[] | null
          is_active?: boolean
          is_excluded?: boolean | null
          keywords?: string[] | null
          last_crawled_at?: string | null
          links_count?: number | null
          max_concurrent_jobs?: number | null
          metadata?: Json | null
          original_size?: number | null
          parent_source_id?: string | null
          progress?: number | null
          raw_text?: string | null
          requires_manual_training?: boolean | null
          respect_robots?: boolean | null
          source_type: Database["public"]["Enums"]["source_type"]
          status_history?: Json | null
          team_id: string
          title: string
          total_children?: number | null
          total_content_size?: number | null
          total_jobs?: number | null
          total_processing_time_ms?: number | null
          unique_chunks?: number | null
          updated_at?: string
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          agent_id?: string
          avg_compression_ratio?: number | null
          children_completed?: number | null
          children_failed?: number | null
          children_pending?: number | null
          completed_jobs?: number | null
          compressed_content_size?: number | null
          compressed_size?: number | null
          compression_ratio?: number | null
          content?: string | null
          content_summary?: string | null
          crawl_status?: string | null
          created_at?: string
          created_by?: string | null
          discovery_completed?: boolean | null
          duplicate_chunks?: number | null
          error_message?: string | null
          exclude_paths?: string[] | null
          extraction_method?: string | null
          failed_jobs?: number | null
          file_path?: string | null
          global_compression_ratio?: number | null
          id?: string
          include_paths?: string[] | null
          is_active?: boolean
          is_excluded?: boolean | null
          keywords?: string[] | null
          last_crawled_at?: string | null
          links_count?: number | null
          max_concurrent_jobs?: number | null
          metadata?: Json | null
          original_size?: number | null
          parent_source_id?: string | null
          progress?: number | null
          raw_text?: string | null
          requires_manual_training?: boolean | null
          respect_robots?: boolean | null
          source_type?: Database["public"]["Enums"]["source_type"]
          status_history?: Json | null
          team_id?: string
          title?: string
          total_children?: number | null
          total_content_size?: number | null
          total_jobs?: number | null
          total_processing_time_ms?: number | null
          unique_chunks?: number | null
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
          ai_instructions: string | null
          ai_model: string | null
          ai_prompt_template: string | null
          ai_temperature: number | null
          color: string
          created_at: string | null
          id: string
          image: string | null
          last_trained_at: string | null
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
          ai_instructions?: string | null
          ai_model?: string | null
          ai_prompt_template?: string | null
          ai_temperature?: number | null
          color: string
          created_at?: string | null
          id?: string
          image?: string | null
          last_trained_at?: string | null
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
          ai_instructions?: string | null
          ai_model?: string | null
          ai_prompt_template?: string | null
          ai_temperature?: number | null
          color?: string
          created_at?: string | null
          id?: string
          image?: string | null
          last_trained_at?: string | null
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
      connection_pool_config: {
        Row: {
          connection_timeout_ms: number | null
          created_at: string | null
          id: string
          idle_timeout_ms: number | null
          max_connections: number | null
          max_lifetime_ms: number | null
          min_connections: number | null
          pool_name: string
          updated_at: string | null
        }
        Insert: {
          connection_timeout_ms?: number | null
          created_at?: string | null
          id?: string
          idle_timeout_ms?: number | null
          max_connections?: number | null
          max_lifetime_ms?: number | null
          min_connections?: number | null
          pool_name: string
          updated_at?: string | null
        }
        Update: {
          connection_timeout_ms?: number | null
          created_at?: string | null
          id?: string
          idle_timeout_ms?: number | null
          max_connections?: number | null
          max_lifetime_ms?: number | null
          min_connections?: number | null
          pool_name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      crawl_jobs: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_jobs_parent_source_id_fkey"
            columns: ["parent_source_id"]
            isOneToOne: false
            referencedRelation: "agent_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_jobs_part_0: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      crawl_jobs_part_1: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      crawl_jobs_part_2: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      crawl_jobs_part_3: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      crawl_jobs_part_4: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      crawl_jobs_part_5: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      crawl_jobs_part_6: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      crawl_jobs_part_7: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      crawl_jobs_partitioned: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
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
      customer_load_distribution: {
        Row: {
          created_at: string | null
          current_load: number | null
          customer_id: string
          id: string
          last_assigned_at: string | null
          max_concurrent_jobs: number | null
          partition_id: number
          updated_at: string | null
          worker_pool: string
        }
        Insert: {
          created_at?: string | null
          current_load?: number | null
          customer_id: string
          id?: string
          last_assigned_at?: string | null
          max_concurrent_jobs?: number | null
          partition_id: number
          updated_at?: string | null
          worker_pool: string
        }
        Update: {
          created_at?: string | null
          current_load?: number | null
          customer_id?: string
          id?: string
          last_assigned_at?: string | null
          max_concurrent_jobs?: number | null
          partition_id?: number
          updated_at?: string | null
          worker_pool?: string
        }
        Relationships: []
      }
      customer_usage_tracking: {
        Row: {
          concurrent_requests: number | null
          created_at: string | null
          customer_id: string
          day_reset_at: string | null
          hour_reset_at: string | null
          id: string
          last_request_at: string | null
          minute_reset_at: string | null
          requests_last_day: number | null
          requests_last_hour: number | null
          requests_last_minute: number | null
          updated_at: string | null
        }
        Insert: {
          concurrent_requests?: number | null
          created_at?: string | null
          customer_id: string
          day_reset_at?: string | null
          hour_reset_at?: string | null
          id?: string
          last_request_at?: string | null
          minute_reset_at?: string | null
          requests_last_day?: number | null
          requests_last_hour?: number | null
          requests_last_minute?: number | null
          updated_at?: string | null
        }
        Update: {
          concurrent_requests?: number | null
          created_at?: string | null
          customer_id?: string
          day_reset_at?: string | null
          hour_reset_at?: string | null
          id?: string
          last_request_at?: string | null
          minute_reset_at?: string | null
          requests_last_day?: number | null
          requests_last_hour?: number | null
          requests_last_minute?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
      database_partitions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          partition_count: number
          partition_key: string
          partition_type: string
          table_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partition_count?: number
          partition_key: string
          partition_type: string
          table_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partition_count?: number
          partition_key?: string
          partition_type?: string
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      prompt_templates: {
        Row: {
          agent_id: string | null
          created_at: string | null
          description: string | null
          id: string
          instructions: string
          is_predefined: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructions: string
          is_predefined?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instructions?: string
          is_predefined?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      read_replica_config: {
        Row: {
          created_at: string | null
          endpoint_url: string
          id: string
          is_active: boolean | null
          latency_ms: number | null
          load_percentage: number | null
          max_connections: number | null
          region: string
          replica_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint_url: string
          id?: string
          is_active?: boolean | null
          latency_ms?: number | null
          load_percentage?: number | null
          max_connections?: number | null
          region: string
          replica_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint_url?: string
          id?: string
          is_active?: boolean | null
          latency_ms?: number | null
          load_percentage?: number | null
          max_connections?: number | null
          region?: string
          replica_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      semantic_chunks: {
        Row: {
          compressed_blob: string
          content_hash: string
          created_at: string
          id: string
          ref_count: number
          token_count: number
          updated_at: string
        }
        Insert: {
          compressed_blob: string
          content_hash: string
          created_at?: string
          id?: string
          ref_count?: number
          token_count: number
          updated_at?: string
        }
        Update: {
          compressed_blob?: string
          content_hash?: string
          created_at?: string
          id?: string
          ref_count?: number
          token_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      source_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string | null
          created_at: string
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      source_pages: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          compression_ratio: number | null
          content_hash: string | null
          content_size: number | null
          created_at: string
          customer_id: string
          duplicates_found: number | null
          error_message: string | null
          id: string
          max_retries: number | null
          parent_source_id: string
          priority: string | null
          processing_status: string | null
          processing_time_ms: number | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_hash?: string | null
          content_size?: number | null
          created_at?: string
          customer_id: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id: string
          priority?: string | null
          processing_status?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          compression_ratio?: number | null
          content_hash?: string | null
          content_size?: number | null
          created_at?: string
          customer_id?: string
          duplicates_found?: number | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          parent_source_id?: string
          priority?: string | null
          processing_status?: string | null
          processing_time_ms?: number | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_pages_parent_source_id_fkey"
            columns: ["parent_source_id"]
            isOneToOne: false
            referencedRelation: "agent_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      source_to_chunk_map: {
        Row: {
          chunk_id: string
          chunk_index: number
          created_at: string
          id: string
          source_id: string
        }
        Insert: {
          chunk_id: string
          chunk_index: number
          created_at?: string
          id?: string
          source_id: string
        }
        Update: {
          chunk_id?: string
          chunk_index?: number
          created_at?: string
          id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_to_chunk_map_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "semantic_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_to_chunk_map_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "agent_sources"
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
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          metadata?: Json | null
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
      aggregate_crawl_status: {
        Args: { parent_source_id_param: string }
        Returns: Json
      }
      aggregate_parent_status: {
        Args: { parent_id: string }
        Returns: undefined
      }
      assign_customer_to_pool: {
        Args: { target_customer_id: string }
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
      cleanup_unused_chunks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      decrement_chunk_refs: {
        Args: { source_id_param: string }
        Returns: number
      }
      decrement_concurrent_requests: {
        Args: { target_customer_id: string }
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
      fix_existing_parent_sources: {
        Args: Record<PropertyKey, never>
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
      get_partition_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          partition_name: string
          row_count: number
          size_bytes: number
        }[]
      }
      get_source_pages_stats: {
        Args: { parent_source_id_param: string }
        Returns: {
          total_count: number
          completed_count: number
          failed_count: number
          pending_count: number
          in_progress_count: number
        }[]
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
      increment_concurrent_requests: {
        Args: { target_customer_id: string }
        Returns: number
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
      mark_discovery_completed: {
        Args: { parent_source_id_param: string; total_discovered: number }
        Returns: boolean
      }
      process_batch_jobs: {
        Args: { batch_size?: number; target_customer_id?: string }
        Returns: Json
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
      spawn_child_jobs: {
        Args: {
          parent_source_id_param: string
          customer_id_param: string
          urls: string[]
          priority_param?: string
        }
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
