export interface Prescriber {
  name: string;
  specialty: string;
  address: string;
  phone?: string; // Made optional as it's not available from the API
  score: number;
  focus: string;
  total_claims: number;
  distance_miles: number;
}

export interface ApiPrescriber {
    npi: number;
    name: string;
    specialty: string;
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    drug: {
        brand_name: string;
    };
    total_claims: number;
    distance_miles: number;
}

export interface ApiResponse {
    prescribers: ApiPrescriber[];
    results_count: number;
}


export interface ChatMessage {
  author: 'user' | 'ai';
  text: string;
}

export enum ViewState {
  WELCOME,
  LOADING,
  TEASER,
  PAYWALL,
  RESULTS,
}

export interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

export interface AuthUser {
  id: string
  email: string
  full_name?: string
  credits: number
  subscription_tier: 'free' | 'premium' | 'pro'
  subscription_expires_at?: string
}

// PayPal Types
export interface SubscriptionPlan {
  id: string;
  plan_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: string;
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  subscription_id: string;
  user_id: string;
  plan_id: string;
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED';
  paypal_subscriber_id?: string;
  start_time?: string;
  next_billing_time?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageInfo {
  searches_used: number;
  searches_limit: number;
  reset_date: string;
  has_active_subscription: boolean;
}

export interface PaymentFlowContext {
  query: string;
  results?: Prescriber[];
  can_proceed: boolean;
  usage_info: UsageInfo;
}

// PayPal Webhook Event Types
export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  resource: any;
  summary: string;
  create_time: string;
}