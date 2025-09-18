import React, { useState } from 'react';
import { PayPalButtons, usePayPalScriptReducer, FUNDING } from '@paypal/react-paypal-js';
import { paypalService } from '../services/paypalService';
import { PAYPAL_CONFIG } from '../services/paypalConfig';

interface PayPalSmartButtonProps {
  userId: string;
  planId?: string;
  onSuccess: (subscriptionId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

const PayPalSmartButton: React.FC<PayPalSmartButtonProps> = ({
  userId,
  planId = PAYPAL_CONFIG.plans.premium,
  onSuccess,
  onError,
  onCancel,
  disabled = false
}) => {
  const [{ isResolved, isPending }] = usePayPalScriptReducer();
  const [isCreating, setIsCreating] = useState(false);

  const createSubscription = async (): Promise<string> => {
    try {
      setIsCreating(true);
      const { subscriptionId } = await paypalService.createSubscription(planId, userId);
      return subscriptionId;
    } catch (error) {
      console.error('Error creating subscription:', error);
      onError('Failed to create subscription. Please try again.');
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const onApprove = async (data: any): Promise<void> => {
    try {
      const subscription = await paypalService.activateSubscription(data.subscriptionID, userId);
      onSuccess(subscription.subscription_id);
    } catch (error) {
      console.error('Error approving subscription:', error);
      onError('Failed to activate subscription. Please contact support.');
    }
  };

  const onErrorHandler = (error: any): void => {
    console.error('PayPal error:', error);
    onError('Payment processing failed. Please try again.');
  };

  const onCancelHandler = (): void => {
    onCancel?.();
  };

  if (!isResolved || isPending) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Loading payment options...</span>
      </div>
    );
  }

  return (
    <div className="paypal-button-container">
      {isCreating && (
        <div className="flex justify-center items-center py-4 mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-400">Setting up subscription...</span>
        </div>
      )}
      
      <PayPalButtons
        disabled={disabled || isCreating}
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'subscribe',
          height: 45,
        }}
        fundingSource={FUNDING.PAYPAL}
        createSubscription={createSubscription}
        onApprove={onApprove}
        onError={onErrorHandler}
        onCancel={onCancelHandler}
      />
      
      <div className="text-xs text-gray-500 text-center mt-3">
        <p>Secure payment powered by PayPal</p>
        <p>Cancel anytime • 30-day money-back guarantee</p>
      </div>
    </div>
  );
};

export default PayPalSmartButton;
