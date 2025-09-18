import { PAYPAL_CONFIG, getPayPalApiBase, createSubscriptionPayload } from './paypalConfig';
import { SubscriptionPlan, UserSubscription, UsageInfo, PaymentFlowContext } from '../types';

class PayPalService {
  private apiBase = getPayPalApiBase();
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  // Get PayPal access token
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch('/api/paypal/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute early

    return this.accessToken;
  }

  // Create PayPal subscription
  async createSubscription(planId: string, userId: string): Promise<{ subscriptionId: string; approvalUrl: string }> {
    const response = await fetch('/api/paypal/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        userId,
        payload: createSubscriptionPayload(planId, userId)
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create PayPal subscription');
    }

    const data = await response.json();
    return {
      subscriptionId: data.id,
      approvalUrl: data.links.find((link: any) => link.rel === 'approve')?.href || ''
    };
  }

  // Activate subscription after user approval
  async activateSubscription(subscriptionId: string, userId: string): Promise<UserSubscription> {
    const response = await fetch('/api/paypal/activate-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId, userId })
    });

    if (!response.ok) {
      throw new Error('Failed to activate subscription');
    }

    return response.json();
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, reason: string = 'User requested cancellation'): Promise<void> {
    const response = await fetch('/api/paypal/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId, reason })
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
  }

  // Get subscription details from PayPal
  async getSubscriptionDetails(subscriptionId: string): Promise<any> {
    const response = await fetch(`/api/paypal/subscription/${subscriptionId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get subscription details');
    }

    return response.json();
  }

  // Check user's current subscription status and usage
  async checkUserAccess(userId: string): Promise<UsageInfo> {
    const response = await fetch(`/api/paypal/user-access/${userId}`);
    
    if (!response.ok) {
      throw new Error('Failed to check user access');
    }

    return response.json();
  }

  // Increment usage counter
  async incrementUsage(userId: string): Promise<UsageInfo> {
    const response = await fetch('/api/paypal/increment-usage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error('Failed to increment usage');
    }

    return response.json();
  }

  // Get available plans
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    const response = await fetch('/api/paypal/plans');
    
    if (!response.ok) {
      throw new Error('Failed to get subscription plans');
    }

    return response.json();
  }

  // Smart payment flow decision
  async evaluatePaymentFlow(userId: string, query: string): Promise<PaymentFlowContext> {
    const usageInfo = await this.checkUserAccess(userId);
    
    return {
      query,
      can_proceed: usageInfo.has_active_subscription || usageInfo.searches_used < usageInfo.searches_limit,
      usage_info: usageInfo
    };
  }

  // Handle payment flow for Gemini integration
  async handleConversationalPayment(userId: string, context: PaymentFlowContext): Promise<{
    needsPayment: boolean;
    message: string;
    approvalUrl?: string;
    subscriptionId?: string;
  }> {
    if (context.can_proceed) {
      return {
        needsPayment: false,
        message: "You can proceed with your search."
      };
    }

    if (context.usage_info.has_active_subscription) {
      return {
        needsPayment: false,
        message: "You have an active subscription. Processing your search..."
      };
    }

    // User needs to subscribe
    const plans = await this.getAvailablePlans();
    const defaultPlan = plans.find(p => p.plan_id === PAYPAL_CONFIG.plans.premium);
    
    if (!defaultPlan) {
      throw new Error('No subscription plan available');
    }

    const { subscriptionId, approvalUrl } = await this.createSubscription(defaultPlan.plan_id, userId);

    return {
      needsPayment: true,
      message: `You've reached your free search limit (${context.usage_info.searches_limit}). Subscribe for $${defaultPlan.price}/month to unlock unlimited searches and full prescriber details.`,
      approvalUrl,
      subscriptionId
    };
  }
}

export const paypalService = new PayPalService();
