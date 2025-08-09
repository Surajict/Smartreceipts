# Smart Receipts - AI-Powered Receipt Management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39.0-green.svg)](https://supabase.com/)

> **Never lose a receipt or miss a warranty claim again!**

Smart Receipts is an intelligent receipt management application that uses AI to automatically scan, organize, and track your receipts while sending timely warranty alerts. Transform your receipt chaos into organized digital records with just a photo. **Now includes a comprehensive Admin Portal for subscription management!**

![Smart Receipts Demo](https://img.shields.io/badge/Live%20Demo-Available-brightgreen)

## 🌟 What This App Does (For Non-Technical Users)

**Think of Smart Receipts as your personal receipt assistant that:**
- Takes a photo of any receipt and instantly understands what you bought
- Remembers when your warranties expire and reminds you before they do
- Organizes all your purchases in one easy-to-find place
- Works on any device with a camera and internet connection
- **NEW**: Handles multi-product receipts (like shopping at electronics stores with multiple items)
- **NEW**: Tracks warranty periods for each individual product separately
- **NEW**: Uses AI to validate and correct receipt data automatically
- **NEW**: Includes admin tools for managing subscription codes and user access

**Example:** You buy a laptop ($1,299, 3-year warranty), a mouse ($29, 1-year warranty), and a keyboard ($79, 2-year warranty) from Best Buy. Smart Receipts automatically knows these are three separate products with different warranty periods and will remind you about each one individually!

## 🎯 Key Features

### 📱 **Smart Receipt Scanning**
- **Camera Capture**: Take photos directly within the app
- **File Upload**: Upload existing receipt images from your device
- **Long Receipt Support**: Special mode for capturing extra-long receipts
- **Manual Entry**: Backup option for damaged or unclear receipts
- **Multi-Product Support**: Handles receipts with multiple items automatically
- **Single & Multi-Product Modes**: Choose between single or multiple product entry

### 🤖 **AI-Powered Data Extraction**
- **OCR Technology**: Reads text from receipt images using Tesseract.js and Google Cloud Vision
- **GPT-4o Integration**: Intelligently extracts structured data from receipt text
- **Multi-Product Detection**: Automatically identifies when a receipt contains multiple products
- **Automatic Organization**: Categorizes products, brands, dates, and warranty information
- **Smart Error Correction**: Handles unclear text and missing information
- **Perplexity AI Validation**: Validates and corrects extracted data for accuracy

### 🔔 **Advanced Warranty Management**
- **Per-Product Warranty Tracking**: Each product has its own warranty period (NEW!)
- **Automatic Tracking**: Calculates warranty expiration dates for each item
- **Smart Alerts**: Reminds you before warranties expire
- **Multi-Product Warranty Support**: Tracks different warranty periods for items on the same receipt
- **Extended Warranty Support**: Tracks both standard and extended warranties
- **Country-Specific Rules**: Adapts to different warranty regulations

### 🔍 **AI-Powered Smart Search**
- **Vector Search**: Uses AI embeddings for semantic search capabilities
- **RAG (Retrieval-Augmented Generation)**: Answers complex questions about your receipts
- **Natural Language Queries**: Ask questions like "How much did I spend on electronics?"
- **Fallback Search**: Automatically falls back to text search if AI search fails
- **Real-time Results**: Shows search results with relevance scores
- **Conversational Interface**: Get detailed answers about your purchase history

### 🛡️ **Admin Portal & Subscription Management** (NEW!)
- **Secure Admin Interface**: Dedicated portal for system administrators
- **Subscription Code Generation**: Generate time-limited subscription codes
- **Real-time Statistics**: Track code usage, active subscriptions, and expiration data
- **Flexible Duration Options**: Create codes for 1, 3, 6, or 12-month periods
- **System Toggle**: Switch between code-based and Stripe subscription systems
- **Instant Code Management**: Generate, copy, and track subscription codes in real-time
- **Robust Error Handling**: Graceful handling of database permission issues
- **Local Storage Fallbacks**: Maintains functionality even with restricted database access

### 👤 **User Management**
- **Secure Authentication**: Email/password registration and login
- **Personal Dashboard**: Overview of all your receipts and upcoming expirations
- **Profile Management**: Update personal information and preferences
- **Notification Settings**: Customize warranty alerts and system notifications
- **Privacy Controls**: Manage data collection and privacy preferences
- **Data Privacy**: Your receipts are private and secure
- **Subscription Integration**: Seamless premium feature access via subscription codes

### 📊 **Enhanced Receipt Library**
- **Grouped Display**: Multi-product receipts are grouped together visually
- **PDF Document Support**: Proper viewing of PDF receipts with attractive viewer component
- **Mixed File Type Support**: Handles both image and PDF receipt files seamlessly
- **Individual Product Search**: Find specific products within multi-product receipts
- **Advanced Search & Filter**: Find receipts by product, brand, date, or amount
- **Sort Options**: Organize by date, price, or warranty status
- **Detailed View**: See all extracted information for each receipt
- **Edit Capability**: Manually correct or update receipt data
- **Export Options**: Export receipt data for record-keeping

## 🛠 Technology Stack

### **Frontend**
- **React 18.3.1** - Modern UI framework
- **TypeScript 5.5.3** - Type-safe JavaScript
- **Vite** - Fast build tool and development server with PWA plugin
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **PWA Support** - Progressive Web App with service worker and offline capabilities

### **Backend & Services**
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database with pgvector extension
  - Authentication & user management
  - File storage for receipt images
  - Real-time subscriptions
  - Edge functions for AI processing
  - Row Level Security (RLS) for data protection
  - Database functions for admin operations
- **OpenAI GPT-4o** - AI-powered data extraction and RAG
- **Perplexity AI** - Data validation and correction
- **Tesseract.js 5.0.4** - OCR text recognition
- **Google Cloud Vision** - Enhanced OCR capabilities
- **Stripe (scaffolded)** - Subscription and billing (mocked locally until configured)

### **AI & Machine Learning**
- **Vector Embeddings**: 384-dimension embeddings for semantic search
- **RAG (Retrieval-Augmented Generation)**: Intelligent question answering
- **Multi-Model AI**: OpenAI for extraction, Perplexity for validation
- **Semantic Search**: pgvector for fast similarity search

### **Notifications & PWA**
- Push notifications via service worker and Supabase Edge Function
- Installable PWA with offline support and runtime caching for Supabase API

### **Development Tools**
- **ESLint** - Code linting and formatting
- **TypeScript ESLint** - TypeScript-specific linting
- **PostCSS & Autoprefixer** - CSS processing
- **React Webcam** - Camera integration

## 🚀 Getting Started

### **Prerequisites**

Before you begin, ensure you have the following installed:
- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

### **Google Authentication Setup**

To enable Google Sign-In:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add your app's domain to the "Authorized JavaScript origins"
7. Add your app's domain + `/auth/v1/callback` to "Authorized redirect URIs"
   - For local development: `http://localhost:5173/auth/v1/callback`
   - For production: `https://yourdomain.com/auth/v1/callback`
8. Click "Create" and note your Client ID and Client Secret
9. In your Supabase dashboard, go to Authentication > Providers
10. Enable Google provider and enter your Client ID and Client Secret
11. In the web app, set `VITE_GOOGLE_OAUTH_CLIENT_ID` to the same Client ID so the in-app OAuth flow works correctly

### **Environment Setup**

1. **Clone the repository**
   ```bash
   git clone https://github.com/Surajict/Smartreceipts.git
   cd Smart_Receipts_Suraj_V5
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://napulczxrrnsjtmaixzp.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   
   # OpenAI Configuration (for AI data extraction and RAG)
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
   # Perplexity AI Configuration (for data validation)
   VITE_PERPLEXITY_API_KEY=your_perplexity_api_key_here
   
   # Google Cloud Vision (for enhanced OCR)
   VITE_GOOGLE_CLOUD_VISION_API_KEY=your_google_cloud_vision_key_here

   # Google OAuth (used by the web client OAuth flow)
   VITE_GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id_here

   # Stripe (optional: enable when integrating real billing)
   VITE_STRIPE_ENVIRONMENT=test
   VITE_STRIPE_TEST_PUBLISHABLE_KEY=your_stripe_test_pk_here
   # For production billing, set:
   # VITE_STRIPE_ENVIRONMENT=live
   # VITE_STRIPE_LIVE_PUBLISHABLE_KEY=your_stripe_live_pk_here
   ```

4. **Database Setup**
   
   The project uses Supabase with pre-configured migrations. To set up the database:
   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase
   
   # Initialize Supabase (if needed)
   supabase init
   
   # Apply migrations
   supabase db push
   ```

### **Required API Keys**

#### **Supabase Setup**
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key from Settings → API
3. Add them to your `.env.local` file

#### **OpenAI Setup** (Required for AI features)
1. Create an account at [openai.com](https://openai.com)
2. Generate an API key from the API section
3. Add the key to your `.env.local` file

#### **Perplexity AI Setup** (Required for validation)
1. Create an account at [perplexity.ai](https://perplexity.ai)
2. Go to Settings → API and create an API key
3. Add the key to your `.env.local` file

#### **Google Cloud Vision** (Optional - enhances OCR)
1. Create a Google Cloud project
2. Enable the Vision API
3. Generate an API key
4. Add to your `.env.local` file

### **Running the Application**

1. **Development mode**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

2. **Build for production**
   ```bash
   npm run build
   ```

3. **Preview production build**
   ```bash
   npm run preview
   ```

## 📁 Project Structure

```
Smart_Receipts_Suraj_V5/
├── public/                       # Static assets
│   ├── Smart Receipt Logo.png    # App logo
│   └── favicon.svg               # PWA icon
├── src/
│   ├── components/               # React components (Dashboard, AdminPortal, etc.)
│   ├── contexts/                 # React contexts
│   ├── hooks/                    # Custom hooks
│   ├── lib/
│   │   └── supabase.ts           # Supabase client, Google OAuth, DB helpers
│   ├── services/
│   │   ├── ocrService.ts         # OCR processing logic
│   │   ├── multiProductReceiptService.ts  # Multi-product handling
│   │   ├── perplexityValidationService.ts # AI validation service
│   │   ├── ragService.ts         # RAG (Retrieval-Augmented Generation)
│   │   ├── subscriptionService.ts# Subscription state helpers
│   │   ├── stripeService.ts      # Stripe scaffolding (mocked locally)
│   │   └── duplicateDetectionService.ts    # Duplicate receipt detection
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── sw.ts                     # Service worker (PWA + push notifications)
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # App entry point
│   └── index.css                 # Global styles
├── supabase/
│   ├── migrations/               # Database migrations
│   └── functions/                # Edge functions
│       ├── smart-search          # AI search endpoint
│       ├── generate-embedding    # Per-receipt embeddings
│       ├── backfill-embeddings   # Batch embed backfill
│       └── send-push-notification# Push notification sender
├── package.json                  # Dependencies and scripts
├── tailwind.config.js            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite configuration (PWA)
└── README.md                     # This file
```

## 🧭 Navigation & Routes

The app uses React Router with the following primary routes:

- `/` Home/Landing
- `/login` and `/signup` Authentication screens
- `/dashboard` Main dashboard
- `/scan` Receipt scanning and upload (`ReceiptScanning`)
- `/profile` Profile and settings (`ProfilePage`)
- `/library` Your saved receipts (`MyLibrary`)
- `/warranty` Warranty manager
- `/subscription` Subscription management
- `/admin` Admin portal

Notes:
- The user avatar menu present in page headers provides quick access to “Profile Settings” and “Sign Out”.
- 2025‑08‑09: The “Profile Settings” item in the `ReceiptScanning` header now correctly routes to `/profile` (previously navigated to the dashboard).

## 🎮 How to Use the App

### **1. Create Account & Login**
- Visit the app and click "Sign Up"
- Enter your email and create a password
- Verify your email address
- Log in to access your dashboard

### **2. Scan Your First Receipt**
- Click "Scan Receipt" from the dashboard
- Choose your input method:
  - **Camera**: Take a photo directly
  - **Upload**: Select an image file
  - **Manual Single**: Enter single product details
  - **Manual Multi**: Enter multiple product details

### **3. Review and Validate Extracted Data**
- The AI will automatically extract product information
- Perplexity AI will validate and correct the data
- Review confidence scores and any corrections made
- Edit any remaining incorrect details
- Add additional notes if needed
- Save the receipt to your library

### **4. Manage Multi-Product Receipts**
- Add/remove products using the "Add Product" and "Remove" buttons
- Convert single products to multi-product format
- Each product can have its own warranty period
- Total amount is automatically calculated

### **5. Use Smart Search**
- Go to the Dashboard and find the "Smart Search" section
- Ask natural language questions like:
  - "How much did I spend on electronics this year?"
  - "Show me all Apple products I bought"
  - "What warranties expire in the next 30 days?"
- Get AI-powered answers with relevant receipts

### **6. Track Warranties**
- Check your dashboard for warranty alerts
- View individual product warranty periods
- Get notifications before warranties expire
- Access detailed warranty information in "My Library"

### **7. Organize Your Library**
- Access "My Library" to view all receipts
- View both image and PDF receipts with proper display
- Use search and filters to find specific items
- View grouped multi-product receipts
- Edit receipt details anytime
- Export receipt data when needed

### **8. Admin Portal (Administrators Only)** (NEW!)
- Access the admin portal at `/admin` route
- Login with admin credentials:
  - **Username**: `smartreceiptsau@gmail.com`
  - **Password**: `greatAppple651`
- **Generate Subscription Codes**:
  - Select duration (1, 3, 6, or 12 months)
  - Add optional notes for tracking
  - Click "Generate Code" to create new codes
  - Copy codes immediately for distribution
- **Monitor Statistics**:
  - View total codes generated
  - Track used vs. active codes
  - Monitor expired codes
  - Real-time stats refresh every 30 seconds
- **System Management**:
  - Toggle between Code-Based and Stripe subscription systems
  - Settings are saved locally for session persistence
- **Code Management**:
  - View recently generated codes in current session
  - Copy any code to clipboard with one click
  - Track code status and expiration dates

## 🔧 Configuration

### **Admin Portal Configuration**

The Admin Portal requires specific database setup and functions:

#### **Database Functions Required:**
- `get_admin_subscription_stats()` - Returns real-time statistics
- `create_subscription_code(duration_months, notes)` - Generates new codes

#### **Database Tables:**
- `admin_settings` - Stores configuration like subscription system type
- `subscription_codes` - Stores generated subscription codes
- `user_subscriptions` - Links users to their subscriptions

#### **Row Level Security (RLS):**
The Admin Portal handles RLS restrictions gracefully:
- Uses database functions that bypass RLS policies
- Falls back to local storage for settings when database access is restricted
- Maintains functionality even with limited database permissions

### **MCP Server Setup (Cursor IDE Users)**

Create `.cursor/mcp.json` for enhanced development experience:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "env": {}
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your_brave_api_key"
      }
    },
    "github-mcp-server": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token"
      }
    },
    "perplexity-ask": {
      "command": "npx",
      "args": ["-y", "server-perplexity-ask"],
      "env": {
        "PERPLEXITY_API_KEY": "your_perplexity_api_key"
      }
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {}
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y", "@supabase/mcp-server-supabase@latest",
        "--read-only", "--project-ref=napulczxrrnsjtmaixzp"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your_supabase_access_token"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### **Database Schema**

The app uses PostgreSQL with the following main tables:
- **receipts**: Stores receipt data with multi-product support
- **users**: User profiles and settings
- **user_notification_settings**: Notification preferences
- **user_privacy_settings**: Privacy controls
- **user_subscriptions**: User subscription management (NEW!)
- **subscription_codes**: Generated subscription codes (NEW!)
- **admin_settings**: System configuration (NEW!)
- **subscription_usage**: Usage tracking (NEW!)
- **auth.users**: Supabase authentication (built-in)
- **storage.objects**: Receipt image storage (built-in)

Key fields in the receipts table:
- `product_description`, `brand_name`, `model_number`
- `purchase_date`, `amount`, `receipt_total`
- `warranty_period` (per product), `extended_warranty`
- `receipt_group_id`, `is_group_receipt` (for multi-product support)
- `embedding` (for vector search)
- `image_url`, `user_id`

Key fields in the subscription_codes table:
- `code`, `status` ('generated', 'used', 'expired')
- `generated_at`, `expires_at`, `used_at`
- `duration_months`, `notes`
- `used_by_user_id` (links to user who redeemed the code)

## 🆕 Latest Features (2024-2025)

### **Admin Portal & Subscription Management (NEW!)**
- **Secure Admin Interface**: Dedicated portal with hardcoded authentication for security
- **Real-time Statistics Dashboard**: Live tracking of subscription code usage and status
- **Flexible Code Generation**: Create codes with 1, 3, 6, or 12-month durations
- **Instant Code Display**: Generated codes appear immediately for easy copying
- **System Configuration**: Toggle between code-based and Stripe subscription systems
- **Robust Error Handling**: Graceful handling of database permission issues
- **Local Storage Fallbacks**: Maintains functionality even with RLS restrictions
- **One-Click Code Copying**: Easy distribution of subscription codes to users

### **Multi-Product Receipt Support**
- **Automatic Detection**: AI automatically detects when a receipt contains multiple products
- **Grouped Display**: Multi-product receipts are visually grouped in the interface
- **Individual Product Management**: Add, remove, and edit individual products
- **Flexible Conversion**: Convert between single and multi-product formats
- **Accurate Totals**: Automatic calculation of receipt totals

### **Warranty Per Product**
- **Individual Tracking**: Each product has its own warranty period
- **Separate Alerts**: Get notifications for each product's warranty expiration
- **Real-World Accuracy**: Matches how warranties actually work in stores
- **Database Migration**: Seamless upgrade from receipt-level to product-level warranties

### **AI Validation with Perplexity**
- **Automatic Correction**: Fixes OCR errors and improves data accuracy
- **Enhanced Brand Validation**: Returns clean brand names instead of verbose explanations
- **Confidence Scoring**: Shows how confident the AI is in corrections
- **Multi-Field Validation**: Validates product names, brands, stores, and warranty periods
- **Parallel Processing**: Fast validation using concurrent API calls

### **RAG-Powered Smart Search**
- **Natural Language**: Ask questions in plain English
- **Intelligent Answers**: Get detailed responses about your purchase history
- **Context-Aware**: Understands the context of your questions
- **Fallback Support**: Automatically falls back to regular search if needed

### **Enhanced User Experience & UI/UX Improvements**
- **Improved Dashboard**: Better organization with streamlined Quick Access tiles
- **Consistent Header Design**: Unified header across all pages with Smart Receipts branding
- **Settings Integration**: Settings moved to header for better accessibility
- **Warranty Manager Tile**: Direct access to warranty management from dashboard
- **Notification System**: Real-time alerts for warranty expirations
- **Profile Management**: Comprehensive user settings and preferences
- **Error Handling**: Better error messages and recovery options

### **PDF Document Support**
- **PDF Viewing**: Proper display of PDF receipts with attractive viewer component
- **Automatic Detection**: Smart detection of PDF vs image files
- **Fallback Support**: Graceful handling of different file types
- **Enhanced Library**: Better organization of mixed PDF and image receipts

### **Progressive Web App (PWA) Enhancements**
- **Custom Favicon**: Smart Receipts branded SVG favicon with gradient design
- **Installable App**: Full PWA support for mobile and desktop installation
- **Offline Capability**: Service worker for offline functionality
- **Native App Experience**: Standalone mode with custom branding

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### **Development Guidelines**

1. **Code Style**
   - Use TypeScript for all new code
   - Follow existing naming conventions
   - Add comments for complex logic
   - Handle errors gracefully with user-friendly messages

2. **Security Rules**
   - Never commit API keys or secrets
   - Use environment variables for configuration
   - Validate all user inputs
   - Follow security best practices
   - **Admin Portal**: Keep admin credentials secure and consider environment-based configuration

3. **Testing**
   - Test multi-product receipt flows
   - Verify warranty tracking accuracy
   - Test AI validation features
   - Ensure search functionality works
   - **Test Admin Portal**: Verify code generation, statistics display, and error handling

4. **Before Contributing**
   ```bash
   # Fork the repository
   # Create a new branch
   git checkout -b feature/your-feature-name
   
   # Make your changes
   # Test thoroughly (including admin portal if applicable)
   npm run lint
   npm run build
   
   # Commit with clear messages
   git commit -m "Add: description of your feature"
   
   # Push and create a pull request
   git push origin feature/your-feature-name
   ```

### **Reporting Issues**

Found a bug or have a feature request?
1. Check existing issues first
2. Create a detailed issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/device information
   - Screenshots if applicable
   - **For Admin Portal issues**: Include admin-specific details

## 📊 Database Migrations

The project includes comprehensive database migrations in `supabase/migrations/`. Key migrations include:

- **Receipt storage** - Main receipts table with RLS policies
- **Multi-product support** - Grouping columns and indexes
- **Warranty per product** - Product-level warranty tracking
- **Vector search** - pgvector extension and embedding support
- **User management** - Profile and settings tables
- **File storage** - Receipt image storage with security policies
- **Performance optimization** - Indexes and triggers
- **Admin portal setup** - Admin tables and functions (NEW!)
- **Subscription management** - Subscription codes and user linking (NEW!)
- **Admin settings** - System configuration table (NEW!)
 - **Notifications** - User notifications tables and helpers (NEW!)

To apply migrations:
```bash
supabase db push
```

## 🧠 Smart Search & AI Features Setup

### **Vector Search Setup**
1. **Enable pgvector extension** in your Supabase project
2. **Run the vector search migration** to create embedding columns
3. **Deploy the smart-search edge function** for AI-powered search
4. **Generate embeddings** for existing receipts

### **Edge Functions**
Deploy Edge Functions:
```bash
# Core smart search
supabase functions deploy smart-search

# Embedding helpers
supabase functions deploy generate-embedding
supabase functions deploy backfill-embeddings

# Push notifications
supabase functions deploy send-push-notification
```

### **Embedding Generation**
The app automatically generates embeddings for new receipts. For existing receipts:
1. Go to the Dashboard
2. Look for the "Index Receipts" button
3. Click to generate embeddings for all receipts

### **AI Model Configuration**
- **Embeddings**: OpenAI text-embedding-3-small (384 dimensions)
- **Data Extraction**: GPT-4o for receipt processing
- **Validation**: Perplexity AI for data correction
- **RAG**: GPT-4o for question answering

## 🔐 Security & Privacy

- **Row Level Security (RLS)**: Users can only access their own receipts
- **Secure Authentication**: Email/password with Supabase Auth
- **Encrypted Storage**: Receipt images stored securely in Supabase Storage
- **API Key Protection**: All sensitive keys stored in environment variables
- **Input Validation**: All user inputs are validated and sanitized
- **Privacy Controls**: Users can manage data collection preferences
- **AI Data Handling**: Receipt data is processed securely and not stored by AI providers
- **Admin Portal Security**: Hardcoded credentials for administrative access (NEW!)
- **Database Function Security**: SECURITY DEFINER functions bypass RLS safely (NEW!)

## 🔔 Push Notifications

To enable push notifications:
- Open the app and visit settings or the onboarding flow to grant notification permissions
- Ensure service worker `src/sw.ts` is registered (handled by Vite PWA config)
- Deploy the `send-push-notification` Edge Function and configure triggers as needed
- Warranty alerts use milestones (90, 30, 7 days) and deduplicate notifications

## 📱 Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile browsers**: Responsive design works on all major mobile browsers
- **PWA Support**: Can be installed as a Progressive Web App
- **Admin Portal**: Optimized for desktop browsers with full responsive support

## 🐛 Troubleshooting

### **Common Issues**

1. **Camera not working**
   - Ensure HTTPS connection (required for camera access)
   - Check browser permissions for camera access
   - Try refreshing the page

2. **OCR not extracting text**
   - Ensure good lighting when taking photos
   - Keep receipt flat and in focus
   - Try the manual entry option as backup
   - For PDF receipts, ensure they contain extractable text (not just images)

3. **AI validation not working**
   - Check that `VITE_PERPLEXITY_API_KEY` is set in `.env.local`
   - Verify the API key is correct (starts with `pplx-`)
   - Check browser console for error messages
   - Ensure brand validation returns clean names (not verbose explanations)

4. **Smart search returning no results**
   - Ensure receipts have embeddings generated
   - Check that the smart-search edge function is deployed
   - Verify OpenAI API key is configured

5. **Multi-product receipts not grouping**
   - Check that the database migration was applied
   - Verify `receipt_group_id` and `is_group_receipt` columns exist
   - Review the MultiProductReceiptService logs

6. **Admin Portal Issues** (NEW!)
   - **406 "Not Acceptable" errors**: These are handled gracefully by the app
   - **Statistics not loading**: Check that `get_admin_subscription_stats()` function exists
   - **Code generation failing**: Verify `create_subscription_code()` function is available
   - **Codes not displaying**: This is expected due to RLS - codes appear when generated
   - **Login issues**: Verify admin credentials are correct
   - **Database permission errors**: The app handles these with local storage fallbacks

7. **Build errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

8. **Database connection issues**
   - Verify Supabase URL and keys in `.env.local`
   - Check if Supabase project is active
   - Ensure migrations are applied

9. **Push notifications not showing**
   - Verify browser permission for notifications is granted
   - Check that `send-push-notification` function is deployed
   - Ensure the service worker `src/sw.ts` is being served and registered
   - Test from a secure origin (HTTPS or localhost)

10. **Google sign-in redirect issues**
    - Confirm `VITE_GOOGLE_OAUTH_CLIENT_ID` matches your Google OAuth Client ID
    - Verify redirect URIs include `/auth/v1/callback` and your app domain
    - Ensure Google provider is enabled in Supabase

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Team

- **Lead Developer**: Suraj
- **Contributors**: [See Contributors](https://github.com/Surajict/Smartreceipts/contributors)

## 🚀 Deployment

### **Production Deployment**

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to your preferred platform**
   - **Vercel**: Connect GitHub repository
   - **Netlify**: Upload `dist` folder
   - **Custom server**: Serve `dist` folder

3. **Set environment variables** on your deployment platform

### **Environment Variables for Production**
```env
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_PERPLEXITY_API_KEY=your_perplexity_api_key
VITE_GOOGLE_CLOUD_VISION_API_KEY=your_google_cloud_key
VITE_GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
# Stripe (optional)
VITE_STRIPE_ENVIRONMENT=live
VITE_STRIPE_LIVE_PUBLISHABLE_KEY=your_stripe_live_pk
```

### **Edge Functions Deployment**
```bash
# Deploy all edge functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy smart-search
```

### **Admin Portal Production Setup**
- Ensure admin database functions are deployed
- Consider changing hardcoded admin credentials for production
- Set up proper monitoring for subscription code usage
- Configure backup systems for admin data

---

## 🎯 Getting Started Checklist

- [ ] Install Node.js and npm
- [ ] Clone the repository
- [ ] Install dependencies with `npm install`
- [ ] Set up Supabase project and get API keys
- [ ] Get OpenAI API key for AI features
- [ ] Get Perplexity API key for validation
- [ ] Create `.env.local` with all required keys
- [ ] Add `VITE_GOOGLE_OAUTH_CLIENT_ID` for Google Sign-In
- [ ] (Optional) Add Stripe publishable key(s) for billing UI
- [ ] Run database migrations with `supabase db push`
- [ ] Deploy edge functions with `supabase functions deploy`
- [ ] Run `npm run dev` to start development
- [ ] Open `http://localhost:5173` in your browser
- [ ] Create an account and scan your first receipt!
- [ ] Test PDF receipt upload functionality
- [ ] Explore the warranty management features
- [ ] **NEW**: Access Admin Portal at `/admin` with provided credentials
- [ ] **NEW**: Test subscription code generation and management
 - [ ] **NEW**: Enable push notifications and receive warranty alerts

**Need help?** [Create an issue](https://github.com/Surajict/Smartreceipts/issues) or contact the development team.

---

## 🔄 Version History

### **v5.3.1 (2025-08-09) - Navigation Fix & Minor UI Polishing** (NEW!)
- ✅ Fixed routing in `ReceiptScanning` header: “Profile Settings” now navigates to `ProfilePage` (`/profile`).
- 🧭 Documented app routes in README for easier onboarding.

### **v5.3.0 (2025-07-14) - Notifications, OAuth & Billing Scaffold** (NEW!)
- 🔔 Push notifications via service worker and Edge Function
- 🔐 Google OAuth improvements with `VITE_GOOGLE_OAUTH_CLIENT_ID`
- 💳 Stripe billing scaffolding (mocked flows; real keys optional)
- 🧭 Duplicate detection service to warn on re-uploads
- 🧪 Testing scripts added (`npm run test`, `test:ui`, `test:coverage`)

### **v5.2.0 (2025-01-23) - Admin Portal & Subscription Management** (NEW!)
- 🛡️ **Complete Admin Portal System** with secure authentication and real-time dashboard
- 📊 **Subscription Code Management** with flexible duration options and instant generation
- 📈 **Real-time Statistics** showing total, used, active, and expired codes
- 🔧 **System Configuration Tools** for toggling between code-based and Stripe subscriptions
- 🔒 **RLS-Resistant Architecture** with graceful handling of database permission issues
- 💾 **Local Storage Fallbacks** for maintaining functionality with restricted database access
- 📋 **One-Click Code Copying** for easy distribution to users
- 🎯 **Session-Based Code Display** showing recently generated codes in real-time
- ⚡ **Database Function Integration** using secure RPC calls for admin operations
- 🛠️ **Robust Error Handling** with user-friendly messages and graceful degradation

### **v5.1.0 (2025-01-16) - UI/UX & Document Support Update**
- 🎨 **Consistent header design** across all pages with Smart Receipts branding
- 📱 **Dashboard improvements** with streamlined Quick Access tiles and settings in header
- 🆕 **Warranty Manager tile** for direct access to warranty management
- 📄 **PDF document support** with proper viewing in MyLibrary and WarrantyPage
- 🎯 **Custom favicon** with Smart Receipts branding for PWA experience
- 🔧 **Enhanced brand validation** returning clean brand names instead of verbose responses
- 📱 **PWA enhancements** with improved installability and offline capabilities

### **v5.0.0 (2025-01-15) - Major AI & Multi-Product Update**
- ✨ **Multi-product receipt support** with automatic detection
- 🔧 **Warranty per product tracking** instead of per receipt
- 🤖 **Perplexity AI validation** for data accuracy
- 🔍 **RAG-powered smart search** with natural language queries
- 📊 **Enhanced dashboard** with better organization
- 🛡️ **Improved security** and privacy controls

### **v4.0.0 (2024-07-01) - Smart Search & Embedding**
- 🔍 Vector search with 384-dimension embeddings
- 🧠 AI-powered smart search functionality
- 📈 Performance optimizations
- 🔒 Enhanced security policies

### **v3.0.0 (2024-06-01) - Enhanced Features**
- 📱 Improved mobile experience
- 🎨 Better UI/UX design
- 🔔 Notification system
- 👤 User profile management

---

*Transform your receipt chaos into organized digital records with Smart Receipts! Now with comprehensive admin tools for subscription management! 🧾✨🛡️*
