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
          created_at: string | null
          id: string
          location: string | null
          session_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          session_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          session_id?: string | null
        }
      }
      code_directory: {
        Row: {
          account_id: string | null
          created_at: string
          directory_explaination: string | null
          directory_explaination_embedding: unknown | null
          directory_name: string | null
          file_path: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          directory_explaination?: string | null
          directory_explaination_embedding?: unknown | null
          directory_name?: string | null
          file_path?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string
          directory_explaination?: string | null
          directory_explaination_embedding?: unknown | null
          directory_name?: string | null
          file_path?: string | null
          id?: number
          updated_at?: string | null
        }
      }
      code_file: {
        Row: {
          code_directory_id: number | null
          created_at: string
          file_explaination: string | null
          file_explaination_embedding: unknown | null
          file_name: string | null
          file_path: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          code_directory_id?: number | null
          created_at?: string
          file_explaination?: string | null
          file_explaination_embedding?: unknown | null
          file_name?: string | null
          file_path?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          code_directory_id?: number | null
          created_at?: string
          file_explaination?: string | null
          file_explaination_embedding?: unknown | null
          file_name?: string | null
          file_path?: string | null
          id?: number
          updated_at?: string | null
        }
      }
      code_snippet: {
        Row: {
          code_embedding: unknown | null
          code_explaination: string | null
          code_explaination_embedding: unknown | null
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
          code_embedding?: unknown | null
          code_explaination?: string | null
          code_explaination_embedding?: unknown | null
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
          code_embedding?: unknown | null
          code_explaination?: string | null
          code_explaination_embedding?: unknown | null
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
      messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["message_role"] | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["message_role"] | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["message_role"] | null
          session_id?: string | null
          user_id?: string | null
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
          created_at: string | null
          id: string
          input: string | null
          inputClassificaiton: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          input?: string | null
          inputClassificaiton?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          input?: string | null
          inputClassificaiton?: string | null
          user_id?: string | null
        }
      }
      session: {
        Row: {
          code_content: string | null
          created_at: string | null
          file_name: string | null
          file_path: string | null
          functionality: string | null
          id: string
          location: string | null
          new_file: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          code_content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          functionality?: string | null
          id: string
          location?: string | null
          new_file?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          code_content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_path?: string | null
          functionality?: string | null
          id?: string
          location?: string | null
          new_file?: boolean | null
          updated_at?: string | null
          user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_code: {
        Args: {
          query_embedding: unknown
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
      match_code_file: {
        Args: {
          query_embedding: unknown
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
      match_documents: {
        Args: {
          query_embedding: unknown
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
