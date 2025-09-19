import { supabase } from './supabase';

export interface DatabaseAuthUser {
  id: string;
  email: string;
  full_name?: string;
  credits: number;
  subscription_tier: 'free' | 'basic' | 'premium' | 'annual_premium';
  subscription_expires_at?: string;
  searches_used?: number;
  searches_limit?: number;
  reset_date?: string;
}

export class DatabaseAuthService {
  // Send OTP via database function
  static async sendOTP(email: string): Promise<{ success: boolean; error?: string; otp?: string }> {
    try {
      const { data, error } = await supabase.rpc('generate_otp', {
        p_email: email
      });

      if (error) {
        console.error('Database OTP generation error:', error);
        return { success: false, error: error.message };
      }

      // In development, return the OTP code for testing
      // In production, this would be sent via email hook
      const isDevelopment = import.meta.env.DEV;
      
      return {
        success: data.success,
        error: data.error,
        ...(isDevelopment && { otp: data.otp_code })
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send OTP' 
      };
    }
  }

  // Verify OTP and sign in user
  static async verifyOTP(email: string, code: string): Promise<{ success: boolean; user?: DatabaseAuthUser; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('validate_otp', {
        p_email: email,
        p_code: code
      });

      if (error) {
        console.error('Database OTP validation error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      // Store user session in localStorage for client-side auth
      const user = data.user;
      localStorage.setItem('rx_auth_user', JSON.stringify(user));
      localStorage.setItem('rx_auth_session', JSON.stringify({
        user_id: user.id,
        email: user.email,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
      }));

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          credits: user.credits,
          subscription_tier: user.subscription_tier,
          subscription_expires_at: user.subscription_expires_at,
          searches_used: user.searches_used,
          searches_limit: user.searches_limit,
          reset_date: user.reset_date
        }
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify OTP' 
      };
    }
  }

  // Get current user from session
  static async getCurrentUser(): Promise<DatabaseAuthUser | null> {
    try {
      // Check localStorage session first (fast)
      const storedUser = localStorage.getItem('rx_auth_user');
      const storedSession = localStorage.getItem('rx_auth_session');

      if (!storedUser || !storedSession) {
        return null;
      }

      const session = JSON.parse(storedSession);
      
      // Check if session expired
      if (new Date(session.expires_at) < new Date()) {
        localStorage.removeItem('rx_auth_user');
        localStorage.removeItem('rx_auth_session');
        return null;
      }

      // Parse user data
      const user = JSON.parse(storedUser);

      // Optionally refresh user data from database (less frequent)
      const shouldRefresh = Math.random() < 0.1; // 10% chance to refresh
      if (shouldRefresh) {
        const freshData = await this.refreshUserData(user.email);
        if (freshData) {
          localStorage.setItem('rx_auth_user', JSON.stringify(freshData));
          return freshData;
        }
      }

      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      localStorage.removeItem('rx_auth_user');
      localStorage.removeItem('rx_auth_session');
      return null;
    }
  }

  // Refresh user data from database
  static async refreshUserData(email: string): Promise<DatabaseAuthUser | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_by_email', {
        p_email: email
      });

      if (error || !data.success) {
        return null;
      }

      return data.user;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  }

  // Sign out user
  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      // Clear local session
      localStorage.removeItem('rx_auth_user');
      localStorage.removeItem('rx_auth_session');

      // Also clear Supabase session if it exists
      await supabase.auth.signOut();

      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sign out' 
      };
    }
  }

  // Check subscription status
  static async getSubscriptionStatus(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_user_subscription_status', {
        p_user_id: userId
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to check subscription status' 
      };
    }
  }

  // Increment search usage
  static async incrementSearchUsage(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('increment_search_usage', {
        p_user_id: userId
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: data.success, data, error: data.error };
    } catch (error) {
      console.error('Error incrementing search usage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to increment search usage' 
      };
    }
  }

  // Listen to auth state changes (simplified)
  static onAuthStateChange(callback: (user: DatabaseAuthUser | null) => void) {
    // Check for changes every 30 seconds
    const interval = setInterval(async () => {
      const user = await this.getCurrentUser();
      callback(user);
    }, 30000);

    // Initial check
    this.getCurrentUser().then(callback);

    // Return cleanup function
    return {
      data: {
        subscription: {
          unsubscribe: () => clearInterval(interval)
        }
      }
    };
  }
}
