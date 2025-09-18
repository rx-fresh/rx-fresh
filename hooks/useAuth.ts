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
    // Get initial user
    AuthService.getCurrentUser().then(user => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
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
