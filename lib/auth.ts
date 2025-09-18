import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  full_name?: string
  credits: number
  subscription_tier: 'free' | 'premium' | 'pro'
  subscription_expires_at?: string
}

export class AuthService {
  // Create user in our users table after signup
  static async createSupabaseUser(email: string, fullName?: string): Promise<{ user: User | null, error: string | null }> {
    try {
      // First, send magic link
      const { data, error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signInError) {
        return { user: null, error: signInError.message }
      }

      return { user: data.user, error: null }
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Failed to create user' }
    }
  }

  // Sign in with magic link
  static async signIn(email: string): Promise<{ success: boolean, error: string | null }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign in' }
    }
  }

  // Sign out
  static async signOut(): Promise<{ success: boolean, error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign out' }
    }
  }

  // Get current user profile
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name || undefined,
        credits: profile.credits,
        subscription_tier: profile.subscription_tier,
        subscription_expires_at: profile.subscription_expires_at || undefined
      }
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  // Create user profile after authentication
  static async createUserProfile(user: User, fullName?: string): Promise<AuthUser | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          credits: 3, // Free tier gets 3 credits
          subscription_tier: 'free'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
        return null
      }

      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name || undefined,
        credits: data.credits,
        subscription_tier: data.subscription_tier,
        subscription_expires_at: data.subscription_expires_at || undefined
      }
    } catch (error) {
      console.error('Error creating user profile:', error)
      return null
    }
  }

  // Update user credits after search
  static async updateCredits(userId: string, creditsUsed: number): Promise<{ success: boolean, remainingCredits?: number }> {
    try {
      const { data, error } = await supabase.rpc('deduct_credits', {
        user_id: userId,
        credits_to_deduct: creditsUsed
      })

      if (error) {
        console.error('Error updating credits:', error)
        return { success: false }
      }

      return { success: true, remainingCredits: data }
    } catch (error) {
      console.error('Error updating credits:', error)
      return { success: false }
    }
  }

  // Log search activity
  static async logSearch(userId: string, query: string, resultsCount: number, creditsUsed: number): Promise<void> {
    try {
      await supabase
        .from('search_logs')
        .insert({
          user_id: userId,
          query,
          results_count: resultsCount,
          credits_used: creditsUsed
        })
    } catch (error) {
      console.error('Error logging search:', error)
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await this.getCurrentUser()
        callback(profile)
      } else {
        callback(null)
      }
    })
  }
}
