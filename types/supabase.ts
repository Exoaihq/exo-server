export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      account: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
      }
      ai_created_code: {
        Row: {
          code: string | null
          completed_at: string | null
          created_at: string | null
          file_name: string | null
          functionality: string | null
          id: string
          location: string | null
          path: string | null
          session_id: string | null
          writen_to_file_at: string | null
        }
        Insert: {
          code?: string | null
          completed_at?: string | null
          created_at?: string | null
          file_name?: string | null
          functionality?: string | null
          id?: string
          location?: string | null
          path?: string | null
          session_id?: string | null
          writen_to_file_at?: string | null
        }
        Update: {
          code?: string | null
          completed_at?: string | null
          created_at?: string | null
          file_name?: string | null
          functionality?: string | null
          id?: string
          location?: string | null
          path?: string | null
          session_id?: string | null
          writen_to_file_at?: string | null
        }
      }
      app_helper_messages: {
        Row: {
          created_at: string | null
          id: number
          name: string | null
          text: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name?: string | null
          text?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string | null
          text?: string | null
        }
      }
      code_directory: {
        Row: {
          account_id: string | null
          created_at: string
          directory_explaination: string | null
          directory_explaination_embedding: string | null
          directory_name: string | null
          file_path: string | null
          id: number
          indexed_at: string | null
          is_root_directory: boolean
          parent_directory_id: number | null
          saved: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          directory_explaination?: string | null
          directory_explaination_embedding?: string | null
          directory_name?: string | null
          file_path?: string | null
          id?: number
          indexed_at?: string | null
          is_root_directory?: boolean
          parent_directory_id?: number | null
          saved?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          directory_explaination?: string | null
          directory_explaination_embedding?: string | null
          directory_name?: string | null
          file_path?: string | null
          id?: number
          indexed_at?: string | null
          is_root_directory?: boolean
          parent_directory_id?: number | null
          saved?: boolean | null
          updated_at?: string | null
        }
      }
      code_file: {
        Row: {
          account_id: string | null
          code_directory_id: number | null
          code_directory_parent_id: number | null
          created_at: string
          file_explaination: string | null
          file_explaination_embedding: string | null
          file_name: string | null
          file_path: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          code_directory_id?: number | null
          code_directory_parent_id?: number | null
          created_at?: string
          file_explaination?: string | null
          file_explaination_embedding?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          code_directory_id?: number | null
          code_directory_parent_id?: number | null
          created_at?: string
          file_explaination?: string | null
          file_explaination_embedding?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: number
          updated_at?: string | null
        }
      }
      code_snippet: {
        Row: {
          account_id: string | null
          code_embedding: string | null
          code_explaination: string | null
          code_explaination_embedding: string | null
          code_file_id: number | null
          code_string: string | null
          created_at: string
          end_column: number | null
          end_row: number | null
          file_name: string | null
          id: number
          parsed_code_type: string | null
          relative_file_path: string | null
          start_column: number | null
          start_row: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          code_embedding?: string | null
          code_explaination?: string | null
          code_explaination_embedding?: string | null
          code_file_id?: number | null
          code_string?: string | null
          created_at?: string
          end_column?: number | null
          end_row?: number | null
          file_name?: string | null
          id?: number
          parsed_code_type?: string | null
          relative_file_path?: string | null
          start_column?: number | null
          start_row?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          code_embedding?: string | null
          code_explaination?: string | null
          code_explaination_embedding?: string | null
          code_file_id?: number | null
          code_string?: string | null
          created_at?: string
          end_column?: number | null
          end_row?: number | null
          file_name?: string | null
          id?: number
          parsed_code_type?: string | null
          relative_file_path?: string | null
          start_column?: number | null
          start_row?: number | null
          updated_at?: string | null
        }
      }
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
        }
      }
      long_term_memory: {
        Row: {
          account_id: string | null
          id: string
          memory_context: string | null
          memory_embedding: string | null
          memory_text: string | null
        }
        Insert: {
          account_id?: string | null
          id?: string
          memory_context?: string | null
          memory_embedding?: string | null
          memory_text?: string | null
        }
        Update: {
          account_id?: string | null
          id?: string
          memory_context?: string | null
          memory_embedding?: string | null
          memory_text?: string | null
        }
      }
      message_prompts: {
        Row: {
          created_at: string | null
          id: string
          message_id: string | null
          prompt_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          prompt_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          prompt_id?: string | null
        }
      }
      messages: {
        Row: {
          content: string | null
          created_at: string | null
          created_location: string | null
          id: string
          is_helper_message: boolean
          role: Database["public"]["Enums"]["message_role"] | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_location?: string | null
          id?: string
          is_helper_message?: boolean
          role?: Database["public"]["Enums"]["message_role"] | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_location?: string | null
          id?: string
          is_helper_message?: boolean
          role?: Database["public"]["Enums"]["message_role"] | null
          session_id?: string | null
          user_id?: string | null
        }
      }
      objective: {
        Row: {
          created_at: string | null
          criticism: string | null
          id: string
          question: string | null
          reasoning: string | null
          session_id: string | null
          thought: string | null
        }
        Insert: {
          created_at?: string | null
          criticism?: string | null
          id?: string
          question?: string | null
          reasoning?: string | null
          session_id?: string | null
          thought?: string | null
        }
        Update: {
          created_at?: string | null
          criticism?: string | null
          id?: string
          question?: string | null
          reasoning?: string | null
          session_id?: string | null
          thought?: string | null
        }
      }
      openai_models: {
        Row: {
          created_at: string | null
          id: string
          object: string | null
          ready: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string | null
          id: string
          object?: string | null
          ready?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          object?: string | null
          ready?: boolean | null
          updated_at?: string
        }
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          description: string | null
          id: string
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count: number | null
          metadata: Json | null
          product_id: string | null
          trial_period_days: number | null
          type: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          metadata?: Json | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
      }
      products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
      }
      prompt: {
        Row: {
          body: string | null
          created_at: string | null
          description: string | null
          global: boolean | null
          id: string
          message_id: string | null
          name: string | null
          prefix: string | null
          suffix: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          description?: string | null
          global?: boolean | null
          id?: string
          message_id?: string | null
          name?: string | null
          prefix?: string | null
          suffix?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          description?: string | null
          global?: boolean | null
          id?: string
          message_id?: string | null
          name?: string | null
          prefix?: string | null
          suffix?: string | null
          user_id?: string | null
        }
      }
      session: {
        Row: {
          code_content: string | null
          created_at: string | null
          expected_next_action: string | null
          file_name: string | null
          file_path: string | null
          functionality: string | null
          id: string
          location: string | null
          new_file: boolean | null
          scratch_pad_content: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          code_content?: string | null
          created_at?: string | null
          expected_next_action?: string | null
          file_name?: string | null
          file_path?: string | null
          functionality?: string | null
          id: string
          location?: string | null
          new_file?: boolean | null
          scratch_pad_content?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          code_content?: string | null
          created_at?: string | null
          expected_next_action?: string | null
          file_name?: string | null
          file_path?: string | null
          functionality?: string | null
          id?: string
          location?: string | null
          new_file?: boolean | null
          scratch_pad_content?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
      }
      short_term_memory: {
        Row: {
          created_at: string | null
          id: string
          memory_context: string | null
          memory_embedding: string | null
          memory_text: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          memory_context?: string | null
          memory_embedding?: string | null
          memory_text?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          memory_context?: string | null
          memory_embedding?: string | null
          memory_text?: string | null
          session_id?: string | null
        }
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          price_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string
        }
      }
      task: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          objective_id: string | null
          tool_input: string | null
          tool_name: string | null
          tool_output: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          objective_id?: string | null
          tool_input?: string | null
          tool_name?: string | null
          tool_output?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          objective_id?: string | null
          tool_input?: string | null
          tool_name?: string | null
          tool_output?: string | null
        }
      }
      users: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          email: string | null
          full_name: string | null
          id: string
          payment_method: Json | null
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          email?: string | null
          full_name?: string | null
          id: string
          payment_method?: Json | null
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string
          payment_method?: Json | null
        }
      }
      wait_list: {
        Row: {
          created_at: string | null
          email: string | null
          id: number
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: number
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_code: {
        Args: {
          query_embedding: string
          similarity_threshold: number
          match_count: number
        }
        Returns: {
          id: number
          code_string: string
          code_explaination: string
          relative_file_path: string
          similarity: number
        }[]
      }
      match_code_directory: {
        Args: {
          accountid: string
          query_embedding: string
          similarity_threshold: number
          match_count: number
        }
        Returns: {
          id: number
          directory_explaination: string
          directory_name: string
          file_path: string
          created_at: string
          account_id: string
          indexed_at: string
          saved: boolean
          similarity: number
        }[]
      }
      match_code_file: {
        Args: {
          query_embedding: string
          similarity_threshold: number
          match_count: number
        }
        Returns: {
          id: number
          file_explaination: string
          file_name: string
          file_path: string
          similarity: number
        }[]
      }
      match_code_snippet_explaination: {
        Args: {
          accountid: string
          query_embedding: string
          similarity_threshold: number
          match_count: number
        }
        Returns: {
          id: number
          code_explaination: string
          code_string: string
          file_name: string
          relative_file_path: string
          created_at: string
          account_id: string
          parsed_code_type: string
          similarity: number
        }[]
      }
      match_documents: {
        Args: {
          query_embedding: string
          similarity_threshold: number
          match_count: number
        }
        Returns: {
          id: number
          code_string: string
          code_explaination: string
          relative_file_path: string
          similarity: number
        }[]
      }
      match_long_term_memory: {
        Args: {
          query_embedding: string
          similarity_threshold: number
          match_count: number
          accountid: string
        }
        Returns: {
          id: number
          memory_text: string
          memory_context: string
          account_id: string
          similarity: number
        }[]
      }
      match_short_term_memory: {
        Args: {
          query_embedding: string
          similarity_threshold: number
          match_count: number
          sessionid: string
        }
        Returns: {
          id: number
          memory_text: string
          memory_context: string
          session_id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      message_role: "user" | "system" | "assistant"
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
