import { UsageInfo } from '../../types';

// Get user access and usage information
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.pathname.split('/').pop();

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // TODO: Replace with actual database queries
    // For now, simulate with localStorage-like behavior
    
    // Check for active subscription
    const hasActiveSubscription = await checkActiveSubscription(userId);
    
    // Get usage info from simulated storage
    const usageInfo: UsageInfo = {
      searches_used: parseInt(process.env.NODE_ENV === 'development' ? '0' : '2'), // Simulate usage
      searches_limit: 3,
      reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      has_active_subscription: hasActiveSubscription
    };
    
    return new Response(JSON.stringify(usageInfo), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('User access check error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function checkActiveSubscription(userId: string): Promise<boolean> {
  // TODO: Implement database query to check for active subscriptions
  // SELECT COUNT(*) FROM user_subscriptions 
  // WHERE user_id = ? AND status = 'ACTIVE' AND next_billing_time > NOW()
  
  // For now, return false to trigger payment flow
  return false;
}
