# Admin Portal Migration Files

This document explains the migration files created for the Smart Receipts admin portal and subscription code system.

## Migration Files Overview

### 20250115000006_fix_admin_portal_rls_policies.sql
**Purpose**: Fixes Row Level Security (RLS) policies for the admin portal
- Removes restrictive policies that prevented admin portal access
- Creates permissive policies allowing authenticated users to access admin functions
- Grants necessary permissions for admin_settings and subscription_codes tables

### 20250115000007_fix_subscription_code_generation.sql
**Purpose**: Fixes the subscription code generation function
- Replaces faulty function that generated decimal numbers
- Creates proper 16-digit integer subscription codes
- Ensures codes are unique and exactly 16 digits long
- Uses SECURITY DEFINER for elevated privileges

### 20250115000008_fix_subscription_code_redemption.sql
**Purpose**: Fixes the subscription code redemption function
- Resolves column ambiguity errors in the redemption process
- Uses correct table structure (plan vs plan_id, proper enum casting)
- Handles foreign key constraints properly
- Implements proper UPSERT logic for subscription updates

### 20250115000009_fix_admin_stats_function.sql
**Purpose**: Ensures the admin statistics function works correctly
- Creates/updates get_admin_subscription_stats function
- Uses SECURITY DEFINER for proper access to statistics
- Returns JSON with total, used, expired, and active code counts

### 20250115000010_cleanup_and_initialize_admin_data.sql
**Purpose**: Cleans up invalid data and initializes settings
- Removes any invalid subscription codes from testing
- Ensures admin_settings table has proper default values
- Creates performance indexes for better query speed
- Adds helpful table and column comments

## How to Apply These Migrations

### Option 1: Using Supabase CLI (Recommended)
```bash
# Apply all pending migrations
supabase db push

# Or apply migrations one by one
supabase migration up
```

### Option 2: Manual Application
1. Copy the content of each migration file in order
2. Paste and run in Supabase Dashboard → SQL Editor
3. Verify each migration completes successfully

## Migration Order
The migrations must be applied in numerical order:
1. `20250115000006` - RLS Policies
2. `20250115000007` - Code Generation
3. `20250115000008` - Code Redemption  
4. `20250115000009` - Admin Stats
5. `20250115000010` - Cleanup & Initialize

## Testing After Migration
After applying all migrations, test:
1. Admin portal login at `/admin`
2. Subscription code generation
3. Code redemption in main app at `/subscription`
4. Statistics display in admin portal

## Key Features After Migration
- ✅ Admin portal with hardcoded login
- ✅ 16-digit subscription code generation
- ✅ Code redemption with premium activation
- ✅ Statistics dashboard
- ✅ System toggle (Code-Based ↔ Stripe)
- ✅ Proper security and permissions 