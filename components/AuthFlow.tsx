import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface AuthFlowProps {
  onComplete: () => void
  title?: string
  subtitle?: string
}

export const AuthFlow: React.FC<AuthFlowProps> = ({ 
  onComplete, 
  title = "Sign in to continue",
  subtitle = "Enter your email to receive a magic link"
}) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'email' | 'check-email'>('email')
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setError(null)

    const { success, error: authError } = await signIn(email)
    
    setIsLoading(false)

    if (success) {
      setStep('check-email')
    } else {
      setError(authError || 'Failed to send magic link')
    }
  }

  if (step === 'check-email') {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">Check your email</h3>
        <p className="text-gray-400">
          We sent a magic link to <span className="text-white font-medium">{email}</span>
        </p>
        <p className="text-sm text-gray-500">
          Click the link in your email to sign in. You can close this window.
        </p>
        <button
          onClick={() => setStep('email')}
          className="text-cyan-400 hover:text-cyan-300 text-sm underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-gray-400">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            required
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span>Sending magic link...</span>
            </div>
          ) : (
            'Continue with Email'
          )}
        </button>
      </form>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
