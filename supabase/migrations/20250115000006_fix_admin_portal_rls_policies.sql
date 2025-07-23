-- MIGRATION: Fix Admin Portal RLS Policies
-- This migration fixes the Row Level Security policies for the admin portal
-- to allow authenticated users to access admin functions

-- 1. DROP ALL EXISTING POLICIES to start fresh
DROP POLICY IF EXISTS "Admin settings accessible by service role only" ON admin_settings;
DROP POLICY IF EXISTS "Admin settings accessible by authenticated users" ON admin_settings;
DROP POLICY IF EXISTS "Admin settings accessible by service role" ON admin_settings;

DROP POLICY IF EXISTS "Subscription codes readable by service role" ON subscription_codes;
DROP POLICY IF EXISTS "Subscription codes manageable by service role" ON subscription_codes;
DROP POLICY IF EXISTS "Subscription codes readable by authenticated users" ON subscription_codes;
DROP POLICY IF EXISTS "Subscription codes manageable by authenticated users" ON subscription_codes;
DROP POLICY IF EXISTS "Subscription codes accessible by service role" ON subscription_codes;

-- 2. TEMPORARILY DISABLE RLS to allow unrestricted access
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_codes DISABLE ROW LEVEL SECURITY;

-- 3. RE-ENABLE RLS with permissive policies
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_codes ENABLE ROW LEVEL SECURITY;

-- 4. CREATE VERY PERMISSIVE POLICIES FOR ADMIN PORTAL
-- Allow ALL authenticated users to do EVERYTHING on admin_settings
CREATE POLICY "admin_settings_all_access" ON admin_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow service role access to admin_settings
CREATE POLICY "admin_settings_service_access" ON admin_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow ALL authenticated users to do EVERYTHING on subscription_codes
CREATE POLICY "subscription_codes_all_access" ON subscription_codes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow service role access to subscription_codes
CREATE POLICY "subscription_codes_service_access" ON subscription_codes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. GRANT NECESSARY PERMISSIONS
GRANT ALL ON admin_settings TO authenticated;
GRANT ALL ON subscription_codes TO authenticated;
GRANT ALL ON user_subscriptions TO authenticated; 