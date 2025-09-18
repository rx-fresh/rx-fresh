# Supabase Authentication Integration

This document outlines the complete Supabase authentication integration for the RX Fresh conversational AI application.

## Overview

The integration provides:
- **Magic Link Authentication** - Passwordless email-based auth
- **Conversational Auth Flow** - Gemini AI handles auth requests inline
- **Credit-Based System** - Track user search usage
- **Row Level Security** - All data protected with RLS policies
- **Edge Functions** - Server-side search proxy and validation

## Architecture

### Frontend Components
- `AuthProvider` - React context provider for auth state
- `AuthenticatedChatInterface` - Main chat interface with auth integration
- `AuthFlow` - Email collection and magic link UI
- `UserProfile` - User account management
- `AuthCallback` - Handle magic link authentication

### Backend Services
- `AuthService` - Core authentication functions
- `GeminiAuthService` - AI-powered auth conversation handling
- Edge Functions for secure server-side operations
- Database with RLS policies for security

### Database Schema
- `users` - User profiles and subscription data
- `search_logs` - Track all search activity
- `plans` - Available subscription plans
- `feature_flags` - Feature rollout management

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key

# External APIs
PRESCRIBER_API_URL=your_prescriber_api_url
PRESCRIBER_API_KEY=your_prescriber_api_key
```

### 2. Database Setup

```bash
# Run the setup script
./scripts/setup-supabase.sh

# Or manually apply schema
supabase db reset
```

### 3. Supabase Configuration

1. **Enable Magic Links**
   - Go to Authentication > Settings
   - Enable "Email confirmations" 
   - Disable "Email confirmation" for signups
   - Set redirect URL to: `{YOUR_DOMAIN}/auth/callback`

2. **Configure Email Templates**
   - Customize magic link email template
   - Update branding and copy

3. **Set URL Redirects**
   - Add your domain to allowed redirect URLs
   - Include both local and production domains

### 4. Deploy Edge Functions

```bash
supabase functions deploy search-proxy
supabase functions deploy validate-session
```

## Usage Flow

### Authentication Conversation
1. User asks question without being logged in
2. Gemini requests email: "I'll need your email to get started"
3. User provides email
4. Gemini calls `signIn(email)` function
5. Magic link sent, user clicks to authenticate
6. User redirected back to app, session established
7. Conversation continues with full access

### Search with Credits
1. Authenticated user asks for prescriber search
2. System checks user credits
3. If credits available, performs search via Edge Function
4. Credits deducted automatically
5. Search logged for analytics
6. Results returned with remaining credits

### Credit Management
- Free tier: 3 credits
- Credits deducted per search
- Upgrade flow triggers when credits exhausted
- Real-time credit display in UI

## Security Features

### Row Level Security Policies
- Users can only access their own data
- `auth.uid() = user_id` enforced on all tables
- Service role can manage all data
- Public read access only for plans table

### Edge Function Security
- Server-side credit validation
- JWT token verification
- Rate limiting and input validation
- Secure API key management

### Authentication Security
- Magic links expire automatically
- Session management via Supabase Auth
- No passwords stored
- Email verification required

## Function Calls Available to Gemini

### `createSupabaseUser(email, fullName?)`
Creates new user account and sends magic link.

```typescript
// Example usage in conversation
"I'll create an account for you. Let me send a magic link to john@example.com"
```

### `signIn(email)`
Sends magic link to existing user.

```typescript
// Example usage
"I'll send a magic link to your email. Check your inbox!"
```

### `signOut()`
Signs out current user.

```typescript
// Example usage
"You've been signed out successfully. Have a great day!"
```

### `checkCredits()`
Returns user's remaining credits.

```typescript
// Example usage
"You have 2 search credits remaining."
```

## Development Testing

### Test Authentication Flow
1. Start app: `npm run dev`
2. Open browser, clear localStorage
3. Ask AI a question without logging in
4. Provide email when prompted
5. Check email for magic link
6. Click link to authenticate
7. Verify session persistence

### Test Credit System
1. Perform searches to exhaust credits
2. Verify paywall triggers correctly
3. Test credit deduction in database
4. Verify search logging

### Test Edge Functions
```bash
# Test search proxy
curl -X POST https://your-project.supabase.co/functions/v1/search-proxy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query":"doctors near me","userId":"user-uuid"}'

# Test session validation
curl -X GET https://your-project.supabase.co/functions/v1/validate-session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Monitoring and Analytics

### Database Views
- User registration trends
- Search patterns and popular queries  
- Credit usage analytics
- Feature flag adoption

### Error Handling
- Failed authentication attempts
- API rate limiting
- Credit exhaustion events
- Edge function errors

## Troubleshooting

### Common Issues

**Magic links not working**
- Check redirect URL configuration
- Verify email template settings
- Ensure auth callback route is working

**RLS policy errors**
- Verify user session is valid
- Check policy definitions match auth.uid()
- Ensure service role key has proper permissions

**Edge function failures**
- Check environment variables are set
- Verify external API connectivity
- Monitor function logs in Supabase

**Credit deduction issues**
- Check database function definition
- Verify user ID matches session
- Ensure atomic operations in credit updates

### Debug Commands

```bash
# Check Supabase status
supabase status

# View function logs
supabase functions logs search-proxy

# Check database migrations
supabase db status

# Test policies
supabase db test
```

This authentication system provides a secure, user-friendly way to manage access to the prescription finder service while maintaining conversational flow and protecting user data.
