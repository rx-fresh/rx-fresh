// PayPal Configuration and Utilities

export const PAYPAL_CONFIG = {
  // Environment - 'sandbox' for testing, 'live' for production
  environment: import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox',
  
  // Client ID from PayPal Developer Dashboard
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
  
  // Currency
  currency: 'USD',
  
  // Plan IDs
  plans: {
    basic: import.meta.env.VITE_PAYPAL_PLAN_ID_BASIC || 'P-RX_BASIC_MONTHLY',
    premium: import.meta.env.VITE_PAYPAL_PLAN_ID_PREMIUM || 'P-RX_PREMIUM_MONTHLY',
    annualPremium: import.meta.env.VITE_PAYPAL_PLAN_ID_ANNUAL_PREMIUM || 'P-RX_ANNUAL_PREMIUM'
  }
};

export const PAYPAL_API_BASE = {
  sandbox: 'https://api.sandbox.paypal.com',
  live: 'https://api.paypal.com'
};

export const getPayPalApiBase = () => {
  return PAYPAL_CONFIG.environment === 'live' 
    ? PAYPAL_API_BASE.live 
    : PAYPAL_API_BASE.sandbox;
};

// PayPal subscription create payload
export const createSubscriptionPayload = (planId: string, userId: string) => ({
  plan_id: planId,
  subscriber: {
    name: {
      given_name: "RX",
      surname: "User"
    }
  },
  custom_id: userId,
  application_context: {
    brand_name: "RX Prescribers",
    locale: "en-US",
    shipping_preference: "NO_SHIPPING",
    user_action: "SUBSCRIBE_NOW",
    payment_method: {
      payer_selected: "PAYPAL",
      payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
    },
    return_url: `${window.location.origin}/payment/success`,
    cancel_url: `${window.location.origin}/payment/cancel`
  }
});

// Webhook event types we handle
export const WEBHOOK_EVENTS = {
  BILLING_SUBSCRIPTION_ACTIVATED: 'BILLING.SUBSCRIPTION.ACTIVATED',
  BILLING_SUBSCRIPTION_CANCELLED: 'BILLING.SUBSCRIPTION.CANCELLED',
  BILLING_SUBSCRIPTION_SUSPENDED: 'BILLING.SUBSCRIPTION.SUSPENDED',
  BILLING_SUBSCRIPTION_EXPIRED: 'BILLING.SUBSCRIPTION.EXPIRED',
  PAYMENT_SALE_COMPLETED: 'PAYMENT.SALE.COMPLETED',
  PAYMENT_SALE_REFUNDED: 'PAYMENT.SALE.REFUNDED'
} as const;
