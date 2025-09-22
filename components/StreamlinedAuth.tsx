import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-fixed';

interface StreamlinedAuthProps {
  onSuccess: (user: any) => void;
  onCancel?: () => void;
}

type AuthMode = 'email' | 'code' | 'waiting' | 'success';

export const StreamlinedAuth: React.FC<StreamlinedAuthProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  const [mode, setMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setMode('success');
        setTimeout(() => onSuccess(session.user), 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, [onSuccess]);

  const sendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Send OTP code to email (no redirect)
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) throw error;

      setMode('code');
      setCountdown(60); // 60 second cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      });

      if (error) throw error;

      // Success will be handled by auth state change listener
      setMode('waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) throw error;

      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'email' && 'Sign In'}
            {mode === 'code' && 'Enter Code'}
            {mode === 'waiting' && 'Almost Done!'}
            {mode === 'success' && 'Welcome!'}
          </h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-300 text-xl font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Email Step */}
        {mode === 'email' && (
          <form onSubmit={sendEmailCode} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Sending Code...</span>
                </div>
              ) : (
                'Send Verification Code'
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              We'll send a 6-digit code to your email
            </p>
          </form>
        )}

        {/* Code Verification Step */}
        {mode === 'code' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-300 text-sm mb-4">
                Enter the 6-digit code sent to:
              </p>
              <p className="text-cyan-400 font-medium">{email}</p>
            </div>

            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  maxLength={6}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={resendCode}
                disabled={countdown > 0 || loading}
                className="text-cyan-400 hover:text-cyan-300 disabled:text-gray-500 text-sm"
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </button>
              <span className="text-gray-500 text-sm mx-2">•</span>
              <button
                onClick={() => {setMode('email'); setCode(''); setError(null);}}
                className="text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Change email
              </button>
            </div>
          </div>
        )}

        {/* Waiting Step */}
        {mode === 'waiting' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            <p className="text-gray-300">Signing you in...</p>
          </div>
        )}

        {/* Success Step */}
        {mode === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 font-medium">Successfully signed in!</p>
          </div>
        )}
      </div>
    </div>
  );
};
