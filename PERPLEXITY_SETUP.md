# Perplexity Validation Setup Guide

## Overview

The Smart Receipts app now includes intelligent validation using Perplexity AI to improve the accuracy of extracted receipt data. This feature validates and corrects:

- **Product Description**: Fixes OCR errors and standardizes product names
- **Brand Name**: Ensures proper spelling and capitalization
- **Store Name**: Validates against known store names
- **Warranty Period**: Verifies warranty duration is reasonable for the product type

## Setup Instructions

### Step 1: Get a Perplexity API Key

1. Go to [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Sign up or log in to your Perplexity account
3. Click "Create API Key"
4. Give it a name like "Smart Receipts Validation"
5. Copy the API key (it starts with `pplx-`)

### Step 2: Add API Key to Environment

1. In your project root directory, create or edit the `.env.local` file:
   ```bash
   # Create the file if it doesn't exist
   touch .env.local
   ```

2. Add your Perplexity API key to `.env.local`:
   ```env
   # Perplexity API Key for receipt validation
   VITE_PERPLEXITY_API_KEY=pplx-your-api-key-here
   
   # Your existing environment variables...
   VITE_SUPABASE_URL=https://napulczxrrnsjtmaixzp.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   VITE_GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
   ```

### Step 3: Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Testing the Validation

1. **Scan a receipt** with some unclear or misspelled text
2. **Watch the validation step** - it should take 2-3 seconds
3. **Check the validation results** - you should see:
   - Confidence scores above 0%
   - "Improved" or "Verified" badges for each field
   - Any corrections made to the original text

## Troubleshooting

### Issue: Validation shows 0% confidence and completes instantly

**Cause**: API key not configured or invalid

**Solution**:
1. Check that `VITE_PERPLEXITY_API_KEY` is in your `.env.local` file
2. Verify the API key is correct (starts with `pplx-`)
3. Restart the development server
4. Check browser console (F12) for error messages

### Issue: Validation fails with API errors

**Cause**: API key invalid or rate limits exceeded

**Solution**:
1. Verify your API key is active in Perplexity dashboard
2. Check if you have sufficient API credits
3. Look at browser console for specific error messages

### Issue: Validation is slow or times out

**Cause**: Network issues or API overload

**Solution**:
1. Check your internet connection
2. Try again after a few minutes
3. The system will gracefully fall back to original data

## How It Works

### Validation Process

1. **Parallel Validation**: All 4 fields are validated simultaneously for speed
2. **Smart Prompting**: Each field gets a specialized validation prompt
3. **Confidence Scoring**: Uses string similarity to calculate confidence
4. **Graceful Fallback**: If validation fails, original data is preserved

### Example Validations

**Product Description**:
- Input: "APPL iPHONE 14 PRO"
- Output: "Apple iPhone 14 Pro"
- Confidence: 85%

**Brand Name**:
- Input: "APPL"
- Output: "Apple"
- Confidence: 95%

**Store Name**:
- Input: "BEST BY"
- Output: "Best Buy"
- Confidence: 90%

**Warranty Period**:
- Input: "1yr"
- Output: "1 year"
- Confidence: 100%

## API Usage and Costs

- **Model Used**: `llama-3.1-sonar-small-128k-online`
- **Tokens per validation**: ~150 tokens
- **Cost per receipt**: ~$0.01-0.02 (4 fields × ~150 tokens each)
- **Typical processing time**: 2-3 seconds

## Privacy and Security

- **No data storage**: Perplexity doesn't store your receipt data
- **Secure transmission**: All API calls use HTTPS
- **Local processing**: Validation happens in your browser
- **Fallback protection**: Original data is never lost

## Disabling Validation

If you want to disable validation temporarily:

1. **Comment out the API key** in `.env.local`:
   ```env
   # VITE_PERPLEXITY_API_KEY=pplx-your-api-key-here
   ```

2. **Or remove the line entirely**

3. **Restart the server** - validation will be skipped

The app will show a yellow warning that validation was skipped, but everything else will work normally. 