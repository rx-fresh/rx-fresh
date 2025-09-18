# PayPal Subscription System Setup Guide

This guide walks you through setting up PayPal subscriptions for your RX Prescribers application.

## Prerequisites

1. PayPal Business Account
2. Access to PayPal Developer Dashboard
3. SSL certificate for production (PayPal requires HTTPS)

## Step 1: PayPal Developer Dashboard Setup

### 1.1 Create PayPal App

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/developer/applications)
2. Click "Create App"
3. Choose "Default Application" 
4. Select your business account
5. Choose "Merchant" for app type
6. Enable these features:
   - **Subscriptions** (required)
   - **Webhooks** (required)
   - **PayPal Checkout** (required)

### 1.2 Get Credentials

After creating the app, note down:
- **Client ID** (visible to public)
- **Client Secret** (keep secure, server-only)
- **App ID** (for webhooks)

## Step 2: Create Subscription Plan

### 2.1 Using PayPal API (Recommended)

```bash
# Get access token
curl -X POST https://api.sandbox.paypal.com/v1/oauth2/token \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -u "CLIENT_ID:CLIENT_SECRET" \
  -d "grant_type=client_credentials"

# Create product
curl -X POST https://api.sandbox.paypal.com/v1/catalogs/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "name": "RX Prescribers Premium",
    "description": "Unlimited prescriber searches and full contact details",
    "type": "SERVICE",
    "category": "SOFTWARE"
  }'

# Create subscription plan
curl -X POST https://api.sandbox.paypal.com/v1/billing/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -d '{
    "product_id": "PRODUCT_ID_FROM_ABOVE",
    "name": "RX Premium Monthly",
    "description": "Monthly subscription for unlimited access",
    "status": "ACTIVE",
    "billing_cycles": [
      {
        "frequency": {
          "interval_unit": "MONTH",
          "interval_count": 1
        },
        "tenure_type": "REGULAR",
        "sequence": 1,
        "total_cycles": 0,
        "pricing_scheme": {
          "fixed_price": {
            "value": "9.99",
            "currency_code": "USD"
          }
        }
      }
    ],
    "payment_preferences": {
      "auto_bill_outstanding": true,
      "setup_fee": {
        "value": "0.00",
        "currency_code": "USD"
      },
      "setup_fee_failure_action": "CONTINUE",
      "payment_failure_threshold": 3
    },
    "taxes": {
      "percentage": "0.00",
      "inclusive": false
    }
  }'
```

### 2.2 Note Your Plan ID

Save the Plan ID returned from the API call. You'll need it for the `VITE_PAYPAL_PLAN_ID` environment variable.

## Step 3: Configure Webhooks

### 3.1 Create Webhook Endpoint

1. In PayPal Developer Dashboard, go to your app
2. Click "Add Webhook"
3. Set Webhook URL to: `https://yourdomain.com/api/paypal/webhook`
4. Select these event types:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED` 
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.REFUNDED`

### 3.2 Get Webhook Details

Note down:
- **Webhook ID**
- **Webhook Secret** (if using signature verification)

## Step 4: Environment Configuration

Create `.env` file with your credentials:

```env
# PayPal Configuration
VITE_PAYPAL_ENVIRONMENT=sandbox
VITE_PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
PAYPAL_WEBHOOK_ID=your_webhook_id_here
PAYPAL_WEBHOOK_SECRET=your_webhook_secret_here
VITE_PAYPAL_PLAN_ID=your_plan_id_here
PAYPAL_WEBHOOK_VERIFY=false
```

## Step 5: Database Setup

### 5.1 Run Database Migration

```bash
# If using PostgreSQL/MySQL, run the schema file
psql -d your_database < database/payment-schema.sql

# Or import into your preferred database system
```

### 5.2 Update Database Functions

The API endpoints in `/api/paypal/` currently have TODO comments for database operations. Replace these with your actual database queries using your preferred database client (e.g., Prisma, Supabase, direct SQL).

## Step 6: Install Dependencies

```bash
npm install @paypal/react-paypal-js crypto-js uuid
npm install --save-dev @types/crypto-js @types/uuid
```

## Step 7: Testing

### 7.1 Use PayPal Sandbox

- Use sandbox credentials for development
- Test with PayPal sandbox accounts
- Use test card numbers provided by PayPal

### 7.2 Test Flow

1. Trigger payment by exceeding free search limit
2. Complete PayPal subscription flow
3. Verify webhook events are received
4. Check database records are created
5. Verify unlimited access is granted

## Step 8: Production Deployment

### 8.1 Switch to Live Environment

```env
VITE_PAYPAL_ENVIRONMENT=live
# Update all credentials to live values
PAYPAL_WEBHOOK_VERIFY=true
```

### 8.2 Security Checklist

- [ ] Use HTTPS only
- [ ] Enable webhook signature verification
- [ ] Secure API endpoints with proper authentication
- [ ] Validate all PayPal webhook events
- [ ] Log all payment events for audit trail
- [ ] Implement proper error handling
- [ ] Set up monitoring and alerts

## Integration with Gemini

The system includes `geminiPaymentService` which provides:

1. **Automatic payment flow detection**: Checks if user needs to pay before search
2. **Conversational payment prompts**: Generates natural language prompts for Gemini
3. **Seamless integration**: Handles payment without breaking conversation flow

### Example Usage in Gemini Flow:

```javascript
import { geminiPaymentService } from './services/geminiPaymentService';

// Before processing search
const result = await geminiPaymentService.processSearchWithPaymentCheck(query, userId);

if (result.requiresPayment) {
  // Show payment UI or redirect to PayPal
  window.location.href = result.paymentUrl;
} else {
  // Continue with search results
  displayResults(result.results);
}
```

## Troubleshooting

### Common Issues

1. **"App not approved for subscriptions"**
   - Enable Subscriptions feature in PayPal app settings
   - Wait for approval (can take 24-48 hours)

2. **Webhook signature verification fails**
   - Set `PAYPAL_WEBHOOK_VERIFY=false` for development
   - Implement proper signature verification for production

3. **CORS errors**
   - Ensure all PayPal API calls go through your backend
   - Never expose client secret to frontend

4. **Subscription not activating**
   - Check webhook endpoint is accessible
   - Verify webhook events are being received
   - Check PayPal Developer Dashboard logs

## Support

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Subscriptions API](https://developer.paypal.com/docs/subscriptions/)
- [PayPal Webhooks Guide](https://developer.paypal.com/docs/api-basics/webhooks/)
