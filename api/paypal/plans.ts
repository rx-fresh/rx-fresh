import { SubscriptionPlan } from '../../types';

// Get available subscription plans
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // TODO: Replace with actual database query
    // SELECT * FROM subscription_plans WHERE is_active = true
    
    const plans: SubscriptionPlan[] = [
      {
        id: '1',
        plan_id: 'RX_PREMIUM_MONTHLY',
        name: 'RX Prescribers Premium',
        description: 'Unlimited searches and full prescriber details',
        price: 9.99,
        currency: 'USD',
        billing_cycle: 'monthly',
        is_active: true
      }
    ];

    return new Response(JSON.stringify(plans), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
