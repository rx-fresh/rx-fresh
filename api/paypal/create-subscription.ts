import { getPayPalApiBase } from '../../services/paypalConfig';

// Create PayPal subscription
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { planId, userId, payload } = await req.json();

    if (!planId || !userId || !payload) {
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

    // Create subscription with PayPal
    const response = await fetch(`${getPayPalApiBase()}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'PayPal-Request-Id': `subscription-${userId}-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayPal subscription creation error:', errorText);
      throw new Error('Failed to create subscription');
    }

    const subscription = await response.json();
    
    // TODO: Store subscription in database
    // await storeSubscriptionInDB(subscription, userId, planId);
    
    return new Response(JSON.stringify(subscription), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
