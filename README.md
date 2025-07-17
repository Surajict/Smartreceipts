# Smart Receipts - AI-Powered Receipt Management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39.0-green.svg)](https://supabase.com/)

> **Never lose a receipt or miss a warranty claim again!**

Smart Receipts is an intelligent receipt management application that uses AI to automatically scan, organize, and track your receipts while sending timely warranty alerts. Transform your receipt chaos into organized digital records with just a photo.

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

### 👤 **User Management**
- **Secure Authentication**: Email/password registration and login
- **Personal Dashboard**: Overview of all your receipts and upcoming expirations
- **Profile Management**: Update personal information and preferences
- **Notification Settings**: Customize warranty alerts and system notifications
- **Privacy Controls**: Manage data collection and privacy preferences
- **Data Privacy**: Your receipts are private and secure

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
- **OpenAI GPT-4o** - AI-powered data extraction and RAG
- **Perplexity AI** - Data validation and correction
- **Tesseract.js 5.0.4** - OCR text recognition
- **Google Cloud Vision** - Enhanced OCR capabilities

### **AI & Machine Learning**
- **Vector Embeddings**: 384-dimension embeddings for semantic search
- **RAG (Retrieval-Augmented Generation)**: Intelligent question answering
- **Multi-Model AI**: OpenAI for extraction, Perplexity for validation
- **Semantic Search**: pgvector for fast similarity search

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
├── public/                     # Static assets
│   ├── Smart Receipt Logo.png  # App logo
│   └── vite.svg               # Vite logo
├── src/
│   ├── components/            # React components
│   │   ├── Dashboard.tsx      # Main user dashboard with smart search
│   │   ├── ReceiptScanning.tsx # Core scanning functionality
│   │   ├── MyLibrary.tsx      # Receipt library view
│   │   ├── ProfilePage.tsx    # User profile management
│   │   ├── WarrantyPage.tsx   # Warranty management
│   │   ├── Login.tsx          # Authentication
│   │   ├── SignUp.tsx         # User registration
│   │   └── ...               # Additional UI components
│   ├── lib/
│   │   └── supabase.ts       # Supabase client configuration
│   ├── services/
│   │   ├── ocrService.ts     # OCR processing logic
│   │   ├── multiProductReceiptService.ts # Multi-product receipt handling
│   │   ├── perplexityValidationService.ts # AI validation service
│   │   └── ragService.ts     # RAG (Retrieval-Augmented Generation)
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # App entry point
│   └── index.css             # Global styles
├── supabase/
│   ├── migrations/           # Database migrations
│   └── functions/            # Edge functions (smart-search, etc.)
├── package.json              # Dependencies and scripts
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
└── README.md                 # This file
```

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

## 🔧 Configuration

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
- **auth.users**: Supabase authentication (built-in)
- **storage.objects**: Receipt image storage (built-in)

Key fields in the receipts table:
- `product_description`, `brand_name`, `model_number`
- `purchase_date`, `amount`, `receipt_total`
- `warranty_period` (per product), `extended_warranty`
- `receipt_group_id`, `is_group_receipt` (for multi-product support)
- `embedding` (for vector search)
- `image_url`, `user_id`

## 🆕 Latest Features (2024-2025)

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

3. **Testing**
   - Test multi-product receipt flows
   - Verify warranty tracking accuracy
   - Test AI validation features
   - Ensure search functionality works

4. **Before Contributing**
   ```bash
   # Fork the repository
   # Create a new branch
   git checkout -b feature/your-feature-name
   
   # Make your changes
   # Test thoroughly
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

## 📊 Database Migrations

The project includes comprehensive database migrations in `supabase/migrations/`. Key migrations include:

- **Receipt storage** - Main receipts table with RLS policies
- **Multi-product support** - Grouping columns and indexes
- **Warranty per product** - Product-level warranty tracking
- **Vector search** - pgvector extension and embedding support
- **User management** - Profile and settings tables
- **File storage** - Receipt image storage with security policies
- **Performance optimization** - Indexes and triggers

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
Deploy the smart-search edge function:
```bash
supabase functions deploy smart-search
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

## 📱 Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile browsers**: Responsive design works on all major mobile browsers
- **PWA Support**: Can be installed as a Progressive Web App

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

6. **Build errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

7. **Database connection issues**
   - Verify Supabase URL and keys in `.env.local`
   - Check if Supabase project is active
   - Ensure migrations are applied

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
```

### **Edge Functions Deployment**
```bash
# Deploy all edge functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy smart-search
```

---

## 🎯 Getting Started Checklist

- [ ] Install Node.js and npm
- [ ] Clone the repository
- [ ] Install dependencies with `npm install`
- [ ] Set up Supabase project and get API keys
- [ ] Get OpenAI API key for AI features
- [ ] Get Perplexity API key for validation
- [ ] Create `.env.local` with all required keys
- [ ] Run database migrations with `supabase db push`
- [ ] Deploy edge functions with `supabase functions deploy`
- [ ] Run `npm run dev` to start development
- [ ] Open `http://localhost:5173` in your browser
- [ ] Create an account and scan your first receipt!
- [ ] Test PDF receipt upload functionality
- [ ] Explore the warranty management features

**Need help?** [Create an issue](https://github.com/Surajict/Smartreceipts/issues) or contact the development team.

---

## 🔄 Version History

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

*Transform your receipt chaos into organized digital records with Smart Receipts! 🧾✨*
