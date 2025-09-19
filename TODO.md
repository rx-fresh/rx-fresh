# OTP Setup Tasks

## Current Issue
- "server misconfiguration" error when trying to send OTP emails
- Environment variables not set in Supabase project
- Function not deployed

## Required Steps

### 1. Set Environment Variables in Supabase
- [ ] Set RESEND_API_KEY
- [ ] Set SUPABASE_AUTH_HOOK_SECRET
- [ ] Set SUPABASE_URL
- [ ] Set SUPABASE_SERVICE_ROLE_KEY
- [ ] Set RESEND_FROM

### 2. Deploy the Edge Function
- [ ] Deploy send-otp-email function to Supabase
- [ ] Verify function is deployed successfully

### 3. Configure Auth Hook
- [ ] Create Auth Hook in Supabase Dashboard
- [ ] Set hook URL to function endpoint
- [ ] Configure webhook secret
- [ ] Enable email events

### 4. Test the Setup
- [ ] Test OTP email sending
- [ ] Verify email template
- [ ] Check function logs for errors

## Environment Variables Needed

```bash
# Get these from your Supabase Dashboard > Settings > API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Get this from Resend Dashboard
RESEND_API_KEY=re_your-resend-api-key

# Generate a secure random string for this
SUPABASE_AUTH_HOOK_SECRET=your-secure-webhook-secret

# Set your verified sender email
RESEND_FROM=noreply@yourdomain.com
