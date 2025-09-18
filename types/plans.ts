export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'annual_premium';

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  price: number;
  billing: 'monthly' | 'yearly';
  credits: number;
  features: string[];
  limitations?: string[];
  popular?: boolean;
  paypalPlanId?: string; // undefined for free tier
  tier: SubscriptionTier;
}

export const AVAILABLE_PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Try before you buy',
    price: 0,
    billing: 'monthly',
    credits: 0,
    features: [
      'Blurred search results only',
      'See what data is available'
    ],
    limitations: [
      'Results are blurred/redacted',
      'No full prescriber details',
      'No downloads or exports'
    ],
    tier: 'free'
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for light usage',
    price: 9.99,
    billing: 'monthly',
    credits: 5,
    features: [
      '5 searches per month',
      'Single drug searches',
      'All substance types',
      'Full prescriber data',
      'Email support'
    ],
    paypalPlanId: 'basic',
    tier: 'basic'
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For power users and professionals',
    price: 19.99,
    billing: 'monthly',
    credits: -1, // unlimited
    features: [
      'Unlimited searches',
      'Multiple drugs simultaneously',
      'Multiple zipcode searches',
      'Full prescriber profiles',
      'Priority support',
      'Advanced filters',
      'Export capabilities'
    ],
    popular: true,
    paypalPlanId: 'premium',
    tier: 'premium'
  },
  {
    id: 'annual-premium',
    name: 'Annual Premium',
    description: 'Best value - save $40/year',
    price: 199.99,
    billing: 'yearly',
    credits: -1, // unlimited
    features: [
      'Unlimited searches',
      'Multiple drugs simultaneously', 
      'Multiple zipcode searches',
      'Full prescriber profiles',
      'Priority support',
      'Advanced filters',
      'Export capabilities',
      'Save $40 vs monthly'
    ],
    paypalPlanId: 'annualPremium',
    tier: 'annual_premium'
  }
];

export const getPlanByPayPalId = (paypalPlanKey: string): PlanConfig | undefined => {
  return AVAILABLE_PLANS.find(plan => plan.paypalPlanId === paypalPlanKey);
};

export const getPlanById = (id: string): PlanConfig | undefined => {
  return AVAILABLE_PLANS.find(plan => plan.id === id);
};
