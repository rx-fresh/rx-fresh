import React, { useState, useEffect, createContext, useContext } from 'react'
import { SimpleAuthService, SimpleUser } from '../lib/simpleAuth'
import { paypalService } from '../services/paypalService'

interface AuthContextType {
  user: SimpleUser | null
  loading: boolean
  signIn: (email: string) => Promise<{ success: boolean, error: string | null }>
  signOut: () => Promise<{ success: boolean, error: string | null }>
  createUser: (email: string, fullName?: string) => Promise<{ user: SimpleUser, error: string | null }>
  refreshUser: () => Promise<void>
  hasEnoughCredits: (credits?: number) => Promise<boolean>
  getRemainingCredits: () => Promise<number>
  updateSubscriptionStatus: (subscriptionId: string, isActive: boolean) => Promise<{ success: boolean, error: string | null }>
  getUserStatus: () => Promise<{
    hasSubscription: boolean
    searchesUsed: number
    searchesLimit: number
    searchesRemaining: number
  }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useSimpleAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
}

export const SimpleAuthProvider = ({ children }: { children: any }) => {
  const [user, setUser] = useState<SimpleUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load initial user
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

    // Listen for auth changes
    const { unsubscribe } = SimpleAuthService.onAuthStateChange((newUser) => {
      setUser(newUser)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string) => {
    const result = await SimpleAuthService.signIn(email)
    if (result.success) {
      const updatedUser = await SimpleAuthService.getCurrentUser()
      setUser(updatedUser)
    }
    return result
  }

  const signOut = async () => {
    const result = await SimpleAuthService.signOut()
    if (result.success) {
      setUser(null)
    }
    return result
  }

  const createUser = async (email: string, fullName?: string) => {
    const result = await SimpleAuthService.createUser(email, fullName)
    if (result.user) {
      setUser(result.user)
    }
    return result
  }

  const refreshUser = async () => {
    const updatedUser = await SimpleAuthService.getCurrentUser()
    setUser(updatedUser)
  }

  const hasEnoughCredits = async (credits: number = 1) => {
    return await SimpleAuthService.hasEnoughCredits(credits)
  }

  const getRemainingCredits = async () => {
    return await SimpleAuthService.getRemainingCredits()
  }

  const updateSubscriptionStatus = async (subscriptionId: string, isActive: boolean) => {
    const result = await SimpleAuthService.updateSubscriptionStatus(subscriptionId, isActive)
    if (result.success) {
      const updatedUser = await SimpleAuthService.getCurrentUser()
      setUser(updatedUser)
    }
    return result
  }

  const getUserStatus = async () => {
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

      const usageInfo = await paypalService.checkUserAccess(currentUser.id)

      return {
        hasSubscription: usageInfo.has_active_subscription,
        searchesUsed: usageInfo.searches_used,
        searchesLimit: usageInfo.searches_limit,
        searchesRemaining: Math.max(0, usageInfo.searches_limit - usageInfo.searches_used)
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

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    createUser,
    refreshUser,
    hasEnoughCredits,
    getRemainingCredits,
    updateSubscriptionStatus,
    getUserStatus
  }

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  )
}
