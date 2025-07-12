import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Save,
  Check,
  AlertCircle,
  Loader2,
  Globe,
  DollarSign
} from 'lucide-react';
import { getCurrentUser, signOut, updateUserProfile, getUserProfile } from '../lib/supabase';
import { AIService } from '../services/aiService';

interface ProfilePageProps {
  onBackToDashboard: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  native_country: string;
  avatar_url?: string;
}

interface NotificationSettings {
  warranty_alerts: boolean;
  auto_system_update: boolean;
  marketing_notifications: boolean;
}

interface PrivacySettings {
  data_collection: boolean;
  data_analysis: string;
  biometric_login: boolean;
  two_factor_auth: boolean;
  preferred_currency: string;
  display_currency_mode: string;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBackToDashboard }) => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    full_name: '',
    native_country: '',
    avatar_url: ''
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    warranty_alerts: true,
    auto_system_update: true,
    marketing_notifications: false
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    data_collection: true,
    data_analysis: 'allowed',
    biometric_login: false,
    two_factor_auth: false,
    preferred_currency: 'USD',
    display_currency_mode: 'native'
  });

  const countries = [
    'United States', 'United Arab Emirates', 'United Kingdom', 'Canada', 'Australia',
    'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
    'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Japan', 'South Korea',
    'China', 'India', 'Singapore', 'Hong Kong', 'Malaysia', 'Thailand', 'Indonesia',
    'Philippines', 'Vietnam', 'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia',
    'Peru', 'South Africa', 'Egypt', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain',
    'Oman', 'Israel', 'Turkey', 'Russia', 'Poland', 'Czech Republic', 'Hungary',
    'Romania', 'Bulgaria', 'Croatia', 'Serbia', 'Ukraine', 'New Zealand', 'Other'
  ];

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب' },
    { code: 'OMR', name: 'Omani Rial', symbol: '﷼' }
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      setUser(currentUser);

      // Load user profile
      const profileResult = await getUserProfile(currentUser.id);
      if (profileResult.data) {
        setProfile(profileResult.data);
        
        // Auto-detect currency when country is loaded
        if (profileResult.data.native_country && !privacySettings.preferred_currency) {
          await handleCountryChange(profileResult.data.native_country);
        }
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      setSaveError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountryChange = async (country: string) => {
    setProfile(prev => ({ ...prev, native_country: country }));
    
    // Auto-detect currency using OpenAI
    try {
      const currencyInfo = await AIService.getCurrencyForCountry(country);
      setPrivacySettings(prev => ({
        ...prev,
        preferred_currency: currencyInfo.currency_code
      }));
    } catch (error) {
      console.warn('Failed to auto-detect currency:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Update user profile
      const updateResult = await updateUserProfile(user.id, {
        full_name: profile.full_name,
        native_country: profile.native_country,
        notification_settings: notificationSettings,
        privacy_settings: privacySettings
      });

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSaveError(error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-text-secondary">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {/* Header */}
      <header className="bg-white shadow-card border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="flex items-center space-x-3">
                <img 
                  src="/Smart Receipt Logo.png" 
                  alt="Smart Receipts Logo" 
                  className="h-8 w-8 object-contain"
                />
                <h1 className="text-xl font-bold text-text-primary">Profile Settings</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {saveSuccess && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="text-sm font-medium">Saved successfully!</span>
                </div>
              )}
              
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {saveError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
            <p className="text-red-700">{saveError}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors duration-200 ${
                  activeTab === 'profile'
                    ? 'text-primary border-b-2 border-primary bg-blue-50'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <User className="h-5 w-5" />
                <span>Profile</span>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors duration-200 ${
                  activeTab === 'notifications'
                    ? 'text-primary border-b-2 border-primary bg-blue-50'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors duration-200 ${
                  activeTab === 'privacy'
                    ? 'text-primary border-b-2 border-primary bg-blue-50'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Shield className="h-5 w-5" />
                <span>Privacy & Currency</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-6">Profile Information</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-text-secondary mt-1">Email cannot be changed</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      <Globe className="inline h-4 w-4 mr-1" />
                      Native Country
                    </label>
                    <select
                      value={profile.native_country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select your country</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    <p className="text-xs text-text-secondary mt-1">
                      This helps us set your default currency and regional preferences
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-6">Notification Preferences</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-primary">Warranty Alerts</h3>
                      <p className="text-sm text-text-secondary">Get notified before your warranties expire</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.warranty_alerts}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, warranty_alerts: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-primary">System Updates</h3>
                      <p className="text-sm text-text-secondary">Receive notifications about app updates and new features</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.auto_system_update}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, auto_system_update: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-primary">Marketing Communications</h3>
                      <p className="text-sm text-text-secondary">Receive promotional emails and special offers</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.marketing_notifications}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, marketing_notifications: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy & Currency Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-6">Privacy & Currency Settings</h2>
                </div>

                {/* Currency Settings */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Currency Preferences
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Preferred Currency
                      </label>
                      <select
                        value={privacySettings.preferred_currency}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, preferred_currency: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {currencies.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name} ({currency.symbol})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-text-secondary mt-1">
                        This will be used as your default currency in the dashboard
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Currency Display Mode
                      </label>
                      <select
                        value={privacySettings.display_currency_mode}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, display_currency_mode: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="native">Native Currency Only</option>
                        <option value="usd">USD Only</option>
                        <option value="both">Both Currencies</option>
                      </select>
                      <p className="text-xs text-text-secondary mt-1">
                        How amounts are displayed in your dashboard
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-text-primary">Privacy Settings</h3>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">Data Collection</h4>
                      <p className="text-sm text-text-secondary">Allow us to collect usage data to improve the service</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.data_collection}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, data_collection: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-text-primary mb-2">Data Analysis</h4>
                    <p className="text-sm text-text-secondary mb-3">How we can use your data for analysis</p>
                    <select
                      value={privacySettings.data_analysis}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, data_analysis: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="allowed">Allowed</option>
                      <option value="not_allowed">Not Allowed</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-text-primary">Two-Factor Authentication</h4>
                      <p className="text-sm text-text-secondary">Add an extra layer of security to your account</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.two_factor_auth}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, two_factor_auth: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;