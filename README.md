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

**Example:** You buy a new coffee machine for $299 with a 2-year warranty. Just snap a photo of the receipt with Smart Receipts, and it automatically knows it's a "Keurig K-Elite Coffee Maker, purchased on December 15, 2024, with warranty until December 15, 2026." The app will remind you 30 days before your warranty expires!

## 🎯 Key Features

### 📱 **Smart Receipt Scanning**
- **Camera Capture**: Take photos directly within the app
- **File Upload**: Upload existing receipt images from your device
- **Long Receipt Support**: Special mode for capturing extra-long receipts
- **Manual Entry**: Backup option for damaged or unclear receipts

### 🤖 **AI-Powered Data Extraction**
- **OCR Technology**: Reads text from receipt images using Tesseract.js and Google Cloud Vision
- **GPT-4o Integration**: Intelligently extracts structured data from receipt text
- **Automatic Organization**: Categorizes products, brands, dates, and warranty information
- **Smart Error Correction**: Handles unclear text and missing information

### 🔔 **Warranty Management**
- **Automatic Tracking**: Calculates warranty expiration dates
- **Smart Alerts**: Reminds you before warranties expire
- **Extended Warranty Support**: Tracks both standard and extended warranties
- **Country-Specific Rules**: Adapts to different warranty regulations

### 👤 **User Management**
- **Secure Authentication**: Email/password registration and login
- **Personal Dashboard**: Overview of all your receipts and upcoming expirations
- **Profile Management**: Update personal information and preferences
- **Data Privacy**: Your receipts are private and secure

### 📊 **Receipt Library**
- **Search & Filter**: Find receipts by product, brand, date, or amount
- **Sort Options**: Organize by date, price, or warranty status
- **Detailed View**: See all extracted information for each receipt
- **Edit Capability**: Manually correct or update receipt data

## 🛠 Technology Stack

### **Frontend**
- **React 18.3.1** - Modern UI framework
- **TypeScript 5.5.3** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library

### **Backend & Services**
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database
  - Authentication & user management
  - File storage for receipt images
  - Real-time subscriptions
- **OpenAI GPT-4o** - AI-powered data extraction
- **Tesseract.js 5.0.4** - OCR text recognition
- **Google Cloud Vision** - Enhanced OCR capabilities

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
   
   # OpenAI Configuration (for AI data extraction)
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
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
│   │   ├── Dashboard.tsx      # Main user dashboard
│   │   ├── ReceiptScanning.tsx # Core scanning functionality
│   │   ├── MyLibrary.tsx      # Receipt library view
│   │   ├── ProfilePage.tsx    # User profile management
│   │   ├── Login.tsx          # Authentication
│   │   ├── SignUp.tsx         # User registration
│   │   └── ...               # Additional UI components
│   ├── lib/
│   │   └── supabase.ts       # Supabase client configuration
│   ├── services/
│   │   └── ocrService.ts     # OCR processing logic
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # App entry point
│   └── index.css             # Global styles
├── supabase/
│   ├── migrations/           # Database migrations
│   └── functions/            # Edge functions
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
  - **Manual**: Enter details manually

### **3. Review Extracted Data**
- The AI will automatically extract product information
- Review and edit any incorrect details
- Add additional notes if needed
- Save the receipt to your library

### **4. Manage Your Receipts**
- Access "My Library" to view all receipts
- Use search and filters to find specific items
- Edit receipt details anytime
- Track warranty expiration dates

### **5. Stay Updated**
- Check your dashboard for warranty alerts
- Update your profile settings for preferences
- Export receipt data when needed

## 🔧 Configuration

### **MCP Server Setup (Cursor IDE Users)**

To fix Supabase MCP server connectivity, create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=napulczxrrnsjtmaixzp"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your_supabase_access_token"
      }
    }
  }
}
```

### **Database Schema**

The app uses PostgreSQL with the following main tables:
- **receipts**: Stores receipt data and extracted information
- **auth.users**: Supabase authentication (built-in)
- **storage.objects**: Receipt image storage (built-in)

Key fields in the receipts table:
- `product_description`, `brand_name`, `model_number`
- `purchase_date`, `amount`, `country`
- `warranty_period`, `extended_warranty`
- `image_path`, `user_id`

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

3. **Before Contributing**
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
- **User authentication** - Supabase auth integration
- **File storage** - Receipt image storage with security policies
- **Indexes** - Performance optimization
- **Triggers** - Automatic timestamp updates

To apply migrations:
```bash
supabase db push
```

> **Note:** As of July 2024, all smart search and AI embedding features require 384-dimension embeddings. Make sure your database function and edge function are updated as described in the 'Smart Search & Embedding Setup' section.

## 🧠 Smart Search & Embedding Setup (2024-07)

### Why this matters
- The AI-powered smart search now uses 384-dimension embeddings for all queries and receipts.
- The database function for vector search **must** use `vector(384)` as the parameter type.
- This ensures natural language queries (like "Have I purchased any Nintendo product?") work reliably and securely.

### How to update your database
1. **Open Supabase SQL Editor**
2. **Run this migration:**
   ```sql
   DROP FUNCTION IF EXISTS match_receipts_simple(vector(384), double precision, int, uuid);
   DROP FUNCTION IF EXISTS match_receipts_simple(vector(1536), double precision, int, uuid);

   CREATE OR REPLACE FUNCTION match_receipts_simple(
     query_embedding vector(384),
     match_threshold double precision DEFAULT 0.3,
     match_count int DEFAULT 10,
     user_id uuid DEFAULT NULL
   )
   RETURNS TABLE(
     id uuid,
     product_description text,
     brand_name text,
     model_number text,
     purchase_date date,
     amount decimal,
     warranty_period text,
     store_name text,
     purchase_location text,
     similarity double precision
   )
   LANGUAGE plpgsql
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       r.id,
       r.product_description,
       r.brand_name,
       r.model_number,
       r.purchase_date,
       r.amount,
       r.warranty_period,
       r.store_name,
       r.purchase_location,
       1 - (r.embedding <=> query_embedding) as similarity
     FROM receipts r
     WHERE r.embedding IS NOT NULL
       AND r.user_id = match_receipts_simple.user_id
       AND 1 - (r.embedding <=> query_embedding) > match_threshold
     ORDER BY r.embedding <=> query_embedding
     LIMIT match_count;
   END;
   $$;

   GRANT EXECUTE ON FUNCTION match_receipts_simple TO authenticated;
   GRANT EXECUTE ON FUNCTION match_receipts_simple TO anon;
   ```
3. **Edge Function**: Ensure `supabase/functions/smart-search/index.ts` uses `dimensions: 384` for all embedding generation.

### Troubleshooting
- If smart search returns no results for natural language queries, check that both your embeddings and the database function use **384 dimensions**.
- If you previously used 1536-dimension embeddings, re-index your receipts with 384-dimension embeddings.
- Only your own receipts will ever be shown in search results (privacy enforced).

---

## 🔐 Security & Privacy

- **Row Level Security (RLS)**: Users can only access their own receipts
- **Secure Authentication**: Email/password with Supabase Auth
- **Encrypted Storage**: Receipt images stored securely in Supabase Storage
- **API Key Protection**: All sensitive keys stored in environment variables
- **Input Validation**: All user inputs are validated and sanitized

## 📱 Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Mobile browsers**: Responsive design works on all major mobile browsers

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

3. **Build errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Database connection issues**
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
VITE_GOOGLE_CLOUD_VISION_API_KEY=your_google_cloud_key
```

---

## 🎯 Getting Started Checklist

- [ ] Install Node.js and npm
- [ ] Clone the repository
- [ ] Install dependencies with `npm install`
- [ ] Set up Supabase project and get API keys
- [ ] Create `.env.local` with required keys
- [ ] Get OpenAI API key for AI features
- [ ] Run `npm run dev` to start development
- [ ] Open `http://localhost:5173` in your browser
- [ ] Create an account and scan your first receipt!

**Need help?** [Create an issue](https://github.com/Surajict/Smartreceipts/issues) or contact the development team.

---

*Transform your receipt chaos into organized digital records with Smart Receipts! 🧾✨*
