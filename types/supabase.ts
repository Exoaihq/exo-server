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
      code_directory: {
        Row: {
          created_at: string
          directory_explaination: string | null
          directory_explaination_embedding: unknown | null
          directory_name: string | null
          file_path: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          directory_explaination?: string | null
          directory_explaination_embedding?: unknown | null
          directory_name?: string | null
          file_path?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
