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
      evaluation_criteria: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          weight: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          weight: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: []
      }
      evaluation_scores: {
        Row: {
          comments: string | null
          created_at: string
          criteria_id: string | null
          evaluation_id: string | null
          id: string
          score: number
          updated_at: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          criteria_id?: string | null
          evaluation_id?: string | null
          id?: string
          score: number
          updated_at?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          criteria_id?: string | null
          evaluation_id?: string | null
          id?: string
          score?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          categories: Json | null
          created_at: string | null
          description: string | null
          end_date: string | null
          evaluator_id: string
          id: string
          metadata: Json | null
          progress: number | null
          questions: Json | null
          start_date: string | null
          status: Database["public"]["Enums"]["evaluation_status"] | null
          title: string
          total_score: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          categories?: Json | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          evaluator_id: string
          id?: string
          metadata?: Json | null
          progress?: number | null
          questions?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"] | null
          title: string
          total_score?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          categories?: Json | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          evaluator_id?: string
          id?: string
          metadata?: Json | null
          progress?: number | null
          questions?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"] | null
          title?: string
          total_score?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          module: string
          name: string
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          name: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profile_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_type: string
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_type: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_type?: string
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_details: Json | null
          company_logo: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          department: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_details?: Json | null
          company_logo?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          department?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_details?: Json | null
          company_logo?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          department?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          metadata: Json | null
          options: Json
          order_index: number | null
          question_text: string
          subcategory: string | null
          updated_at: string | null
          validation_rules: Json | null
          weight: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          metadata?: Json | null
          options?: Json
          order_index?: number | null
          question_text: string
          subcategory?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
          weight?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          metadata?: Json | null
          options?: Json
          order_index?: number | null
          question_text?: string
          subcategory?: string | null
          updated_at?: string | null
          validation_rules?: Json | null
          weight?: number | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          action_plan: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: number | null
          question_id: string
          recommendation_text: string
          resources: Json | null
          response_id: string
          status: Database["public"]["Enums"]["recommendation_status"] | null
          updated_at: string | null
        }
        Insert: {
          action_plan?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          question_id: string
          recommendation_text: string
          resources?: Json | null
          response_id: string
          status?: Database["public"]["Enums"]["recommendation_status"] | null
          updated_at?: string | null
        }
        Update: {
          action_plan?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: number | null
          question_id?: string
          recommendation_text?: string
          resources?: Json | null
          response_id?: string
          status?: Database["public"]["Enums"]["recommendation_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          created_at: string | null
          evaluation_id: string
          evidence_urls: string[] | null
          id: string
          metadata: Json | null
          notes: string | null
          question_id: string
          response_value: string
          review_date: string | null
          reviewed_by: string | null
          score: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evaluation_id: string
          evidence_urls?: string[] | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          question_id: string
          response_value: string
          review_date?: string | null
          reviewed_by?: string | null
          score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evaluation_id?: string
          evidence_urls?: string[] | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          question_id?: string
          response_value?: string
          review_date?: string | null
          reviewed_by?: string | null
          score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          contact_phone: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          last_sign_in_at: string | null
          profile_id: string | null
          role_id: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean | null
          last_sign_in_at?: string | null
          profile_id?: string | null
          role_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          last_sign_in_at?: string | null
          profile_id?: string | null
          role_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          rut: string
          services_provided: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rut: string
          services_provided?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rut?: string
          services_provided?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_users_cache: {
        Row: {
          id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_role_permissions: {
        Args: { role_name: string; permission_names: string[] }
        Returns: undefined
      }
      get_all_users_for_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          contact_phone: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          last_sign_in_at: string | null
          profile_id: string | null
          role_id: string | null
          updated_at: string | null
          vendor_id: string | null
        }[]
      }
      get_user_by_id: {
        Args: { user_id: string }
        Returns: {
          contact_phone: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          last_sign_in_at: string | null
          profile_id: string | null
          role_id: string | null
          updated_at: string | null
          vendor_id: string | null
        }[]
      }
      get_user_permissions: {
        Args: { user_id: string }
        Returns: {
          name: string
          module: string
          action: string
        }[]
      }
      get_users_by_vendor: {
        Args: { vendor_id: string }
        Returns: {
          contact_phone: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          last_sign_in_at: string | null
          profile_id: string | null
          role_id: string | null
          updated_at: string | null
          vendor_id: string | null
        }[]
      }
      has_permission: {
        Args: { user_id: string; module: string; action: string }
        Returns: boolean
      }
    }
    Enums: {
      evaluation_status:
        | "draft"
        | "in_progress"
        | "pending_review"
        | "completed"
        | "archived"
      recommendation_status:
        | "pending"
        | "in_progress"
        | "implemented"
        | "rejected"
      user_role: "admin" | "evaluator" | "supplier"
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
      evaluation_status: [
        "draft",
        "in_progress",
        "pending_review",
        "completed",
        "archived",
      ],
      recommendation_status: [
        "pending",
        "in_progress",
        "implemented",
        "rejected",
      ],
      user_role: ["admin", "evaluator", "supplier"],
    },
  },
} as const
