import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a separate anonymous client for operations that don't need authentication
let anonymousSupabase: any = null

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    anonymousSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
  } catch (error) {
    console.warn('Failed to initialize anonymous Supabase client:', error)
    anonymousSupabase = null
  }
}

export { anonymousSupabase }
