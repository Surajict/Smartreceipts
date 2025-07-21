# Environment Variables Template

Copy this content to your `.env.local` file and replace with your actual values:

```bash
# Smart Receipts Environment Variables
# Copy this content to .env.local and replace with your actual values

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# OpenAI API Key (for GPT-4o data extraction and embeddings)
VITE_OPENAI_API_KEY=sk-proj-your-openai-key-here

# Perplexity AI API Key (for receipt validation)
VITE_PERPLEXITY_API_KEY=pplx-your-perplexity-key-here

# Google Cloud Vision API Key (for OCR)
VITE_GOOGLE_CLOUD_VISION_API_KEY=AIzaSy-your-google-cloud-vision-key-here

# Push Notifications (VAPID Public Key)
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key-here

# n8n Webhook for Chatbot FAQ (optional)
VITE_N8N_WEBHOOK_URL=https://your-n8n-webhook-url-here

# Stripe Configuration (for payment processing)
# Test environment keys (for development)
VITE_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_your-stripe-test-publishable-key
VITE_STRIPE_TEST_SECRET_KEY=sk_test_your-stripe-test-secret-key

# Live environment keys (for production) 
VITE_STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_your-stripe-live-publishable-key
VITE_STRIPE_LIVE_SECRET_KEY=sk_live_your-stripe-live-secret-key

# Stripe environment toggle (test or live)
VITE_STRIPE_ENVIRONMENT=test

# Stripe webhook endpoint secret (for verifying webhook signatures)
VITE_STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

## Setup Instructions:

1. **Create the environment file:**
   ```bash
   touch .env.local
   ```

2. **Copy the template above** into `.env.local`

3. **Replace all placeholder values** with your actual API keys:
   - Get Supabase keys from your project dashboard
   - Get OpenAI API key from platform.openai.com
   - Get Perplexity API key from perplexity.ai
   - Get Google Cloud Vision key from Google Cloud Console
   - Generate VAPID keys for push notifications
   - **Get Stripe keys from your Stripe Dashboard:**
     - Go to https://dashboard.stripe.com/apikeys
     - Copy publishable and secret keys for both test and live modes
     - Set `VITE_STRIPE_ENVIRONMENT=test` for development
     - Set `VITE_STRIPE_ENVIRONMENT=live` for production

4. **Never commit `.env.local`** - it's already in `.gitignore`

## Stripe Product Setup:

### Test Environment:
1. Go to https://dashboard.stripe.com/test/products
2. Create new product: "Smart Receipts Premium"
3. Add recurring price: AU$7.00/month
4. Note the product and price IDs

### Live Environment:
1. Switch to live mode in Stripe Dashboard
2. Repeat the same product creation process
3. Use these IDs in production deployment

## Security Notes:

⚠️ **IMPORTANT**: 
- `.env.local` is gitignored and safe to use
- Never put real API keys in code or template files
- Always use environment variables for sensitive data
- Keep test and live Stripe keys separate
- Use webhook secrets to verify Stripe webhook authenticity 