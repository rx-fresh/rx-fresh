import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { CheckCircleIcon } from './Icons';
import PayPalSmartButton from './PayPalSmartButton';
import { PAYPAL_CONFIG } from '../services/paypalConfig';
import { paypalService } from '../services/paypalService';
import { UsageInfo } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PaywallProps {
  onPaymentSuccess: () => void;
  userId?: string;
}

const Paywall: React.FC<PaywallProps> = ({ onPaymentSuccess, userId }) => {
  const [currentUserId, setCurrentUserId] = useState<string>(userId || '');
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate or retrieve user ID
  useEffect(() => {
    if (!currentUserId) {
      let storedUserId = localStorage.getItem('rx_user_id');
      if (!storedUserId) {
        storedUserId = uuidv4();
        localStorage.setItem('rx_user_id', storedUserId);
      }
      setCurrentUserId(storedUserId);
    }
  }, [currentUserId]);

  // Load usage information
  useEffect(() => {
    if (currentUserId) {
      loadUsageInfo();
    }
  }, [currentUserId]);

  const loadUsageInfo = async () => {
    try {
      setLoading(true);
      const info = await paypalService.checkUserAccess(currentUserId);
      setUsageInfo(info);
    } catch (err) {
      console.error('Error loading usage info:', err);
      setError('Failed to load usage information');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (subscriptionId: string) => {
    console.log('Payment successful:', subscriptionId);
    // Store subscription info
    localStorage.setItem('rx_subscription_id', subscriptionId);
    onPaymentSuccess();
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (loading) {
    return (
      <div className="w-full text-center flex flex-col items-center justify-center animate-fade-in p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400">Loading payment options...</p>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        'clientId': PAYPAL_CONFIG.clientId,
        'vault': true,
        'intent': 'subscription',
        'currency': PAYPAL_CONFIG.currency,
      }}
    >
      <div className="w-full text-center flex flex-col items-center justify-center animate-fade-in p-4">
        <h2 className="text-3xl font-extrabold mb-2">
          Unlock <span className="gradient-text">Complete Access</span>
        </h2>
        <p className="text-slate-400 mb-6">
          Get full, detailed information for all prescribers in your area.
        </p>

        {usageInfo && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-6 w-full max-w-sm">
            <p className="text-amber-300 text-sm">
              You've used {usageInfo.searches_used} of {usageInfo.searches_limit} free searches.
            </p>
            {usageInfo.searches_used >= usageInfo.searches_limit && (
              <p className="text-amber-200 text-xs mt-1">
                Subscribe to continue searching.
              </p>
            )}
          </div>
        )}

        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6 w-full max-w-sm mb-6">
          <div className="mb-4">
            <span className="text-5xl font-bold text-white">$9.99</span>
            <span className="text-slate-400">/month</span>
          </div>
          <ul className="space-y-3 text-left text-slate-300 my-6">
            <li className="flex items-center gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <span>Complete prescriber profiles</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <span>Full prescriber addresses & contact info</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <span>AI-powered scores & insights</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <span>Unlimited searches</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <span>Cancel anytime</span>
            </li>
          </ul>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <PayPalSmartButton
            userId={currentUserId}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />

          <p className="text-xs text-slate-500 mt-3">
            30-day money-back guarantee • HIPAA secure • Cancel anytime
          </p>
        </div>

        <div className="text-xs text-gray-500 max-w-sm">
          <p>
            By subscribing, you agree to our terms of service. 
            Your subscription will automatically renew monthly until cancelled.
          </p>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default Paywall;