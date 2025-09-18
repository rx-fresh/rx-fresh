# PayPal Subscription System Implementation

This document provides an overview of the PayPal subscription system integrated into the RX Prescribers conversational interface.

## 🏗️ Architecture Overview

### Core Components

1. **PayPal SmartButton** (`components/PayPalSmartButton.tsx`)
   - React component using PayPal JS SDK
   - Handles subscription creation and user approval flow
   - Provides secure payment processing

2. **Conversational Payment** (`components/ConversationalPayment.tsx`)
   - Inline payment component for chat interface
   - Triggers when user hits search limits
   - Seamless integration with chat flow

3. **Enhanced Paywall** (`components/Paywall.tsx`)
   - Full-screen payment interface
   - Shows usage statistics and pricing
   - PayPal integration with error handling

4. **Payment Services** (`services/paypalService.ts`)
   - Core PayPal API integration
   - Subscription management functions
   - Usage tracking and access control

5. **Gemini Integration** (`services/geminiPaymentService.ts`)
   - Smart payment flow detection
   - Conversational prompts for Gemini
   - Seamless search-to-payment flow

### Database Schema

The system includes comprehensive payment tracking:

- **subscription_plans**: Available subscription tiers
- **user_subscriptions**: Active user subscriptions
- **payment_transactions**: Payment history and records
- **usage_tracking**: Search limits and usage counters
- **webhook_events**: PayPal event audit trail

## 🔄 Payment Flow

### 1. Search Request
```
User enters search query
  ↓
Check user access permissions
  ↓
If limit reached → Show conversational payment
If has subscription → Continue with search
```

### 2. Subscription Creation
```
User clicks subscribe
  ↓
PayPal SmartButton creates subscription
  ↓
User redirected to PayPal approval
  ↓
User approves subscription
  ↓
Webhook activates subscription
  ↓
User gets unlimited access
```

### 3. Usage Tracking
```
Each search request
  ↓
Check subscription status
  ↓
If no subscription → Increment counter
If has subscription → Allow unlimited
  ↓
Update usage in database
```

## 🛠️ API Endpoints

### PayPal Integration
- `POST /api/paypal/token` - Get PayPal access token
- `POST /api/paypal/create-subscription` - Create new subscription
- `POST /api/paypal/activate-subscription` - Activate after approval
- `GET /api/paypal/user-access/:userId` - Check user permissions
- `POST /api/paypal/increment-usage` - Update usage counter
- `GET /api/paypal/plans` - Get available subscription plans
- `POST /api/paypal/webhook` - Handle PayPal webhooks

### Webhook Events Handled
- `BILLING.SUBSCRIPTION.ACTIVATED` - Grant access
- `BILLING.SUBSCRIPTION.CANCELLED` - Revoke access
- `BILLING.SUBSCRIPTION.SUSPENDED` - Temporary suspension
- `BILLING.SUBSCRIPTION.EXPIRED` - End of subscription
- `PAYMENT.SALE.COMPLETED` - Record payment
- `PAYMENT.SALE.REFUNDED` - Handle refunds

## 💬 Conversational Integration

### Smart Payment Triggers
The system intelligently determines when to show payment options:

```typescript
// Before each search
const result = await geminiPaymentService.processSearchWithPaymentCheck(query, userId);

if (result.requiresPayment) {
  // Show conversational payment component
  showPaymentPrompt = true;
} else {
  // Continue with search
  proceedWithSearch(result.results);
}
```

### Gemini Integration
The Gemini AI can seamlessly offer subscriptions:

```
User: "Find prescribers for metformin in NYC"
  ↓
System: Checks usage (2/3 free searches used)
  ↓
Gemini: "I found 15 prescribers for metformin in NYC. You have 1 free search remaining. 
         Would you like to see the results and subscribe for unlimited access?"
```

## 🔧 Configuration

### Environment Variables Required

```env
# PayPal Configuration
VITE_PAYPAL_ENVIRONMENT=sandbox
VITE_PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
VITE_PAYPAL_PLAN_ID=your_plan_id

# Optional
PAYPAL_WEBHOOK_VERIFY=false
PAYPAL_WEBHOOK_SECRET=your_webhook_secret
```

### PayPal Setup Steps

1. **Create PayPal App**
   - Go to PayPal Developer Dashboard
   - Enable Subscriptions, Webhooks, PayPal Checkout
   - Note Client ID and Secret

2. **Create Subscription Plan**
   - Use PayPal API to create product and plan
   - Set price to $9.99/month
   - Note the Plan ID

3. **Configure Webhooks**
   - Set webhook URL to your domain + `/api/paypal/webhook`
   - Subscribe to billing and payment events
   - Note Webhook ID

4. **Database Setup**
   - Run the SQL schema from `database/payment-schema.sql`
   - Update API endpoints with actual database queries

## 🚀 Features

### ✅ Implemented
- PayPal SmartButton integration
- Subscription creation and management
- Usage tracking and limits
- Webhook event handling
- Conversational payment flow
- Database schema design
- Error handling and validation

### 🔄 Requires Setup
- Database connection (currently using TODO comments)
- PayPal Developer Dashboard configuration
- Webhook signature verification (optional for dev)
- Production environment variables

### 🎯 Key Benefits
- **Seamless UX**: Payment integrated into conversation
- **Smart Limits**: Free tier with upgrade prompts
- **Secure Processing**: PayPal handles all payments
- **Flexible Plans**: Easy to add multiple subscription tiers
- **Comprehensive Tracking**: Full audit trail of payments
- **Mobile Friendly**: Responsive PayPal integration

## 🔍 Testing

### Development Flow
1. Set PayPal environment to `sandbox`
2. Use PayPal developer test accounts
3. Test subscription creation and approval
4. Verify webhook events are received
5. Check usage tracking updates correctly

### Production Checklist
- [ ] Switch to live PayPal environment
- [ ] Enable webhook signature verification
- [ ] Set up SSL certificates (required for PayPal)
- [ ] Configure production database
- [ ] Test with real PayPal accounts
- [ ] Monitor payment processing

## 📊 Monitoring

### Key Metrics to Track
- Subscription conversion rates
- Free-to-paid user flow
- Payment failures and retries
- Usage patterns and limits
- Webhook processing success rates

The system provides comprehensive payment integration that enhances the conversational experience while maintaining security and reliability.
