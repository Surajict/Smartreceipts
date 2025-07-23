-- MIGRATION: Cleanup and Initialize Admin Data
-- This migration cleans up any invalid test data and ensures proper initialization

-- 1. Delete any invalid subscription codes that were generated incorrectly
DELETE FROM subscription_codes WHERE code ~ '\.' OR LENGTH(code) != 16;

-- 2. Insert default admin setting if not exists
INSERT INTO admin_settings (setting_key, setting_value, created_at, updated_at)
VALUES ('subscription_system', '"code_based"', NOW(), NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- 3. Update any existing invalid subscription_system values to use proper JSON format
UPDATE admin_settings 
SET setting_value = '"code_based"'
WHERE setting_key = 'subscription_system' 
  AND setting_value NOT LIKE '"%"';

-- 4. Ensure proper indexing for performance
CREATE INDEX IF NOT EXISTS idx_subscription_codes_status ON subscription_codes(status);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_expires_at ON subscription_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscription_codes_code ON subscription_codes(code);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- 5. Add helpful comments to tables
COMMENT ON TABLE subscription_codes IS 'Stores generated subscription codes for premium access';
COMMENT ON TABLE admin_settings IS 'Configuration settings for the admin portal';
COMMENT ON COLUMN subscription_codes.code IS '16-digit unique subscription code';
COMMENT ON COLUMN subscription_codes.status IS 'Code status: generated, used, or expired';
COMMENT ON COLUMN subscription_codes.expires_at IS 'When the code expires (not the subscription)';
COMMENT ON COLUMN subscription_codes.duration_months IS 'How many months of subscription this code grants'; 