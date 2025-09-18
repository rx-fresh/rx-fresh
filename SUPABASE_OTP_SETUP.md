# Supabase OTP Email Setup

This guide explains how to set up custom OTP email sending using Supabase Auth Hooks and Resend.

## Overview

Instead of using Supabase's default email templates (which send magic links), we use:
- **Supabase Edge Function** to handle email sending
- **Resend** for reliable email delivery  
- **React Email** for beautiful email templates
- **Auth Hooks** to intercept and customize the email flow

## Setup Steps

### 1. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Verify your sending domain (or use their sandbox for testing)
3. Get your API key from the dashboard

### 2. Add Environment Variables

Add these to your `.env` file:

```bash
# Resend API Key (get from resend.com dashboard)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Generate a strong secret for webhook validation
SEND_EMAIL_HOOK_SECRET=your_super_secure_webhook_secret_here
```

### 3. Deploy the Edge Function

```bash
# Deploy the send-otp-email function
supabase functions deploy send-otp-email

# Set the environment variables in Supabase
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set SEND_EMAIL_HOOK_SECRET=your_webhook_secret_here
```

### 4. Configure the Auth Hook

1. Go to your **Supabase Dashboard**
2. Navigate to **Auth** → **Hooks**
3. Click **Create a new Hook**
4. Configure:
   - **Hook Name**: `send-otp-email`
   - **Type**: `Send Email Hook`
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/send-otp-email`
   - **Secret**: Use the same secret from your `SEND_EMAIL_HOOK_SECRET`
   - **Events**: Select all email events (signup, recovery, etc.)

### 5. Test the Setup

1. Try signing up with a new email address
2. Check that you receive a clean OTP code email (not a magic link)
3. Verify the code in your app

## Customization

### Email Template

Edit `/supabase/functions/send-otp-email/_templates/otp-email.tsx` to:
- Change colors, fonts, layout
- Add your company logo
- Modify the email copy
- Add internationalization

### Sender Email

Update the `from` field in `index.ts`:
```typescript
from: 'Your App <noreply@yourdomain.com>',
```

Make sure this email is verified in your Resend dashboard.

### Error Handling

The function includes comprehensive error handling and logging. Check Supabase Function Logs for any issues.

## Benefits

✅ **Clean OTP codes** instead of magic links
✅ **Better deliverability** with Resend
✅ **Beautiful emails** with React Email templates  
✅ **Full customization** control
✅ **Reliable webhook validation**
✅ **Comprehensive error handling**

## Troubleshooting

**Emails not sending?**
- Check your Resend API key is correct
- Verify your sender domain in Resend
- Check Supabase Function Logs for errors

**Still getting magic links?**
- Ensure the Auth Hook is properly configured and enabled
- Check that the hook URL is correct
- Verify the webhook secret matches

**Template not loading?**
- Check the React Email component syntax
- Verify all imports are correct
- Test the function deployment
