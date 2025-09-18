-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with authentication data
CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text,
    credits integer DEFAULT 3,
    subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
    subscription_expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Search logs for tracking usage
CREATE TABLE IF NOT EXISTS public.search_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    query text NOT NULL,
    results_count integer NOT NULL,
    credits_used integer DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS public.plans (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    credits integer NOT NULL,
    price decimal(10,2) NOT NULL,
    features jsonb DEFAULT '[]',
    created_at timestamptz DEFAULT now()
);

-- Feature flags for gradual rollouts
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    enabled boolean DEFAULT false,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Service role can manage users"
ON public.users FOR ALL
USING (auth.role() = 'service_role');

-- Search logs policies
CREATE POLICY "Users can view their own search logs"
ON public.search_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search logs"
ON public.search_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage search logs"
ON public.search_logs FOR ALL
USING (auth.role() = 'service_role');

-- Plans policies (publicly readable)
CREATE POLICY "Everyone can view plans"
ON public.plans FOR SELECT
TO PUBLIC
USING (true);

CREATE POLICY "Service role can manage plans"
ON public.plans FOR ALL
USING (auth.role() = 'service_role');

-- Feature flags policies
CREATE POLICY "Users can view their own feature flags"
ON public.feature_flags FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can manage feature flags"
ON public.feature_flags FOR ALL
USING (auth.role() = 'service_role');

-- Functions

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on users table
DROP TRIGGER IF EXISTS handle_updated_at ON public.users;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to deduct credits safely
CREATE OR REPLACE FUNCTION public.deduct_credits(
  user_id uuid,
  credits_to_deduct integer DEFAULT 1
)
RETURNS integer AS $$
DECLARE
  current_credits integer;
  new_credits integer;
BEGIN
  -- Get current credits with row locking
  SELECT credits INTO current_credits
  FROM public.users
  WHERE id = user_id
  FOR UPDATE;
  
  -- Check if user has enough credits
  IF current_credits < credits_to_deduct THEN
    RAISE EXCEPTION 'Insufficient credits. Current: %, Required: %', current_credits, credits_to_deduct;
  END IF;
  
  -- Deduct credits
  new_credits := current_credits - credits_to_deduct;
  
  UPDATE public.users
  SET credits = new_credits,
      updated_at = now()
  WHERE id = user_id;
  
  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits (for purchases)
CREATE OR REPLACE FUNCTION public.add_credits(
  user_id uuid,
  credits_to_add integer,
  new_subscription_tier text DEFAULT NULL
)
RETURNS integer AS $$
DECLARE
  new_credits integer;
BEGIN
  UPDATE public.users
  SET credits = credits + credits_to_add,
      subscription_tier = COALESCE(new_subscription_tier, subscription_tier),
      subscription_expires_at = CASE 
        WHEN new_subscription_tier IS NOT NULL THEN now() + interval '1 month'
        ELSE subscription_expires_at
      END,
      updated_at = now()
  WHERE id = user_id
  RETURNING credits INTO new_credits;
  
  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default plans
INSERT INTO public.plans (name, credits, price, features) VALUES 
('Free', 3, 0, '["3 searches", "Basic support"]'),
('Premium', 50, 9.99, '["50 searches", "Priority support", "Export data"]'),
('Pro', 200, 29.99, '["200 searches", "Premium support", "API access", "Advanced filters"]')
ON CONFLICT (name) DO NOTHING;

-- Insert global feature flags
INSERT INTO public.feature_flags (name, enabled) VALUES
('magic_link_auth', true),
('premium_features', true),
('analytics_tracking', false)
ON CONFLICT (name) DO NOTHING;
