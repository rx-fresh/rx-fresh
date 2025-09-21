import { useState, useEffect, createContext, useContext } from 'react'
import { AuthUser, AuthService } from '../lib/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string) => Promise<{ success: boolean, error: string | null }>
  signOut: () => Promise<{ success: boolean, error: string | null }>
  createUser: (email: string, fullName?: string) => Promise<{ user: any, error: string | null }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const useAuthState = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get timeout values from environment or use defaults
    const authTimeout = parseInt(import.meta.env.VITE_AUTH_TIMEOUT || '10000')
    const loadingTimeout = parseInt(import.meta.env.VITE_LOADING_TIMEOUT || '15000')
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth loading timed out, setting loading to false')
      setLoading(false)
      setUser(null) // Set user to null on timeout
    }, loadingTimeout)

    // Get initial user with timeout
    const initUser = async () => {
      try {
        const user = await Promise.race([
          AuthService.getCurrentUser(),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('User fetch timeout')), authTimeout)
          )
        ])
        console.log('Initial user loaded:', user?.email || 'No user')
        setUser(user)
        setLoading(false)
        clearTimeout(timeoutId)
      } catch (error) {
        console.error('Error loading initial user:', error)
        setUser(null)
        setLoading(false)
        clearTimeout(timeoutId)
      }
    }

    initUser()

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      console.log('Auth state changed:', user?.email || 'No user')
      setUser(user)
      setLoading(false)
      clearTimeout(timeoutId)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [])

  const signIn = async (email: string) => {
    return await AuthService.signIn(email)
  }

  const signOut = async () => {
    const result = await AuthService.signOut()
    if (result.success) {
      setUser(null)
    }
    return result
  }

  const createUser = async (email: string, fullName?: string) => {
    return await AuthService.createSupabaseUser(email, fullName)
  }

  const refreshUser = async () => {
    const user = await AuthService.getCurrentUser()
    setUser(user)
  }

  return {
    user,
    loading,
    signIn,
    signOut,
    createUser,
    refreshUser
  }
}

export { AuthContext }
