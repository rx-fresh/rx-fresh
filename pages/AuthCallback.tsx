import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase-fixed'
import { AuthService } from '../lib/auth'

export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Processing authentication...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setStatus('error')
          setMessage('Authentication timed out. Redirecting to home...')
          setTimeout(() => window.location.href = '/', 3000)
        }, 15000) // 15 second timeout
        // Get the hash parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (!accessToken) {
          clearTimeout(timeoutId)
          setStatus('error')
          setMessage('No access token found in callback URL')
          return
        }

        // Set the session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })

        if (error) {
          clearTimeout(timeoutId)
          setStatus('error')
          setMessage(`Authentication error: ${error.message}`)
          return
        }

        if (data.user) {
          console.log('User authenticated:', data.user.email)
          
          try {
            // Check if user profile exists, if not create it
            const existingUser = await AuthService.getCurrentUser()
            console.log('Existing user check:', existingUser)
            
            if (!existingUser) {
              console.log('Creating new user profile...')
              const newUser = await AuthService.createUserProfile(data.user)
              console.log('New user created:', newUser)
              
              if (!newUser) {
                console.warn('User profile creation failed, but allowing user to proceed')
                // Don't block the user, they can still use the app with basic auth
              }
            }

            setStatus('success')
            setMessage('Authentication successful! Redirecting...')

            // Clear the timeout since we succeeded
            clearTimeout(timeoutId)
            
            // Redirect to main app after a short delay
            setTimeout(() => {
              window.location.href = '/'
            }, 2000)
          } catch (profileError) {
            console.error('Profile creation/check failed:', profileError)
            clearTimeout(timeoutId)
            setStatus('error')
            setMessage('Failed to set up user profile. Please try again.')
          }
        } else {
          clearTimeout(timeoutId)
          setStatus('error')
          setMessage('No user data received')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        clearTimeout(timeoutId)
        setStatus('error')
        setMessage('An unexpected error occurred during authentication')
      }
    }

    handleAuthCallback()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center space-y-6">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            <h2 className="text-xl font-semibold">{message}</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-400">{message}</h2>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-400">Authentication Failed</h2>
            <p className="text-gray-400">{message}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  )
}
