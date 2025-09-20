import { paypalService } from '../services/paypalService';

export interface SimpleUser {
  id: string
  email: string
  full_name?: string
  credits: number
  subscription_tier: 'free' | 'premium'
  subscription_id?: string
  subscription_active: boolean
  created_at: string
}

export class SimpleAuthService {
  private static readonly STORAGE_KEY = 'rx_user'
  private static readonly CREDITS_KEY = 'rx_credits'

  // Create a new user (no email verification needed)
  static async createUser(email: string, fullName?: string): Promise<{ user: SimpleUser, error: string | null }> {
    try {
      const user: SimpleUser = {
        id: this.generateUserId(),
        email: email.toLowerCase(),
        full_name: fullName,
        credits: 3, // Free tier gets 3 credits
        subscription_tier: 'free',
        subscription_active: false,
        created_at: new Date().toISOString()
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
      localStorage.setItem(this.CREDITS_KEY, user.credits.toString())

      return { user, error: null }
    } catch (error) {
      return { user: null as any, error: error instanceof Error ? error.message : 'Failed to create user' }
    }
  }

  // Sign in existing user
  static async signIn(email: string): Promise<{ success: boolean, error: string | null }> {
    try {
      const existingUser = await this.getCurrentUser()

      if (existingUser && existingUser.email === email.toLowerCase()) {
        // Check PayPal subscription status and update user
        await this.syncWithPayPal(existingUser)
        return { success: true, error: null }
      }

      // Create new user if doesn't exist
      const result = await this.createUser(email)
      if (result.error) {
        return { success: false, error: result.error }
      }

      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign in' }
    }
  }

  // Sign out
  static async signOut(): Promise<{ success: boolean, error: string | null }> {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.CREDITS_KEY)
      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to sign out' }
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<SimpleUser | null> {
    try {
      const userData = localStorage.getItem(this.STORAGE_KEY)
      if (!userData) {
        return null
      }

      const user = JSON.parse(userData) as SimpleUser

      // Update credits from storage
      const credits = parseInt(localStorage.getItem(this.CREDITS_KEY) || '3')
      user.credits = credits

      // Sync with PayPal to get latest subscription status
      await this.syncWithPayPal(user)

      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  // Update user credits
  static async updateCredits(creditsUsed: number): Promise<{ success: boolean, remainingCredits?: number }> {
    try {
      const user = await this.getCurrentUser()
      if (!user) {
        return { success: false }
      }

      // Check if user has active subscription first
      const usageInfo = await paypalService.checkUserAccess(user.id)

      if (usageInfo.has_active_subscription) {
        // Unlimited searches for subscribers
        return { success: true, remainingCredits: Infinity }
      }

      const newCredits = Math.max(0, user.credits - creditsUsed)
      user.credits = newCredits

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
      localStorage.setItem(this.CREDITS_KEY, newCredits.toString())

      return { success: true, remainingCredits: newCredits }
    } catch (error) {
      console.error('Error updating credits:', error)
      return { success: false }
    }
  }

  // Check if user has enough credits or active subscription
  static async hasEnoughCredits(creditsNeeded: number = 1): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()
      if (!user) {
        return false
      }

      // Check PayPal subscription status
      const usageInfo = await paypalService.checkUserAccess(user.id)

      if (usageInfo.has_active_subscription) {
        return true // Unlimited access for subscribers
      }

      return user.credits >= creditsNeeded
    } catch (error) {
      console.error('Error checking credits:', error)
      return false
    }
  }

  // Get remaining credits (returns Infinity for subscribers)
  static async getRemainingCredits(): Promise<number> {
    try {
      const user = await this.getCurrentUser()
      if (!user) {
        return 0
      }

      const usageInfo = await paypalService.checkUserAccess(user.id)

      if (usageInfo.has_active_subscription) {
        return Infinity // Unlimited for subscribers
      }

      return user.credits
    } catch (error) {
      console.error('Error getting remaining credits:', error)
      return 0
    }
  }

  // Update subscription status from PayPal
  static async updateSubscriptionStatus(subscriptionId: string, isActive: boolean): Promise<{ success: boolean, error: string | null }> {
    try {
      const user = await this.getCurrentUser()
      if (!user) {
        return { success: false, error: 'No user logged in' }
      }

      user.subscription_id = subscriptionId
      user.subscription_active = isActive
      user.subscription_tier = isActive ? 'premium' : 'free'

      // If subscription is active, give unlimited credits
      if (isActive) {
        user.credits = Infinity
        localStorage.setItem(this.CREDITS_KEY, 'Infinity')
      } else {
        // If subscription cancelled, reset to free tier
        user.credits = 3
        localStorage.setItem(this.CREDITS_KEY, '3')
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))

      return { success: true, error: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update subscription' }
    }
  }

  // Sync user data with PayPal
  private static async syncWithPayPal(user: SimpleUser): Promise<void> {
    try {
      const usageInfo = await paypalService.checkUserAccess(user.id)

      // Update subscription status
      user.subscription_active = usageInfo.has_active_subscription
      user.subscription_tier = usageInfo.has_active_subscription ? 'premium' : 'free'

      // Update credits based on subscription status
      if (usageInfo.has_active_subscription) {
        user.credits = Infinity
        localStorage.setItem(this.CREDITS_KEY, 'Infinity')
      } else {
        // For free users, sync with actual usage from PayPal
        user.credits = Math.max(0, usageInfo.searches_limit - usageInfo.searches_used)
        localStorage.setItem(this.CREDITS_KEY, user.credits.toString())
      }

      // Save updated user data
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
    } catch (error) {
      console.error('Error syncing with PayPal:', error)
      // Don't throw error, just log it - user can still use the app
    }
  }

  // Listen to auth state changes (for React components)
  static onAuthStateChange(callback: (user: SimpleUser | null) => void) {
    const handleStorageChange = async () => {
      const user = await this.getCurrentUser()
      callback(user)
    }

    window.addEventListener('storage', handleStorageChange)

    // Initial call
    handleStorageChange()

    return {
      unsubscribe: () => {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }

  // Generate unique user ID
  private static generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
}
