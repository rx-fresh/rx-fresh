import { paypalService } from './paypalService';
import { PaymentFlowContext, Prescriber } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface GeminiPaymentResponse {
  canProceed: boolean;
  needsPayment: boolean;
  message: string;
  usageInfo?: {
    searches_used: number;
    searches_limit: number;
    has_active_subscription: boolean;
  };
  paymentOptions?: {
    approvalUrl: string;
    subscriptionId: string;
    price: number;
  };
}

interface SearchOptions {
  query: string;
  userId?: string;
  forcePaymentCheck?: boolean;
}

class GeminiPaymentService {
  private getUserId(userId?: string): string {
    if (userId) return userId;
    
    let storedUserId = '';
    if (typeof localStorage !== 'undefined') {
      storedUserId = localStorage.getItem('rx_user_id') || '';
    }
    
    if (!storedUserId) {
      storedUserId = uuidv4();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rx_user_id', storedUserId);
      }
    }
    
    return storedUserId;
  }

  // Check if user can proceed with search or needs payment
  async checkSearchPermission(options: SearchOptions): Promise<GeminiPaymentResponse> {
    try {
      const userId = this.getUserId(options.userId);
      const context = await paypalService.evaluatePaymentFlow(userId, options.query);

      if (context.can_proceed) {
        // User can proceed - increment usage if not subscription holder
        if (!context.usage_info.has_active_subscription) {
          await paypalService.incrementUsage(userId);
        }

        return {
          canProceed: true,
          needsPayment: false,
          message: this.getSuccessMessage(context.usage_info),
          usageInfo: context.usage_info
        };
      }

      // User needs to pay
      const paymentFlow = await paypalService.handleConversationalPayment(userId, context);
      
      if (paymentFlow.needsPayment && paymentFlow.approvalUrl && paymentFlow.subscriptionId) {
        return {
          canProceed: false,
          needsPayment: true,
          message: paymentFlow.message,
          usageInfo: context.usage_info,
          paymentOptions: {
            approvalUrl: paymentFlow.approvalUrl,
            subscriptionId: paymentFlow.subscriptionId,
            price: 9.99
          }
        };
      }

      return {
        canProceed: false,
        needsPayment: true,
        message: 'You have reached your search limit. Please subscribe to continue.',
        usageInfo: context.usage_info
      };

    } catch (error) {
      console.error('Error checking search permission:', error);
      return {
        canProceed: false,
        needsPayment: false,
        message: 'Unable to verify access permissions. Please try again.'
      };
    }
  }

  private getSuccessMessage(usageInfo: any): string {
    if (usageInfo.has_active_subscription) {
      return "✅ You have premium access. Processing your search...";
    }
    
    const remaining = usageInfo.searches_limit - usageInfo.searches_used - 1;
    if (remaining > 0) {
      return `✅ Search processed. You have ${remaining} free searches remaining.`;
    } else {
      return "✅ This was your last free search. Consider subscribing for unlimited access.";
    }
  }

  // Generate payment prompt for Gemini to use in conversation
  generatePaymentPrompt(context: PaymentFlowContext): string {
    const { usage_info, query } = context;
    
    if (usage_info.has_active_subscription) {
      return "User has active subscription. Proceed with full search.";
    }

    if (usage_info.searches_used >= usage_info.searches_limit) {
      return `User has exceeded free search limit (${usage_info.searches_used}/${usage_info.searches_limit}). 
      Offer subscription: "I'd be happy to help you find prescribers for '${query}', but you've reached your ${usage_info.searches_limit} free search limit. 
      Would you like to subscribe for $9.99/month to get unlimited searches and complete prescriber details? 
      This includes full addresses, contact information, and AI-powered insights to help you find the best matches."`;
    }

    const remaining = usage_info.searches_limit - usage_info.searches_used;
    return `User has ${remaining} free searches remaining. Proceed with search and mention remaining limit.`;
  }

  // Handle payment completion
  async handlePaymentComplete(subscriptionId: string, userId?: string): Promise<boolean> {
    try {
      const currentUserId = this.getUserId(userId);
      await paypalService.activateSubscription(subscriptionId, currentUserId);
      
      // Store subscription info locally
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rx_subscription_id', subscriptionId);
        localStorage.setItem('rx_subscription_active', 'true');
      }
      
      return true;
    } catch (error) {
      console.error('Error handling payment completion:', error);
      return false;
    }
  }

  // Get user's current status for display in UI
  async getUserStatus(userId?: string): Promise<{
    hasSubscription: boolean;
    searchesUsed: number;
    searchesLimit: number;
    searchesRemaining: number;
  }> {
    try {
      const currentUserId = this.getUserId(userId);
      const usageInfo = await paypalService.checkUserAccess(currentUserId);
      
      return {
        hasSubscription: usageInfo.has_active_subscription,
        searchesUsed: usageInfo.searches_used,
        searchesLimit: usageInfo.searches_limit,
        searchesRemaining: Math.max(0, usageInfo.searches_limit - usageInfo.searches_used)
      };
    } catch (error) {
      console.error('Error getting user status:', error);
      return {
        hasSubscription: false,
        searchesUsed: 0,
        searchesLimit: 3,
        searchesRemaining: 3
      };
    }
  }

  // Gemini function for processing search with payment check
  async processSearchWithPaymentCheck(query: string, userId?: string): Promise<{
    success: boolean;
    message: string;
    requiresPayment: boolean;
    results?: Prescriber[];
    paymentUrl?: string;
  }> {
    const permission = await this.checkSearchPermission({ query, userId });
    
    if (!permission.canProceed) {
      return {
        success: false,
        message: permission.message,
        requiresPayment: permission.needsPayment,
        paymentUrl: permission.paymentOptions?.approvalUrl
      };
    }

    // If we can proceed, this would integrate with your existing search
    try {
      // Import your existing search function
      const { findPrescribers } = await import('./geminiService');
      const results = await findPrescribers(query);
      
      return {
        success: true,
        message: permission.message,
        requiresPayment: false,
        results
      };
    } catch (error) {
      return {
        success: false,
        message: 'Search failed. Please try again.',
        requiresPayment: false
      };
    }
  }
}

export const geminiPaymentService = new GeminiPaymentService();
