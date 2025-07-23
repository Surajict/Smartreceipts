-- TEMPORARY MIGRATION: Disable handle_new_user trigger for testing
-- This will help us isolate whether the signup issue is in the trigger or elsewhere

-- Disable the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- We'll re-enable it after testing signup 