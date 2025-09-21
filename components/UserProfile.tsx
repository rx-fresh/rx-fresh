import React, { useState } from 'react'
import { useSimpleAuth } from '../hooks/useSimpleAuth'

interface UserProfileProps {
  onClose?: () => void
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, signOut } = useSimpleAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut()
    setIsSigningOut(false)
    onClose?.()
  }

  if (!user) return null

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'text-gray-400'
      case 'premium': return 'text-yellow-400'
      case 'pro': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  const getTierName = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Profile</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-400">Email</label>
          <p className="text-white font-medium">{user.email}</p>
        </div>

        {user.full_name && (
          <div>
            <label className="text-sm text-gray-400">Name</label>
            <p className="text-white font-medium">{user.full_name}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <label className="text-sm text-gray-400">Credits</label>
            <p className="text-white font-medium">{user.credits}</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Plan</label>
            <p className={`font-medium ${getTierColor(user.subscription_tier)}`}>
              {getTierName(user.subscription_tier)}
            </p>
          </div>
        </div>

        {user.subscription_expires_at && (
          <div>
            <label className="text-sm text-gray-400">Subscription Expires</label>
            <p className="text-white font-medium">
              {new Date(user.subscription_expires_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  )
}
