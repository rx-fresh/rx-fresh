import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import PayPalSmartButton from './PayPalSmartButton';
import { paypalService } from '../services/paypalService';
import { PAYPAL_CONFIG } from '../services/paypalConfig';
import { PaymentFlowContext, UsageInfo } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ConversationalPaymentProps {
  userId?: string;
  query: string;
  onPaymentSuccess: () => void;
  onPaymentDeclined: () => void;
  className?: string;
}

const ConversationalPayment: React.FC<ConversationalPaymentProps> = ({
  userId,
  query,
  onPaymentSuccess,
  onPaymentDeclined,
  className = ''
}) => {
  const [currentUserId, setCurrentUserId] = useState<string>(userId || '');
  const [paymentContext, setPaymentContext] = useState<PaymentFlowContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

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

  // Evaluate payment context
  useEffect(() => {
    if (currentUserId && query) {
      evaluatePaymentFlow();
    }
  }, [currentUserId, query]);

  const evaluatePaymentFlow = async () => {
    try {
      setLoading(true);
      const context = await paypalService.evaluatePaymentFlow(currentUserId, query);
      setPaymentContext(context);
      
      if (!context.can_proceed && !context.usage_info.has_active_subscription) {
        setShowPayment(true);
      }
    } catch (err) {
      console.error('Error evaluating payment flow:', err);
      setError('Failed to check access permissions');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (subscriptionId: string) => {
    console.log('Conversational payment successful:', subscriptionId);
    localStorage.setItem('rx_subscription_id', subscriptionId);
    setShowPayment(false);
    onPaymentSuccess();
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleDecline = () => {
    setShowPayment(false);
    onPaymentDeclined();
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-sm text-gray-400">Checking access...</span>
      </div>
    );
  }

  if (!paymentContext) {
    return null;
  }

  // User can proceed without payment
  if (paymentContext.can_proceed) {
    return null;
  }

  // Show conversational payment interface
  if (showPayment) {
    return (
      <PayPalScriptProvider
        options={{
          'clientId': PAYPAL_CONFIG.clientId,
          'vault': true,
          'intent': 'subscription',
          'currency': PAYPAL_CONFIG.currency,
        }}
      >
        <div className={`bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-600/50 p-6 ${className}`}>
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-2">
              🔒 Search Limit Reached
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              You've used {paymentContext.usage_info.searches_used} of {paymentContext.usage_info.searches_limit} free searches. 
              Subscribe to continue with unlimited access.
            </p>
            
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-4">
              <p className="text-blue-200 font-medium text-sm mb-2">
                💡 Your search: "{query}"
              </p>
              <p className="text-blue-300 text-xs">
                Subscribe now to see full results and get unlimited searches.
              </p>
            </div>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-semibold">Premium Access</span>
              <span className="text-2xl font-bold text-white">$9.99<span className="text-sm text-gray-400">/mo</span></span>
            </div>
            <ul className="text-sm text-gray-300 space-y-1 mb-4">
              <li>✅ Unlimited searches</li>
              <li>✅ Complete prescriber details</li>
              <li>✅ Full contact information</li>
              <li>✅ AI insights & scores</li>
            </ul>
            
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <PayPalSmartButton
              userId={currentUserId}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleDecline}
              className="text-gray-400 hover:text-gray-300 text-sm underline"
            >
              No thanks, maybe later
            </button>
          </div>
        </div>
      </PayPalScriptProvider>
    );
  }

  return null;
};

export default ConversationalPayment;
