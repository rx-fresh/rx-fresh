# Supabase Deployment Guide - RX Fresh

## ✅ Edge Function Deployed Successfully
The `send-otp-email` function has been deployed to your Supabase project.

## 🔧 Next Steps: Configure Environment Variables

You need to set up the following environment variables in your Supabase Dashboard:

### 1. Go to Supabase Dashboard
Navigate to: https://supabase.com/dashboard/project/cvxyixjkcomlwvukfmaf/settings/api

### 2. Set Environment Variables

Add these environment variables in the **Environment variables** section:

```bash
# Required for OTP email sending
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Get from https://resend.com/api-keys
RESEND_FROM=noreply@yourdomain.com                # Your verified sender email

# Required for auth hook security
SUPABASE_AUTH_HOOK_SECRET=your-secure-webhook-secret  # Generate a secure random string

# Supabase configuration
SUPABASE_URL=https://cvxyixjkcomlwvukfmaf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key       # From API settings
```

### 3. Generate Secure Webhook Secret

Run this command to generate a secure webhook secret:

```bash
# Generate a secure random string (64 characters)
openssl rand -base64 48
```

### 4. Set Up Auth Hook

1. Go to **Authentication** > **Hooks** in your Supabase Dashboard
2. Create a new hook with these settings:
   - **Hook Name**: `send-otp-email`
   - **Type**: `Send email`
   - **Method**: `POST`
   - **URI**: `https://cvxyixjkcomlwvukfmaf.supabase.co/functions/v1/send-otp-email`
   - **Headers**:
     - `Authorization: Bearer YOUR_SUPABASE_AUTH_HOOK_SECRET`
     - `Content-Type: application/json`

### 5. Verify Email Template

1. Go to **Authentication** > **Email Templates**
2. Customize the OTP email template if needed
3. Ensure the template includes the `{OTP}` placeholder

## 🧪 Test the Setup

1. **Test the Edge Function**:
   ```bash
   curl -X POST 'https://cvxyixjkcomlwvukfmaf.supabase.co/functions/v1/send-otp-email' \
   -H 'Authorization: Bearer YOUR_SUPABASE_AUTH_HOOK_SECRET' \
   -H 'Content-Type: application/json' \
   -d '{"email":"test@example.com","otp":"123456"}'
   ```

2. **Test Authentication Flow**:
   - Start your React app: `npm run dev`
   - Try the authentication flow
   - Check the Supabase function logs for any errors

## 🔍 Troubleshooting

### Common Issues:

1. **"Hook requires authorization token"**
   - Ensure `SUPABASE_AUTH_HOOK_SECRET` is set correctly
   - Verify the Authorization header in the hook configuration

2. **"server misconfiguration"**
   - Check that all environment variables are set
   - Verify Resend API key is valid
   - Ensure sender email is verified in Resend

3. **500 Error**
   - Check Supabase function logs
   - Verify environment variables are accessible
   - Test the function directly with curl

### Check Function Logs:
```bash
npx supabase functions logs send-otp-email --project-ref cvxyixjkcomlwvukfmaf
```

## 📋 Environment Variables Reference

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `RESEND_API_KEY` | API key for email service | https://resend.com/api-keys |
| `RESEND_FROM` | Verified sender email | https://resend.com/domains |
| `SUPABASE_AUTH_HOOK_SECRET` | Security token for auth hooks | Generate with openssl |
| `SUPABASE_URL` | Your Supabase project URL | Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Dashboard > Settings > API |

## 🚀 Next Steps After Configuration

1. Test the OTP email functionality
2. Verify the authentication flow works
3. Check that user profiles are created correctly
4. Test the search functionality with authenticated users

Let me know once you've configured the environment variables and I can help you test the setup!
