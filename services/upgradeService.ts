import { AVAILABLE_PLANS } from '../types/plans';
import type { User } from '../lib/contentGating';
import { getUserCapabilities, getUpgradeSuggestion } from '../lib/contentGating';

export interface UpgradeContext {
  user: User | null;
  reason: 'credits_exhausted' | 'feature_needed' | 'blurred_results' | 'multiple_drugs' | 'multiple_locations' | 'general';
  requestedFeature?: string;
}

export interface UpgradeRecommendation {
  plan: typeof AVAILABLE_PLANS[0];
  reason: string;
  benefits: string[];
  urgency: 'low' | 'medium' | 'high';
}

// Gemini function to get upgrade recommendations
export function getUpgradeRecommendation(context: UpgradeContext): UpgradeRecommendation {
  const { user, reason, requestedFeature } = context;
  const currentTier = user?.subscription_tier || 'free';

  switch (reason) {
    case 'blurred_results':
      return {
        plan: AVAILABLE_PLANS.find(p => p.id === 'basic')!,
        reason: 'You\'re seeing blurred results because you\'re on the free plan.',
        benefits: [
          'See full prescriber details',
          '5 searches per month',
          'All substance types',
          'Email support'
        ],
        urgency: 'high'
      };

    case 'credits_exhausted':
      if (currentTier === 'basic') {
        return {
          plan: AVAILABLE_PLANS.find(p => p.id === 'premium')!,
          reason: 'You\'ve used all 5 searches this month.',
          benefits: [
            'Unlimited searches',
            'Multiple drugs simultaneously',
            'Multiple zipcode searches',
            'Priority support'
          ],
          urgency: 'high'
        };
      }
      return {
        plan: AVAILABLE_PLANS.find(p => p.id === 'basic')!,
        reason: 'You need more searches.',
        benefits: ['5 searches per month', 'Full prescriber data'],
        urgency: 'medium'
      };

    case 'multiple_drugs':
      return {
        plan: AVAILABLE_PLANS.find(p => p.id === 'premium')!,
        reason: 'You want to search multiple drugs simultaneously.',
        benefits: [
          'Search up to 10 drugs at once',
          'Unlimited searches',
          'Advanced filters',
          'Export capabilities'
        ],
        urgency: 'medium'
      };

    case 'multiple_locations':
      return {
        plan: AVAILABLE_PLANS.find(p => p.id === 'premium')!,
        reason: 'You want to search multiple locations at once.',
        benefits: [
          'Search up to 5 zipcodes simultaneously',
          'Unlimited searches',
          'Advanced geographic filtering'
        ],
        urgency: 'medium'
      };

    case 'feature_needed':
      if (requestedFeature === 'export') {
        const recommendedPlan = currentTier === 'free' ? 'basic' : 'premium';
        return {
          plan: AVAILABLE_PLANS.find(p => p.id === recommendedPlan)!,
          reason: 'You need export capabilities.',
          benefits: ['Export search results', 'CSV format', 'Easy data management'],
          urgency: 'low'
        };
      }
      if (requestedFeature === 'priority_support') {
        return {
          plan: AVAILABLE_PLANS.find(p => p.id === 'premium')!,
          reason: 'You need priority support.',
          benefits: ['Priority email support', 'Faster response times', 'Direct access to our team'],
          urgency: 'low'
        };
      }
      break;

    case 'general':
    default:
      if (currentTier === 'free') {
        return {
          plan: AVAILABLE_PLANS.find(p => p.id === 'basic')!,
          reason: 'Unlock full prescriber data and monthly searches.',
          benefits: [
            'Full prescriber details',
            '5 searches per month',
            'All substance types',
            'Export capabilities'
          ],
          urgency: 'medium'
        };
      }
      if (currentTier === 'basic') {
        return {
          plan: AVAILABLE_PLANS.find(p => p.id === 'premium')!,
          reason: 'Get unlimited searches and advanced features.',
          benefits: [
            'Unlimited searches',
            'Multiple drugs & locations',
            'Priority support',
            'Advanced filters'
          ],
          urgency: 'low'
        };
      }
      if (currentTier === 'premium') {
        return {
          plan: AVAILABLE_PLANS.find(p => p.id === 'annual-premium')!,
          reason: 'Save money with annual billing.',
          benefits: [
            'Same premium features',
            'Save $40 per year',
            'Annual billing convenience'
          ],
          urgency: 'low'
        };
      }
  }

  // Fallback
  return {
    plan: AVAILABLE_PLANS.find(p => p.id === 'basic')!,
    reason: 'Upgrade for better features.',
    benefits: ['More searches', 'Better features'],
    urgency: 'low'
  };
}

// Generate conversational upgrade messages for Gemini
export function generateUpgradeMessage(context: UpgradeContext): string {
  const recommendation = getUpgradeRecommendation(context);
  const { plan, reason, benefits, urgency } = recommendation;
  
  const urgencyPrefix = urgency === 'high' 
    ? "I'd really recommend upgrading now - " 
    : urgency === 'medium' 
    ? "You might want to consider upgrading - " 
    : "When you're ready, ";

  const benefitsList = benefits.slice(0, 3).join(', ');
  
  if (plan.billing === 'yearly') {
    return `${urgencyPrefix}${reason.toLowerCase()} The ${plan.name} plan (${plan.price}/year) gives you ${benefitsList}. That's a great deal compared to monthly billing! Ready to upgrade?`;
  }
  
  return `${urgencyPrefix}${reason.toLowerCase()} The ${plan.name} plan ($${plan.price}/month) includes ${benefitsList}. Should I set that up for you?`;
}

// Check if current action requires upgrade
export function requiresUpgrade(user: User | null, action: string, params?: any): UpgradeContext | null {
  if (!user || user.subscription_tier === 'free') {
    if (action === 'view_results') {
      return { user, reason: 'blurred_results' };
    }
  }
  
  if (user?.subscription_tier === 'basic' && user.credits_remaining <= 0) {
    return { user, reason: 'credits_exhausted' };
  }
  
  const capabilities = getUserCapabilities(user);
  
  if (action === 'search_multiple_drugs' && !capabilities.canSearch) {
    return { user, reason: 'multiple_drugs' };
  }
  
  if (action === 'search_multiple_locations' && !capabilities.canSearch) {
    return { user, reason: 'multiple_locations' };
  }
  
  if (action === 'export' && !capabilities.canExport) {
    return { user, reason: 'feature_needed', requestedFeature: 'export' };
  }
  
  if (action === 'priority_support' && !capabilities.hasPrioritySupport) {
    return { user, reason: 'feature_needed', requestedFeature: 'priority_support' };
  }
  
  return null;
}

// Gemini function calls can use this
export const geminiUpgradeFunctions = {
  checkUpgradeNeeded: requiresUpgrade,
  getUpgradeRecommendation,
  generateUpgradeMessage
};
