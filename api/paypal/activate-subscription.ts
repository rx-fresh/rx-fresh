import { getPayPalApiBase } from '../../services/paypalConfig';

// Activate subscription after user approval
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { subscriptionId, userId } = await req.json();

    if (!subscriptionId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get access token
    const tokenResponse = await fetch(`${req.url.split('/api')[0]}/api/paypal/token`, {
      method: 'POST',
    });
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get subscription details from PayPal
    const response = await fetch(`${getPayPalApiBase()}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayPal subscription fetch error:', errorText);
      throw new Error('Failed to fetch subscription details');
    }

    const subscription = await response.json();
    
    // TODO: Update subscription in database with activation details
    const dbSubscription = {
      id: crypto.randomUUID(),
      subscription_id: subscriptionId,
      user_id: userId,
      status: subscription.status,
      paypal_subscriber_id: subscription.subscriber?.payer_id,
      start_time: subscription.start_time,
      next_billing_time: subscription.billing_info?.next_billing_time,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // TODO: Update usage limits for user
    // await updateUserUsageLimits(userId, true); // Set unlimited
    
    return new Response(JSON.stringify(dbSubscription), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Activate subscription error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
