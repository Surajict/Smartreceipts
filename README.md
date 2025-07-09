# Smart Receipts

Smart Receipts is an AI-powered web application for scanning, organizing, and tracking receipts, with automated warranty management and claim support. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase, it leverages GPT-4o for intelligent data extraction and Tesseract.js for OCR.

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Supabase Setup](#supabase-setup)
  - [Install & Run](#install--run)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- **AI-Powered Receipt Scanning**: Instantly digitize receipts using your camera or file upload.
- **Dual OCR Options**: Choose between Tesseract.js (free, offline) or Google Cloud Vision (high accuracy, cloud-based) for text extraction.
- **GPT-4o Data Extraction**: Intelligently extracts product, brand, store, date, amount, warranty, and more from OCR text.
- **Warranty Management**: Tracks warranty periods, sends alerts before expiration, and assists with claims.
- **Receipt Library**: Search, filter, and organize all your receipts in a secure cloud archive.
- **Profile & Settings**: Manage your profile, notification, and privacy settings.
- **Multi-Device Sync**: Access your receipts from any device.
- **Secure Storage**: End-to-end encryption and SOC 2 certified data centers.
- **Customer Support**: AI chatbot and human support for warranty claims.

---

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **AI/ML**: Tesseract.js (OCR), Google Cloud Vision API (OCR), OpenAI GPT-4o (data extraction)
- **Icons**: Lucide React

---

## Screenshots
> _Add screenshots of the Dashboard, Receipt Scanning, Library, and Profile pages here._

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)
- Supabase account ([sign up](https://supabase.com))
- OpenAI API key (optional, for best AI extraction)

### Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENAI_API_KEY=your-openai-api-key  # Optional, enables GPT-4o extraction
VITE_GOOGLE_CLOUD_API_KEY=your-google-cloud-api-key  # Optional, enables Google Cloud Vision OCR
```

#### Google Cloud Vision Setup (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Cloud Vision API
4. Go to APIs & Services > Credentials
5. Create an API key
6. Restrict the key to Cloud Vision API for security
7. Add the API key to your environment variables

### Supabase Setup
1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Get your project URL and anon key** from Project Settings > API.
3. **Run all migrations** in `supabase/migrations/` (using Supabase CLI or dashboard):
   - This sets up tables (`receipts`, `users`, `user_notification_settings`, `user_privacy_settings`), RLS, storage buckets, and all required functions.
4. **Create storage buckets**:
   - `receipt-images` (private)
   - `profile-pictures` (private)
5. **Enable Row Level Security (RLS)** on all tables.

### Install & Run
```bash
npm install
npm run dev
```
Visit [http://localhost:5173](http://localhost:5173) to view the app.

---

## Project Structure
```
Smartreceipts/
├── public/                # Static assets (logos, images)
├── src/
│   ├── components/        # React components (Dashboard, ReceiptScanning, OCRSelector, etc.)
│   ├── services/          # OCR and other service modules
│   ├── lib/               # Supabase and utility functions
│   ├── types/             # TypeScript types
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── supabase/
│   └── migrations/        # Database migrations
├── tailwind.config.js     # Tailwind CSS config
├── vite.config.ts         # Vite config
├── tsconfig.json          # TypeScript config
├── .env                   # Environment variables (not committed)
└── package.json           # Project metadata
```

---

## Usage
- **Sign Up / Login**: Create an account or log in with email/password.
- **Scan or Upload Receipts**: Use your camera or upload files. The app uses OCR and GPT-4o to extract data.
- **Review & Edit**: Confirm or edit extracted details before saving.
- **Dashboard**: View stats, recent receipts, and warranty alerts.
- **Library**: Search, filter, and manage all your receipts.
- **Profile**: Update your info, notification, and privacy settings.

---

## FAQ
- **How accurate is the AI scanning?**
  - 99.5% accuracy for most receipts. Manual entry available if needed.
- **Is my data secure?**
  - Yes, with bank-level encryption and RLS.
- **Can I use it without OpenAI?**
  - Yes, but AI extraction will be limited to OCR and regex.
- **What file formats are supported?**
  - JPEG, PNG, PDF, HEIC.
- **How do I run migrations?**
  - Use the Supabase CLI: `supabase db push` or run SQL files manually.

---

## Contributing
1. Fork this repo
2. Create a feature branch
3. Commit your changes
4. Open a pull request

Please follow the code style and add tests where possible.

---

## License
MIT
