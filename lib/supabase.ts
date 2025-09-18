import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          credits: number
          subscription_tier: 'free' | 'premium' | 'pro'
          subscription_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          credits?: number
          subscription_tier?: 'free' | 'premium' | 'pro'
          subscription_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          credits?: number
          subscription_tier?: 'free' | 'premium' | 'pro'
          subscription_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      search_logs: {
        Row: {
          id: string
          user_id: string
          query: string
          results_count: number
          credits_used: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query: string
          results_count: number
          credits_used: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query?: string
          results_count?: number
          credits_used?: number
          created_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          credits: number
          price: number
          features: string[]
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          credits: number
          price: number
          features: string[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          credits?: number
          price?: number
          features?: string[]
          created_at?: string
        }
      }
      feature_flags: {
        Row: {
          id: string
          name: string
          enabled: boolean
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          enabled: boolean
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          enabled?: boolean
          user_id?: string | null
          created_at?: string
        }
      }
    }
  }
}
