export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    company_name: string
                    contact_email: string
                    role: string
                    is_active: boolean
                    contact_phone: string
                    created_at: string
                    last_login: string
                    department: string
                    avatar_url: string
                    business_details: Json
                }
                Insert: {
                    id: string
                    company_name: string
                    contact_email: string
                    role?: string
                    is_active?: boolean
                    contact_phone?: string
                    created_at?: string
                    last_login?: string
                    department?: string
                    avatar_url?: string
                    business_details?: Json
                }
                Update: {
                    id?: string
                    company_name?: string
                    contact_email?: string
                    role?: string
                    is_active?: boolean
                    contact_phone?: string
                    created_at?: string
                    last_login?: string
                    department?: string
                    avatar_url?: string
                    business_details?: Json
                }
            }
            vendors: {
                Row: {
                    id: string
                    name: string
                    description: string
                    contact_email: string
                    contact_phone: string
                    address: string
                    category: string
                    status: string
                    rating: number
                    created_at: string
                    updated_at: string
                    compliance_score: number
                    risk_level: string
                    evaluations_count: number
                    last_evaluation_date: string
                }
                Insert: {
                    id: string
                    name: string
                    description: string
                    contact_email: string
                    contact_phone?: string
                    address?: string
                    category?: string
                    status?: string
                    rating?: number
                    created_at?: string
                    updated_at?: string
                    compliance_score?: number
                    risk_level?: string
                    evaluations_count?: number
                    last_evaluation_date?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string
                    contact_email?: string
                    contact_phone?: string
                    address?: string
                    category?: string
                    status?: string
                    rating?: number
                    created_at?: string
                    updated_at?: string
                    compliance_score?: number
                    risk_level?: string
                    evaluations_count?: number
                    last_evaluation_date?: string
                }
            }
            evaluations: {
                Row: {
                    id: string
                    title: string
                    description: string
                    type: string
                    vendor_id: string
                    evaluator_id: string
                    evaluator_name: string
                    evaluator_role: string
                    start_date: string
                    end_date: string
                    status: string
                    score: number | null
                    is_anonymous: boolean
                    created_at: string
                    updated_at: string
                    categories: Json
                    comments: Json
                    settings: Json
                    questions: Json
                }
                Insert: {
                    id: string
                    title: string
                    description: string
                    type: string
                    vendor_id: string
                    evaluator_id: string
                    evaluator_name: string
                    evaluator_role: string
                    start_date: string
                    end_date: string
                    status?: string
                    score?: number | null
                    is_anonymous?: boolean
                    created_at?: string
                    updated_at?: string
                    categories?: Json
                    comments?: Json
                    settings?: Json
                    questions?: Json
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string
                    type?: string
                    vendor_id?: string
                    evaluator_id?: string
                    evaluator_name?: string
                    evaluator_role?: string
                    start_date?: string
                    end_date?: string
                    status?: string
                    score?: number | null
                    is_anonymous?: boolean
                    created_at?: string
                    updated_at?: string
                    categories?: Json
                    comments?: Json
                    settings?: Json
                    questions?: Json
                }
            }
            recommendations: {
                Row: {
                    id: string
                    evaluation_id: string
                    vendor_id: string
                    title: string
                    description: string
                    priority: string
                    status: string
                    assigned_to: string
                    due_date: string
                    created_at: string
                    updated_at: string
                    category: string
                    impact: string
                    effort: string
                    comments: Json
                }
                Insert: {
                    id: string
                    evaluation_id: string
                    vendor_id: string
                    title: string
                    description: string
                    priority: string
                    status?: string
                    assigned_to: string
                    due_date: string
                    created_at?: string
                    updated_at?: string
                    category: string
                    impact: string
                    effort: string
                    comments?: Json
                }
                Update: {
                    id?: string
                    evaluation_id?: string
                    vendor_id?: string
                    title?: string
                    description?: string
                    priority?: string
                    status?: string
                    assigned_to?: string
                    due_date?: string
                    created_at?: string
                    updated_at?: string
                    category?: string
                    impact?: string
                    effort?: string
                    comments?: Json
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
} 