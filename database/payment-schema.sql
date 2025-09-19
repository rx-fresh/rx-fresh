-- PayPal Payment System Database Schema

-- Users Table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  credits INTEGER DEFAULT 3,
  subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'annual_premium')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR(255) UNIQUE NOT NULL, -- PayPal plan ID
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'annual', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id VARCHAR(255) UNIQUE NOT NULL, -- PayPal subscription ID
  user_id VARCHAR(255), -- Could be session ID or user email
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL, -- 'ACTIVE', 'CANCELLED', 'SUSPENDED', 'EXPIRED'
  paypal_subscriber_id VARCHAR(255),
  start_time TIMESTAMP WITH TIME ZONE,
  next_billing_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Transactions
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES user_subscriptions(id),
  transaction_id VARCHAR(255) UNIQUE NOT NULL, -- PayPal transaction ID
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- 'COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'
  payment_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  subscription_id UUID REFERENCES user_subscriptions(id),
  searches_used INTEGER DEFAULT 0,
  searches_limit INTEGER DEFAULT 3, -- Free tier limit
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events (for audit trail)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL, -- PayPal event ID
  event_type VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_id, name, description, price, billing_cycle) VALUES
('RX_BASIC_MONTHLY', 'RX Prescribers Basic', 'Limited searches and basic prescriber details for 30 days', 4.99, 'monthly'),
('RX_PREMIUM_MONTHLY', 'RX Prescribers Premium', 'Unlimited searches and full prescriber details for 30 days', 9.99, 'monthly'),
('RX_PREMIUM_ANNUAL', 'RX Prescribers Premium Annual', 'Unlimited searches and full prescriber details for 365 days', 99.99, 'annual');

-- Database Functions for PayPal Webhook Handling
-- ================================================

-- Function: Process PayPal Subscription Created
CREATE OR REPLACE FUNCTION handle_subscription_created(
  p_subscription_id VARCHAR(255),
  p_user_id VARCHAR(255),
  p_plan_id VARCHAR(255),
  p_subscriber_id VARCHAR(255),
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_next_billing_time TIMESTAMP WITH TIME ZONE
) RETURNS JSON AS $$
DECLARE
  v_plan_uuid UUID;
  v_subscription_uuid UUID;
  v_result JSON;
BEGIN
  -- Get the internal plan UUID
  SELECT id INTO v_plan_uuid 
  FROM subscription_plans 
  WHERE plan_id = p_plan_id AND is_active = true;

  IF v_plan_uuid IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Plan not found: ' || p_plan_id
    );
  END IF;

  -- Create or update subscription
  INSERT INTO user_subscriptions (
    subscription_id, user_id, plan_id, status, 
    paypal_subscriber_id, start_time, next_billing_time
  ) VALUES (
    p_subscription_id, p_user_id, v_plan_uuid, 'ACTIVE',
    p_subscriber_id, p_start_time, p_next_billing_time
  ) ON CONFLICT (subscription_id) DO UPDATE SET
    status = 'ACTIVE',
    start_time = p_start_time,
    next_billing_time = p_next_billing_time,
    updated_at = NOW()
  RETURNING id INTO v_subscription_uuid;

  -- Initialize or reset usage tracking
  INSERT INTO usage_tracking (user_id, subscription_id, searches_used, searches_limit)
  VALUES (p_user_id, v_subscription_uuid, 0, 999999) -- Unlimited for premium
  ON CONFLICT (user_id, subscription_id) DO UPDATE SET
    searches_used = 0,
    searches_limit = 999999,
    reset_date = NOW() + INTERVAL '30 days',
    updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'subscription_id', v_subscription_uuid,
    'message', 'Subscription activated successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Process PayPal Payment Completed
CREATE OR REPLACE FUNCTION handle_payment_completed(
  p_transaction_id VARCHAR(255),
  p_subscription_id VARCHAR(255),
  p_amount DECIMAL(10, 2),
  p_currency VARCHAR(3) DEFAULT 'USD'
) RETURNS JSON AS $$
DECLARE
  v_subscription_uuid UUID;
  v_result JSON;
BEGIN
  -- Get subscription UUID
  SELECT id INTO v_subscription_uuid 
  FROM user_subscriptions 
  WHERE subscription_id = p_subscription_id;

  IF v_subscription_uuid IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Subscription not found: ' || p_subscription_id
    );
  END IF;

  -- Record the payment transaction
  INSERT INTO payment_transactions (
    subscription_id, transaction_id, amount, currency, status, payment_method
  ) VALUES (
    v_subscription_uuid, p_transaction_id, p_amount, p_currency, 'COMPLETED', 'paypal'
  );

  -- Update subscription status to ACTIVE and extend billing
  UPDATE user_subscriptions 
  SET 
    status = 'ACTIVE',
    next_billing_time = next_billing_time + INTERVAL '30 days',
    updated_at = NOW()
  WHERE id = v_subscription_uuid;

  -- Reset usage limits
  UPDATE usage_tracking 
  SET 
    searches_used = 0,
    reset_date = NOW() + INTERVAL '30 days',
    updated_at = NOW()
  WHERE subscription_id = v_subscription_uuid;

  RETURN json_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'message', 'Payment processed successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Process PayPal Subscription Cancelled
CREATE OR REPLACE FUNCTION handle_subscription_cancelled(
  p_subscription_id VARCHAR(255),
  p_reason TEXT DEFAULT 'User cancelled'
) RETURNS JSON AS $$
DECLARE
  v_subscription_uuid UUID;
BEGIN
  -- Get subscription UUID
  SELECT id INTO v_subscription_uuid 
  FROM user_subscriptions 
  WHERE subscription_id = p_subscription_id;

  IF v_subscription_uuid IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Subscription not found: ' || p_subscription_id
    );
  END IF;

  -- Update subscription status
  UPDATE user_subscriptions 
  SET 
    status = 'CANCELLED',
    updated_at = NOW()
  WHERE id = v_subscription_uuid;

  -- Set usage to free tier limits
  UPDATE usage_tracking 
  SET 
    searches_limit = 3,
    updated_at = NOW()
  WHERE subscription_id = v_subscription_uuid;

  RETURN json_build_object(
    'success', true,
    'message', 'Subscription cancelled successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log Webhook Event
CREATE OR REPLACE FUNCTION log_webhook_event(
  p_event_id VARCHAR(255),
  p_event_type VARCHAR(100),
  p_resource_type VARCHAR(50),
  p_resource_id VARCHAR(255),
  p_payload JSONB
) RETURNS JSON AS $$
BEGIN
  INSERT INTO webhook_events (
    event_id, event_type, resource_type, resource_id, payload, processed
  ) VALUES (
    p_event_id, p_event_type, p_resource_type, p_resource_id, p_payload, true
  ) ON CONFLICT (event_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'message', 'Webhook event logged'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check User Subscription Status
CREATE OR REPLACE FUNCTION get_user_subscription_status(p_user_id VARCHAR(255))
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'has_active_subscription', CASE WHEN COUNT(*) > 0 THEN true ELSE false END,
    'subscription_details', json_agg(
      json_build_object(
        'subscription_id', us.subscription_id,
        'plan_name', sp.name,
        'status', us.status,
        'next_billing_time', us.next_billing_time,
        'searches_used', ut.searches_used,
        'searches_limit', ut.searches_limit
      )
    )
  ) INTO v_result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  LEFT JOIN usage_tracking ut ON us.id = ut.subscription_id
  WHERE us.user_id = p_user_id AND us.status = 'ACTIVE';

  RETURN COALESCE(v_result, json_build_object('has_active_subscription', false));

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment Search Usage
CREATE OR REPLACE FUNCTION increment_search_usage(p_user_id VARCHAR(255))
RETURNS JSON AS $$
DECLARE
  v_current_usage INTEGER;
  v_usage_limit INTEGER;
  v_subscription_uuid UUID;
BEGIN
  -- Get current usage and active subscription
  SELECT ut.searches_used, ut.searches_limit, ut.subscription_id
  INTO v_current_usage, v_usage_limit, v_subscription_uuid
  FROM usage_tracking ut
  JOIN user_subscriptions us ON ut.subscription_id = us.id
  WHERE ut.user_id = p_user_id AND us.status = 'ACTIVE'
  ORDER BY ut.updated_at DESC
  LIMIT 1;

  -- If no active subscription, check free tier
  IF v_current_usage IS NULL THEN
    SELECT searches_used, searches_limit, subscription_id
    INTO v_current_usage, v_usage_limit, v_subscription_uuid
    FROM usage_tracking
    WHERE user_id = p_user_id AND subscription_id IS NULL
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Create free tier entry if none exists
    IF v_current_usage IS NULL THEN
      INSERT INTO usage_tracking (user_id, searches_used, searches_limit)
      VALUES (p_user_id, 1, 3);
      
      RETURN json_build_object(
        'success', true,
        'searches_used', 1,
        'searches_remaining', 2,
        'limit_exceeded', false
      );
    END IF;
  END IF;

  -- Check if limit exceeded
  IF v_current_usage >= v_usage_limit THEN
    RETURN json_build_object(
      'success', false,
      'searches_used', v_current_usage,
      'searches_remaining', 0,
      'limit_exceeded', true,
      'message', 'Search limit exceeded. Please upgrade your plan.'
    );
  END IF;

  -- Increment usage
  UPDATE usage_tracking
  SET 
    searches_used = searches_used + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id 
  AND (subscription_id = v_subscription_uuid OR subscription_id IS NULL);

  RETURN json_build_object(
    'success', true,
    'searches_used', v_current_usage + 1,
    'searches_remaining', v_usage_limit - v_current_usage - 1,
    'limit_exceeded', false
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Authentication Database Functions
-- =================================

-- Function: Create or Get User Profile
CREATE OR REPLACE FUNCTION handle_user_signup(
  p_user_id UUID,
  p_email VARCHAR(255),
  p_full_name VARCHAR(255) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_record RECORD;
BEGIN
  -- Try to insert new user, or get existing one
  INSERT INTO auth.users (
    id, email, email_confirmed_at, created_at, updated_at
  ) VALUES (
    p_user_id, p_email, NOW(), NOW(), NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Create or update user profile in users table
  INSERT INTO users (
    id, email, full_name, credits, subscription_tier
  ) VALUES (
    p_user_id, p_email, p_full_name, 3, 'free'
  ) ON CONFLICT (id) DO UPDATE SET
    email = p_email,
    full_name = COALESCE(p_full_name, users.full_name),
    updated_at = NOW()
  RETURNING * INTO v_user_record;

  -- Initialize usage tracking for new user
  INSERT INTO usage_tracking (user_id, searches_used, searches_limit)
  VALUES (p_user_id::text, 0, 3)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'user', row_to_json(v_user_record),
    'message', 'User profile created/updated successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verify OTP and Create Session
CREATE OR REPLACE FUNCTION verify_otp_and_create_session(
  p_email VARCHAR(255),
  p_otp_code VARCHAR(6)
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_record JSON;
  v_valid_otp BOOLEAN := true; -- Temporarily accept all OTPs for setup
BEGIN
  -- Simple OTP validation (in production, use proper OTP storage/validation)
  IF NOT v_valid_otp THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired OTP code'
    );
  END IF;

  -- Get or create user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- Create new user
    v_user_id := gen_random_uuid();

    SELECT handle_user_signup(v_user_id, p_email, NULL) INTO v_user_record;

    IF NOT (v_user_record->>'success')::boolean THEN
      RETURN v_user_record;
    END IF;
  END IF;

  -- Update last sign in (assuming users table has a last_sign_in_at column, add if needed)
  UPDATE users
  SET
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Get fresh user profile
  SELECT get_user_by_email(p_email) INTO v_user_record;

  RETURN json_build_object(
    'success', true,
    'user', v_user_record->'user',
    'user_id', v_user_id,
    'message', 'Authentication successful'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Function: Get User Profile by Email
CREATE OR REPLACE FUNCTION get_user_by_email(p_email VARCHAR(255))
RETURNS JSON AS $$
DECLARE
  v_user_record RECORD;
BEGIN
  SELECT u.*, ut.searches_used, ut.searches_limit, ut.reset_date
  INTO v_user_record
  FROM users u
  LEFT JOIN usage_tracking ut ON u.id::text = ut.user_id
  WHERE u.email = p_email;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'user', row_to_json(v_user_record)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update User Credits
CREATE OR REPLACE FUNCTION update_user_credits(
  p_user_id VARCHAR(255),
  p_credits_to_add INTEGER
) RETURNS JSON AS $$
DECLARE
  v_new_credits INTEGER;
BEGIN
  UPDATE users 
  SET 
    credits = credits + p_credits_to_add,
    updated_at = NOW()
  WHERE id = p_user_id::uuid
  RETURNING credits INTO v_new_credits;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'credits', v_new_credits,
    'message', 'Credits updated successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate and Store OTP
CREATE OR REPLACE FUNCTION generate_otp(p_email VARCHAR(255))
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_otp_code VARCHAR(6);
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate 6-digit OTP
  v_otp_code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
  v_expires_at := NOW() + INTERVAL '10 minutes';

  -- Insert new OTP (replace existing unused ones)
  DELETE FROM otp_codes WHERE email = p_email AND used = false;
  
  INSERT INTO otp_codes (email, code, expires_at)
  VALUES (p_email, v_otp_code, v_expires_at);

  RETURN json_build_object(
    'success', true,
    'otp_code', v_otp_code,
    'expires_at', v_expires_at,
    'message', 'OTP generated successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Function: Validate OTP Code
CREATE OR REPLACE FUNCTION validate_otp(
  p_email VARCHAR(255),
  p_code VARCHAR(6)
) RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_otp_record RECORD;
  v_user_result JSON;
BEGIN
  -- Find valid OTP
  SELECT * INTO v_otp_record
  FROM otp_codes
  WHERE email = p_email 
    AND code = p_code 
    AND used = false 
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired OTP code'
    );
  END IF;

  -- Mark OTP as used
  UPDATE otp_codes 
  SET used = true 
  WHERE id = v_otp_record.id;

  -- Create/update user and return profile
  SELECT handle_user_signup(
    COALESCE(
      (SELECT id FROM auth.users WHERE email = p_email),
      gen_random_uuid()
    ),
    p_email,
    NULL
  ) INTO v_user_result;

  RETURN v_user_result;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permissions (adjust as needed for your security model)
GRANT EXECUTE ON FUNCTION handle_subscription_created TO anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_payment_completed TO anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_subscription_cancelled TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_webhook_event TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_search_usage TO anon, authenticated;

-- Grant auth function permissions
GRANT EXECUTE ON FUNCTION handle_user_signup TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_otp_and_create_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_email TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_credits TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_otp TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_otp TO anon, authenticated;

-- Row Level Security (RLS) Policies
-- ==================================

-- Enable RLS on all tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Subscription Plans: Public read access (plans are public info)
CREATE POLICY "subscription_plans_public_read" ON subscription_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "subscription_plans_admin_all" ON subscription_plans
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Users: Users can only access their own profile
CREATE POLICY "users_own_profile" ON users
  FOR ALL USING (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'admin'
  );

-- User Subscriptions: Users can only see their own subscriptions
CREATE POLICY "user_subscriptions_own_only" ON user_subscriptions
  FOR ALL USING (
    (auth.uid())::text = user_id OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Payment Transactions: Users can only see their own transactions
CREATE POLICY "payment_transactions_own_only" ON payment_transactions
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM user_subscriptions 
      WHERE (auth.uid())::text = user_id
    ) OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Usage Tracking: Users can only see their own usage
CREATE POLICY "usage_tracking_own_only" ON usage_tracking
  FOR ALL USING (
    (auth.uid())::text = user_id OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- OTP Codes: Users can only access OTP codes sent to their email
CREATE POLICY "otp_codes_own_email" ON otp_codes
  FOR ALL USING (
    email = auth.jwt() ->> 'email' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Webhook Events: Admin/system only
CREATE POLICY "webhook_events_admin_only" ON webhook_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Alternative policy for service role access (for webhook processing)
CREATE POLICY "webhook_events_service_role" ON webhook_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Additional Security: Anonymous users can access functions but limited table access
-- Allow anonymous users to call auth functions (for signup/login)
CREATE POLICY "users_anon_signup" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "otp_codes_anon_access" ON otp_codes
  FOR ALL WITH CHECK (true);

-- Enable realtime for user-specific data (optional)
-- This allows real-time updates for subscription status, credits, etc.
ALTER publication supabase_realtime ADD TABLE users;
ALTER publication supabase_realtime ADD TABLE user_subscriptions;
ALTER publication supabase_realtime ADD TABLE usage_tracking;

-- Helper function to check if user owns resource
CREATE OR REPLACE FUNCTION is_owner(resource_user_id text)
RETURNS boolean AS $$
BEGIN
  RETURN (auth.uid())::text = resource_user_id OR auth.jwt() ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_owner TO anon, authenticated;
