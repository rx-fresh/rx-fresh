import type { SubscriptionTier } from '../types/plans';
import type { Prescriber } from '../types';

export interface User {
  id: string;
  email: string;
  subscription_tier: SubscriptionTier;
  credits_remaining: number;
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due';
}

export interface SearchCapabilities {
  canSearch: boolean;
  maxDrugsPerSearch: number;
  maxZipcodesPerSearch: number;
  hasUnlimitedSearches: boolean;
  canExport: boolean;
  hasPrioritySupport: boolean;
  reason?: string; // reason why can't search if canSearch is false
}

export interface GatedPrescriber extends Prescriber {
  isBlurred: boolean;
}

// Determine what a user can do based on their subscription tier
export function getUserCapabilities(user: User | null): SearchCapabilities {
  if (!user) {
    return {
      canSearch: true, // free users can search but get blurred results
      maxDrugsPerSearch: 1,
      maxZipcodesPerSearch: 1,
      hasUnlimitedSearches: false,
      canExport: false,
      hasPrioritySupport: false
    };
  }

  switch (user.subscription_tier) {
    case 'free':
      return {
        canSearch: true,
        maxDrugsPerSearch: 1,
        maxZipcodesPerSearch: 1,
        hasUnlimitedSearches: false,
        canExport: false,
        hasPrioritySupport: false
      };

    case 'basic':
      if (user.credits_remaining <= 0) {
        return {
          canSearch: false,
          maxDrugsPerSearch: 1,
          maxZipcodesPerSearch: 1,
          hasUnlimitedSearches: false,
          canExport: false,
          hasPrioritySupport: false,
          reason: 'You\'ve used all 5 searches for this month. Upgrade to Premium for unlimited searches!'
        };
      }
      return {
        canSearch: true,
        maxDrugsPerSearch: 1,
        maxZipcodesPerSearch: 1,
        hasUnlimitedSearches: false,
        canExport: true,
        hasPrioritySupport: false
      };

    case 'premium':
    case 'annual_premium':
      if (user.subscription_status !== 'active') {
        return {
          canSearch: false,
          maxDrugsPerSearch: 1,
          maxZipcodesPerSearch: 1,
          hasUnlimitedSearches: false,
          canExport: false,
          hasPrioritySupport: false,
          reason: 'Your subscription is not active. Please update your payment method.'
        };
      }
      return {
        canSearch: true,
        maxDrugsPerSearch: 10, // multiple drugs simultaneously
        maxZipcodesPerSearch: 5, // multiple zipcode searches
        hasUnlimitedSearches: true,
        canExport: true,
        hasPrioritySupport: true
      };

    default:
      return {
        canSearch: false,
        maxDrugsPerSearch: 0,
        maxZipcodesPerSearch: 0,
        hasUnlimitedSearches: false,
        canExport: false,
        hasPrioritySupport: false,
        reason: 'Invalid subscription tier'
      };
  }
}

// Apply content gating to search results
export function applyContentGating(
  results: Prescriber[], 
  user: User | null
): GatedPrescriber[] {
  const shouldBlur = !user || user.subscription_tier === 'free';

  return results.map(prescriber => ({
    ...prescriber,
    isBlurred: shouldBlur,
    // Blur sensitive data for free users
    npi: shouldBlur ? '••••••••••' : prescriber.npi,
    phone: shouldBlur ? '(•••) •••-••••' : prescriber.phone,
    fax: shouldBlur ? '(•••) •••-••••' : prescriber.fax || '',
    address: shouldBlur ? '••••••••••••••••' : prescriber.address,
    // Keep city/state visible for location context
    specialties: shouldBlur ? ['•••••••••'] : prescriber.specialties
  }));
}

// Check if user can perform a specific search
export function canPerformSearch(
  user: User | null,
  drugCount: number = 1,
  zipcodeCount: number = 1
): { canSearch: boolean; reason?: string } {
  const capabilities = getUserCapabilities(user);
  
  if (!capabilities.canSearch) {
    return { canSearch: false, reason: capabilities.reason };
  }

  if (drugCount > capabilities.maxDrugsPerSearch) {
    return {
      canSearch: false,
      reason: `You can search for up to ${capabilities.maxDrugsPerSearch} drug${capabilities.maxDrugsPerSearch === 1 ? '' : 's'} at once. Upgrade to Premium for multiple drug searches.`
    };
  }

  if (zipcodeCount > capabilities.maxZipcodesPerSearch) {
    return {
      canSearch: false,
      reason: `You can search ${capabilities.maxZipcodesPerSearch} location${capabilities.maxZipcodesPerSearch === 1 ? '' : 's'} at once. Upgrade to Premium for multiple zipcode searches.`
    };
  }

  return { canSearch: true };
}

// Get upgrade suggestions based on current limitations
export function getUpgradeSuggestion(user: User | null): string | null {
  if (!user || user.subscription_tier === 'free') {
    return 'Upgrade to Basic ($9.99/month) to see full results and get 5 searches per month, or Premium ($19.99/month) for unlimited searches and advanced features.';
  }

  if (user.subscription_tier === 'basic') {
    if (user.credits_remaining <= 0) {
      return 'Upgrade to Premium ($19.99/month) for unlimited searches, multiple drug queries, and advanced features.';
    }
    return 'Upgrade to Premium ($19.99/month) for unlimited searches and the ability to search multiple drugs and locations simultaneously.';
  }

  if (user.subscription_tier === 'premium') {
    return 'Save $40/year with Annual Premium ($199.99/year) - same features with annual billing.';
  }

  return null;
}

// Helper to check if user has a specific feature
export function hasFeature(user: User | null, feature: string): boolean {
  const capabilities = getUserCapabilities(user);
  
  switch (feature) {
    case 'export':
      return capabilities.canExport;
    case 'priority_support':
      return capabilities.hasPrioritySupport;
    case 'unlimited_searches':
      return capabilities.hasUnlimitedSearches;
    case 'multiple_drugs':
      return capabilities.maxDrugsPerSearch > 1;
    case 'multiple_zipcodes':
      return capabilities.maxZipcodesPerSearch > 1;
    default:
      return false;
  }
}
