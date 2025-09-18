import crypto from 'crypto';
import { WEBHOOK_EVENTS, getPayPalApiBase } from '../../services/paypalConfig';
import { PayPalWebhookEvent } from '../../types';

// PayPal webhook handler
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    // Verify webhook signature
    if (!verifyWebhookSignature(headers, body)) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const event: PayPalWebhookEvent = JSON.parse(body);

    // Store webhook event for audit trail
    await storeWebhookEvent(event, body);

    // Process the event based on type
    await processWebhookEvent(event);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function verifyWebhookSignature(headers: Record<string, string>, body: string): boolean {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    const webhookSecret = process.env.PAYPAL_WEBHOOK_SECRET;

    if (!webhookId || !webhookSecret) {
      console.error('Webhook credentials not configured');
      return false;
    }

    // PayPal webhook signature verification
    const authAlgo = headers['paypal-auth-algo'];
    const transmission = headers['paypal-transmission-id'];
    const certId = headers['paypal-cert-id'];
    const transmissionSig = headers['paypal-transmission-sig'];
    const transmissionTime = headers['paypal-transmission-time'];

    if (!authAlgo || !transmission || !certId || !transmissionSig || !transmissionTime) {
      console.error('Missing required webhook headers');
      return false;
    }

    // For production, implement full signature verification using PayPal's public key
    // For now, return true in development
    return process.env.NODE_ENV === 'development' || process.env.PAYPAL_WEBHOOK_VERIFY === 'false';
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

async function storeWebhookEvent(event: PayPalWebhookEvent, payload: string): Promise<void> {
  try {
    // TODO: Store in database
    // INSERT INTO webhook_events (event_id, event_type, resource_type, resource_id, payload, created_at)
    // VALUES (?, ?, ?, ?, ?, NOW())
    
    console.log(`Storing webhook event: ${event.event_type} - ${event.id}`);
  } catch (error) {
    console.error('Error storing webhook event:', error);
  }
}

async function processWebhookEvent(event: PayPalWebhookEvent): Promise<void> {
  try {
    switch (event.event_type) {
      case WEBHOOK_EVENTS.BILLING_SUBSCRIPTION_ACTIVATED:
        await handleSubscriptionActivated(event);
        break;
      
      case WEBHOOK_EVENTS.BILLING_SUBSCRIPTION_CANCELLED:
        await handleSubscriptionCancelled(event);
        break;
      
      case WEBHOOK_EVENTS.BILLING_SUBSCRIPTION_SUSPENDED:
        await handleSubscriptionSuspended(event);
        break;
      
      case WEBHOOK_EVENTS.BILLING_SUBSCRIPTION_EXPIRED:
        await handleSubscriptionExpired(event);
        break;
      
      case WEBHOOK_EVENTS.PAYMENT_SALE_COMPLETED:
        await handlePaymentCompleted(event);
        break;
      
      case WEBHOOK_EVENTS.PAYMENT_SALE_REFUNDED:
        await handlePaymentRefunded(event);
        break;
      
      default:
        console.log(`Unhandled webhook event: ${event.event_type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event.event_type}:`, error);
  }
}

async function handleSubscriptionActivated(event: PayPalWebhookEvent): Promise<void> {
  const subscription = event.resource;
  console.log(`Subscription activated: ${subscription.id}`);
  
  // TODO: Update database
  // UPDATE user_subscriptions SET status = 'ACTIVE', start_time = ?, next_billing_time = ? 
  // WHERE subscription_id = ?
  
  // TODO: Update user usage limits
  // UPDATE usage_tracking SET searches_limit = -1 WHERE user_id = ?
}

async function handleSubscriptionCancelled(event: PayPalWebhookEvent): Promise<void> {
  const subscription = event.resource;
  console.log(`Subscription cancelled: ${subscription.id}`);
  
  // TODO: Update database
  // UPDATE user_subscriptions SET status = 'CANCELLED' WHERE subscription_id = ?
  
  // TODO: Reset user usage limits
  // UPDATE usage_tracking SET searches_limit = 3 WHERE user_id = ?
}

async function handleSubscriptionSuspended(event: PayPalWebhookEvent): Promise<void> {
  const subscription = event.resource;
  console.log(`Subscription suspended: ${subscription.id}`);
  
  // TODO: Update database
  // UPDATE user_subscriptions SET status = 'SUSPENDED' WHERE subscription_id = ?
}

async function handleSubscriptionExpired(event: PayPalWebhookEvent): Promise<void> {
  const subscription = event.resource;
  console.log(`Subscription expired: ${subscription.id}`);
  
  // TODO: Update database
  // UPDATE user_subscriptions SET status = 'EXPIRED' WHERE subscription_id = ?
  
  // TODO: Reset user usage limits
  // UPDATE usage_tracking SET searches_limit = 3 WHERE user_id = ?
}

async function handlePaymentCompleted(event: PayPalWebhookEvent): Promise<void> {
  const payment = event.resource;
  console.log(`Payment completed: ${payment.id}`);
  
  // TODO: Store payment record
  // INSERT INTO payment_transactions (subscription_id, transaction_id, amount, currency, status)
  // VALUES (?, ?, ?, ?, 'COMPLETED')
}

async function handlePaymentRefunded(event: PayPalWebhookEvent): Promise<void> {
  const refund = event.resource;
  console.log(`Payment refunded: ${refund.id}`);
  
  // TODO: Update payment record
  // UPDATE payment_transactions SET status = 'REFUNDED' WHERE transaction_id = ?
}
