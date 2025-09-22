import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface User {
  id: string
  email: string
  full_name?: string
  credits: number
  subscription_tier: string
  subscription_active: boolean
  subscription_expires_at?: string
  created_at?: string
  subscription_id?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string) => Promise<{ success: boolean; error: string | null }>
  signOut: () => Promise<{ success: boolean; error: string | null }>
  createUser: (email: string, fullName: string) => Promise<{ user: User | null; error: string | null }>
  refreshUser: () => Promise<void>
  hasEnoughCredits: (credits?: number) => Promise<boolean>
  getRemainingCredits: () => Promise<number>
  updateSubscriptionStatus: (subscriptionId: string, active: boolean) => Promise<{ success: boolean; error: string | null }>
  getUserStatus: () => Promise<{
    hasSubscription: boolean
    searchesUsed: number
    searchesLimit: number
    searchesRemaining: number
  }>
}

const STORAGE_KEY = 'rx_user'
const CREDITS_KEY = 'rx_credits'

class SimpleAuthService {
  static generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  static async createUser(email: string, fullName?: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const user: User = {
        id: this.generateUserId(),
        email: email.toLowerCase(),
        full_name: fullName,
        credits: 3,
        subscription_tier: 'free',
        subscription_active: false,
        created_at: new Date().toISOString()
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      localStorage.setItem(CREDITS_KEY, user.credits.toString())

      return { user, error: null }
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Failed to create user' }
    }
  }

  static async signIn(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const existingUser = await this.getCurrentUser()
      if (existingUser && existingUser.email === email.toLowerCase()) {
        return { success: true, error: null }
      }

      const result = await this.createUser(email)
      return result.error ? { success: false, error: result.error } : { success: true, error: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign in' }
    }
  }

  static async signOut(): Promise<{ success: boolean; error: string | null }> {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(CREDITS_KEY)
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign out' }
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const userData = localStorage.getItem(STORAGE_KEY)
      if (!userData) return null

      const user = JSON.parse(userData)
      const credits = parseInt(localStorage.getItem(CREDITS_KEY) || '3')
      user.credits = credits

      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  static async updateCredits(creditsToUse: number): Promise<{ success: boolean; remainingCredits: number }> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return { success: false, remainingCredits: 0 }

      const remainingCredits = Math.max(0, user.credits - creditsToUse)
      user.credits = remainingCredits

      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      localStorage.setItem(CREDITS_KEY, remainingCredits.toString())

      return { success: true, remainingCredits }
    } catch (error) {
      console.error('Error updating credits:', error)
      return { success: false, remainingCredits: 0 }
    }
  }

  static async hasEnoughCredits(creditsToUse: number = 1): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()
      return user ? user.credits >= creditsToUse : false
    } catch (error) {
      console.error('Error checking credits:', error)
      return false
    }
  }

  static async getRemainingCredits(): Promise<number> {
    try {
      const user = await this.getCurrentUser()
      return user ? user.credits : 0
    } catch (error) {
      console.error('Error getting remaining credits:', error)
      return 0
    }
  }

  static async updateSubscriptionStatus(subscriptionId: string, active: boolean): Promise<{ success: boolean; error: string | null }> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return { success: false, error: 'No user logged in' }

      user.subscription_id = subscriptionId
      user.subscription_active = active
      user.subscription_tier = active ? 'premium' : 'free'

      if (active) {
        user.credits = Infinity
        localStorage.setItem(CREDITS_KEY, 'Infinity')
      } else {
        user.credits = 3
        localStorage.setItem(CREDITS_KEY, '3')
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update subscription' }
    }
  }

  static onAuthStateChange(callback: (user: User | null) => void): { unsubscribe: () => void } {
    const handleStorageChange = async () => {
      const user = await this.getCurrentUser()
      callback(user)
    }

    window.addEventListener('storage', handleStorageChange)
    handleStorageChange()

    return {
      unsubscribe: () => {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }
}

const SimpleAuthContext = createContext<AuthContextType | undefined>(undefined)

export const useSimpleAuth = (): AuthContextType => {
  const context = useContext(SimpleAuthContext)
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
}

interface SimpleAuthProviderProps {
  children: React.ReactNode
}

export const SimpleAuthProvider: React.FC<SimpleAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await SimpleAuthService.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    const { unsubscribe } = SimpleAuthService.onAuthStateChange((newUser) => {
      setUser(newUser)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    signIn: async (email: string) => {
      const result = await SimpleAuthService.signIn(email)
      if (result.success) {
        const updatedUser = await SimpleAuthService.getCurrentUser()
        setUser(updatedUser)
      }
      return result
    },
    signOut: async () => {
      const result = await SimpleAuthService.signOut()
      if (result.success) {
        setUser(null)
      }
      return result
    },
    createUser: async (email: string, fullName: string) => {
      const result = await SimpleAuthService.createUser(email, fullName)
      if (result.user) {
        setUser(result.user)
      }
      return result
    },
    refreshUser: async () => {
      const updatedUser = await SimpleAuthService.getCurrentUser()
      setUser(updatedUser)
    },
    hasEnoughCredits: async (credits: number = 1) => {
      return await SimpleAuthService.hasEnoughCredits(credits)
    },
    getRemainingCredits: async () => {
      return await SimpleAuthService.getRemainingCredits()
    },
    updateSubscriptionStatus: async (subscriptionId: string, active: boolean) => {
      const result = await SimpleAuthService.updateSubscriptionStatus(subscriptionId, active)
      if (result.success) {
        const updatedUser = await SimpleAuthService.getCurrentUser()
        setUser(updatedUser)
      }
      return result
    },
    getUserStatus: async () => {
      try {
        const currentUser = await SimpleAuthService.getCurrentUser()
        if (!currentUser) {
          return {
            hasSubscription: false,
            searchesUsed: 0,
            searchesLimit: 3,
            searchesRemaining: 3
          }
        }

        return {
          hasSubscription: currentUser.subscription_active,
          searchesUsed: currentUser.subscription_active ? 0 : Math.max(0, 3 - currentUser.credits),
          searchesLimit: currentUser.subscription_active ? Infinity : 3,
          searchesRemaining: currentUser.subscription_active ? Infinity : currentUser.credits
        }
      } catch (error) {
        console.error('Error getting user status:', error)
        return {
          hasSubscription: false,
          searchesUsed: 0,
          searchesLimit: 3,
          searchesRemaining: 3
        }
      }
    }
  }

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  )
}
