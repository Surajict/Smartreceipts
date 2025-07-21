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

4. **Never commit `.env.local`** - it's already in `.gitignore`

## Security Notes:

⚠️ **IMPORTANT**: 
- `.env.local` is gitignored and safe to use
- Never put real API keys in code or template files
- Always use environment variables for sensitive data 