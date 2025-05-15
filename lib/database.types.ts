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
      evaluation_questions: {
        Row: {
          created_at: string | null
          evaluation_id: string
          id: string
          order_index: number | null
          question_id: string
        }
        Insert: {
          created_at?: string | null
          evaluation_id: string
          id?: string
          order_index?: number | null
          question_id: string
        }
        Update: {
          created_at?: string | null
          evaluation_id?: string
          id?: string
          order_index?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_questions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_vendors: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          completed_at: string | null
          evaluation_id: string
          id: string
          metadata: Json | null
          status: string | null
          vendor_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          evaluation_id: string
          id?: string
          metadata?: Json | null
          status?: string | null
          vendor_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          completed_at?: string | null
          evaluation_id?: string
          id?: string
          metadata?: Json | null
          status?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_vendors_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_vendors_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          evaluator_id: string
          id: string
          metadata: Json | null
          progress: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["evaluation_status"] | null
          title: string
          total_score: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          evaluator_id: string
          id?: string
          metadata?: Json | null
          progress?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["evaluation_status"] | null
          title: string
          total_score?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          evaluator_id?: string
          id?: string
          metadata?: Json | null
          progress?: number | null
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
          id: string
          created_at: string | null
          updated_at: string | null
          category: string
          subcategory: string | null
          question_text: string
          description: string | null
          options: Json
          weight: number
          is_required: boolean | null
          order_index: number | null
          validation_rules: Json | null
          metadata: Json | null
          type: Database["public"]["Enums"]["question_type"]
          recommendation_text: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          category: string
          subcategory?: string | null
          question_text: string
          description?: string | null
          options: Json
          weight: number
          is_required?: boolean | null
          order_index?: number | null
          validation_rules?: Json | null
          metadata?: Json | null
          type: Database["public"]["Enums"]["question_type"]
          recommendation_text?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          category?: string
          subcategory?: string | null
          question_text?: string
          description?: string | null
          options?: Json
          weight?: number
          is_required?: boolean | null
          order_index?: number | null
          validation_rules?: Json | null
          metadata?: Json | null
          type?: Database["public"]["Enums"]["question_type"]
          recommendation_text?: string | null
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
          evaluation_question_id: string | null
          evaluation_vendor_id: string | null
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
          evaluation_question_id?: string | null
          evaluation_vendor_id?: string | null
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
          evaluation_question_id?: string | null
          evaluation_vendor_id?: string | null
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
            foreignKeyName: "recommendations_evaluation_question_id_fkey"
            columns: ["evaluation_question_id"]
            isOneToOne: false
            referencedRelation: "evaluation_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_evaluation_vendor_id_fkey"
            columns: ["evaluation_vendor_id"]
            isOneToOne: false
            referencedRelation: "evaluation_vendors"
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
          answer: Database["public"]["Enums"]["answer_enum"] | null
          created_at: string | null
          evaluation_id: string
          evaluation_question_id: string | null
          evaluation_vendor_id: string | null
          evidence_urls: string[] | null
          id: string
          metadata: Json | null
          notes: string | null
          question_id: string
          response_value: string
          review_date: string | null
          reviewed_by: string | null
          score: number
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          answer?: Database["public"]["Enums"]["answer_enum"] | null
          created_at?: string | null
          evaluation_id: string
          evaluation_question_id?: string | null
          evaluation_vendor_id?: string | null
          evidence_urls?: string[] | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          question_id: string
          response_value: string
          review_date?: string | null
          reviewed_by?: string | null
          score?: number
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          answer?: Database["public"]["Enums"]["answer_enum"] | null
          created_at?: string | null
          evaluation_id?: string
          evaluation_question_id?: string | null
          evaluation_vendor_id?: string | null
          evidence_urls?: string[] | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          question_id?: string
          response_value?: string
          review_date?: string | null
          reviewed_by?: string | null
          score?: number
          updated_at?: string | null
          vendor_id?: string | null
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
            foreignKeyName: "responses_evaluation_question_id_fkey"
            columns: ["evaluation_question_id"]
            isOneToOne: false
            referencedRelation: "evaluation_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_evaluation_vendor_id_fkey"
            columns: ["evaluation_vendor_id"]
            isOneToOne: false
            referencedRelation: "evaluation_vendors"
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
          {
            foreignKeyName: "responses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
      answer_enum: "Yes" | "No" | "N/A"
      evaluation_status:
        | "draft"
        | "in_progress"
        | "pending_review"
        | "completed"
        | "archived"
      question_type: "escala 1-5" | "si/no/no aplica"
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
      answer_enum: ["Yes", "No", "N/A"],
      evaluation_status: [
        "draft",
        "in_progress",
        "pending_review",
        "completed",
        "archived",
      ],
      question_type: ["escala 1-5", "si/no/no aplica"],
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
