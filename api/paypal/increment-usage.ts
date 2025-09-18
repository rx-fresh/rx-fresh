import { UsageInfo } from '../../types';

// Increment user's usage counter
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: Implement database update
    // UPDATE usage_tracking SET searches_used = searches_used + 1 WHERE user_id = ?
    // If no record exists, INSERT new record
    
    // For now, simulate the increment
    const updatedUsageInfo: UsageInfo = {
      searches_used: 1, // This would come from the database
      searches_limit: 3,
      reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      has_active_subscription: await checkActiveSubscription(userId)
    };

    return new Response(JSON.stringify(updatedUsageInfo), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Increment usage error:', error);
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
  // TODO: Implement actual database check
  return false;
}
