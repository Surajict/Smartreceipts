import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  User, 
  Mail, 
  Calendar, 
  Settings, 
  Bell,
  Edit3,
  Check,
  X,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  LogOut,
  ToggleLeft,
  ToggleRight,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { supabase, signOut } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import NotificationDropdown from './NotificationDropdown';

interface ProfilePageProps {
  onBackToDashboard: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

interface NotificationSettings {
  warranty_alerts: boolean;
  auto_system_update: boolean;
  marketing_notifications: boolean;
}

interface PrivacySettings {
  data_collection: boolean;
  data_analysis: 'allowed' | 'not_allowed';
  biometric_login: boolean;
  two_factor_auth: boolean;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBackToDashboard }) => {
  const { user, profilePicture, refreshUser, updateProfilePicture } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'data'>('profile');
  
  // Email update states
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailUpdateError, setEmailUpdateError] = useState<string | null>(null);
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  // Settings states
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    warranty_alerts: true,
    auto_system_update: true,
    marketing_notifications: false
  });
  
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    data_collection: true,
    data_analysis: 'allowed',
    biometric_login: false,
    two_factor_auth: false
  });
  
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setEditedName(user.full_name);
      setNewEmail(user.email);
      
      if (user.id) {
        console.log('User ID available, loading settings:', user.id);
        loadUserSettings();
      }
    }
  }, [user]);

  const loadUserSettings = async () => {
    if (!user?.id) return;
    console.log('Loading user settings for ID:', user.id);

    try {
      setIsLoadingSettings(true);
      
      // Load notification settings
      const { data: notificationData, error: notificationError } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (notificationError && notificationError.code !== 'PGRST116') {
        console.error('Error loading notification settings:', notificationError);
      } else if (notificationData) {
        console.log('Notification settings loaded successfully');
        setNotificationSettings(notificationData);
      } else {
        console.log('No notification settings found, using defaults');
        setNotificationSettings({
          warranty_alerts: true,
          auto_system_update: true,
          marketing_notifications: false
        });
      }

      // Load privacy settings
      const { data: privacyData, error: privacyError } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (privacyError && privacyError.code !== 'PGRST116') {
        console.error('Error loading privacy settings:', privacyError);
      } else if (privacyData) {
        console.log('Privacy settings loaded successfully');
        setPrivacySettings(privacyData);
      } else {
        console.log('No privacy settings found, using defaults');
        setPrivacySettings({
          data_collection: true,
          data_analysis: 'allowed',
          biometric_login: false,
          two_factor_auth: false
        });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onBackToDashboard();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadProfilePicture(file);
    }
  };

  const uploadProfilePicture = async (file: File) => {
    if (!user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/avatar.${fileExtension}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Replace existing file
        });

      if (uploadError) {
        throw uploadError;
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: fileName
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Create signed URL for the uploaded image
      const { data: urlData, error: urlError } = await supabase.storage
        .from('profile-pictures')
        .createSignedUrl(fileName, 365 * 24 * 60 * 60); // 1 year expiry

      if (urlError || !urlData?.signedUrl) {
        throw new Error(`Failed to create signed URL: ${urlError?.message}`);
      }

      // Update the profile picture display
      updateProfilePicture(urlData.signedUrl);
      
      // Reload user profile to ensure consistency
      await refreshUser();
      
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!user || !editedName.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: editedName.trim()
        }
      });

      if (error) throw error;

      // Refresh user data to get updated info
      await refreshUser();
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating name:', error);
      setUploadError('Failed to update name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!user || !newEmail.trim() || !currentPassword.trim()) {
      setEmailUpdateError('Please fill in all fields');
      return;
    }

    if (newEmail === user.email) {
      setEmailUpdateError('New email must be different from current email');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(newEmail)) {
      setEmailUpdateError('Please enter a valid email address');
      return;
    }

    setIsUpdatingEmail(true);
    setEmailUpdateError(null);

    try {
      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateError) {
        throw updateError;
      }

      setEmailUpdateSuccess(true);
      setIsEditingEmail(false);
      setCurrentPassword('');
      
      // Refresh user data to get updated info
      await refreshUser();
      
      // Clear success message after 5 seconds
      setTimeout(() => setEmailUpdateSuccess(false), 5000);

    } catch (error: any) {
      console.error('Email update error:', error);
      setEmailUpdateError(error.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;

    try {
      const updatedSettings = { ...notificationSettings, ...newSettings };
      
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;

      setNotificationSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setSettingsError('Failed to update notification settings');
    }
  };

  const updatePrivacySettings = async (newSettings: Partial<PrivacySettings>) => {
    if (!user) return;

    try {
      const updatedSettings = { ...privacySettings, ...newSettings };
      
      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings
        });

      if (error) throw error;

      setPrivacySettings(updatedSettings);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      setSettingsError('Failed to update privacy settings');
    }
  };

  const cancelEmailEdit = () => {
    setIsEditingEmail(false);
    setNewEmail(user?.email || '');
    setCurrentPassword('');
    setEmailUpdateError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean }> = ({ enabled, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        enabled ? 'bg-primary' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
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
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img 
                src="/Smart Receipt Logo.png" 
                alt="Smart Receipts Logo" 
                className="h-10 w-10 object-contain"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">
                Smart Receipts
              </span>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {user && <NotificationDropdown userId={user.id} />}
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={() => updateProfilePicture('')}
                      />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-text-primary hidden sm:inline">
                    {user?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-text-primary">
                        {user?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-text-secondary">{user?.email}</p>
                    </div>
                    <button
                      onClick={onBackToDashboard}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Dashboard</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-gray-100 hover:text-text-primary transition-colors duration-200 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Account Settings
          </h1>
          <p className="text-xl text-text-secondary">
            Manage your profile, notifications, and privacy settings
          </p>
        </div>

        {/* Error/Success Messages */}
        {(uploadError || emailUpdateError || settingsError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{uploadError || emailUpdateError || settingsError}</p>
            </div>
          </div>
        )}

        {(uploadSuccess || emailUpdateSuccess) && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-sm text-green-700">
                {uploadSuccess && 'Profile picture updated successfully!'}
                {emailUpdateSuccess && 'Email updated successfully! Please check your new email for confirmation.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'privacy', label: 'Privacy & Security', icon: Shield },
                { id: 'data', label: 'Data Management', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Profile Picture Card */}
                <div className="lg:col-span-1">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-text-primary mb-6">Profile Picture</h2>
                    
                    {/* Profile Picture Display */}
                    <div className="relative mb-6">
                      <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 border-4 border-white shadow-card">
                        {profilePicture ? (
                          <img
                            src={profilePicture}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-16 w-16 text-text-secondary" />
                          </div>
                        )}
                      </div>
                      
                      {/* Upload Overlay */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-2 bg-primary text-white rounded-full p-3 shadow-card hover:shadow-card-hover hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Upload Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 px-6 rounded-lg font-medium hover:from-primary/90 hover:to-secondary/90 transition-all duration-200 shadow-card hover:shadow-card-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          <span>Upload Profile Picture</span>
                        </>
                      )}
                    </button>

                    <p className="text-sm text-text-secondary mt-3">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>

                    {/* Hidden File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Profile Information Card */}
                <div className="lg:col-span-2">
                  <h2 className="text-xl font-bold text-text-primary mb-6">Profile Information</h2>
                  
                  <div className="space-y-6">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        <User className="inline h-4 w-4 mr-1" />
                        Full Name
                      </label>
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                            placeholder="Enter your full name"
                          />
                          <button
                            onClick={handleNameUpdate}
                            disabled={isSaving || !editedName.trim()}
                            className="bg-primary text-white p-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setEditedName(user.full_name);
                            }}
                            className="border border-gray-300 text-text-secondary p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <span className="text-text-primary font-medium">
                            {user.full_name || 'Not set'}
                          </span>
                          <button
                            onClick={() => setIsEditing(true)}
                            className="text-primary hover:text-primary/80 transition-colors duration-200"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        <Mail className="inline h-4 w-4 mr-1" />
                        Email Address
                      </label>
                      {isEditingEmail ? (
                        <div className="space-y-4">
                          {/* New Email Input */}
                          <div>
                            <input
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                              placeholder="Enter new email address"
                            />
                          </div>
                          
                          {/* Current Password Input */}
                          <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                              <Shield className="inline h-4 w-4 mr-1" />
                              Current Password (required for email change)
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200"
                                placeholder="Enter your current password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text-primary transition-colors duration-200"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleEmailUpdate}
                              disabled={isUpdatingEmail || !newEmail.trim() || !currentPassword.trim()}
                              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            >
                              {isUpdatingEmail ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Updating...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4" />
                                  <span>Update Email</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={cancelEmailEdit}
                              className="border border-gray-300 text-text-secondary px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                          
                          <p className="text-sm text-text-secondary">
                            You'll receive a confirmation email at your new address. Your email won't change until you confirm it.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <span className="text-text-primary font-medium">{user.email}</span>
                          <button
                            onClick={() => setIsEditingEmail(true)}
                            className="text-primary hover:text-primary/80 transition-colors duration-200"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Member Since */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Member Since
                      </label>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <span className="text-text-primary font-medium">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* User ID */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        User ID
                      </label>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <span className="text-text-secondary font-mono text-sm break-all">
                          {user.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="max-w-2xl">
                <h2 className="text-xl font-bold text-text-primary mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-primary">Warranty Alerts</h3>
                      <p className="text-sm text-text-secondary">Get notified when warranties are about to expire</p>
                    </div>
                    <ToggleSwitch
                      enabled={notificationSettings.warranty_alerts}
                      onChange={(enabled) => updateNotificationSettings({ warranty_alerts: enabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-primary">Auto System Update</h3>
                      <p className="text-sm text-text-secondary">Automatically update the app with new features</p>
                    </div>
                    <ToggleSwitch
                      enabled={notificationSettings.auto_system_update}
                      onChange={(enabled) => updateNotificationSettings({ auto_system_update: enabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-primary">Marketing Notifications</h3>
                      <p className="text-sm text-text-secondary">Receive updates about new features and promotions</p>
                    </div>
                    <ToggleSwitch
                      enabled={notificationSettings.marketing_notifications}
                      onChange={(enabled) => updateNotificationSettings({ marketing_notifications: enabled })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Privacy & Security Tab */}
            {activeTab === 'privacy' && (
              <div className="max-w-2xl">
                <h2 className="text-xl font-bold text-text-primary mb-6">Privacy & Security</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-primary">Data Collection</h3>
                      <p className="text-sm text-text-secondary">Allow us to collect usage data to improve the service</p>
                    </div>
                    <ToggleSwitch
                      enabled={privacySettings.data_collection}
                      onChange={(enabled) => updatePrivacySettings({ data_collection: enabled })}
                    />
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-text-primary">Data Analysis</h3>
                        <p className="text-sm text-text-secondary">How we can use your data for analysis</p>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="data_analysis"
                          value="allowed"
                          checked={privacySettings.data_analysis === 'allowed'}
                          onChange={(e) => updatePrivacySettings({ data_analysis: e.target.value as 'allowed' | 'not_allowed' })}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-text-secondary">Allowed</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="data_analysis"
                          value="not_allowed"
                          checked={privacySettings.data_analysis === 'not_allowed'}
                          onChange={(e) => updatePrivacySettings({ data_analysis: e.target.value as 'allowed' | 'not_allowed' })}
                          className="text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-text-secondary">Not Allowed</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-primary">Biometric Login</h3>
                      <p className="text-sm text-text-secondary">Use fingerprint or face recognition to log in</p>
                    </div>
                    <ToggleSwitch
                      enabled={privacySettings.biometric_login}
                      onChange={(enabled) => updatePrivacySettings({ biometric_login: enabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-primary">Two Factor Authentication</h3>
                      <p className="text-sm text-text-secondary">Add an extra layer of security to your account</p>
                    </div>
                    <ToggleSwitch
                      enabled={privacySettings.two_factor_auth}
                      onChange={(enabled) => updatePrivacySettings({ two_factor_auth: enabled })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Data Management Tab */}
            {activeTab === 'data' && (
              <div className="max-w-2xl">
                <h2 className="text-xl font-bold text-text-primary mb-6">Data Management</h2>
                
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Download className="h-5 w-5 text-text-secondary group-hover:text-primary transition-colors duration-200" />
                      <div className="text-left">
                        <h3 className="font-medium text-text-primary group-hover:text-primary transition-colors duration-200">
                          Back up data
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Download a copy of all your receipt data
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-text-secondary group-hover:text-primary transition-colors duration-200 rotate-180" />
                  </button>

                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 group">
                    <div className="flex items-center space-x-3">
                      <Trash2 className="h-5 w-5 text-text-secondary group-hover:text-primary transition-colors duration-200" />
                      <div className="text-left">
                        <h3 className="font-medium text-text-primary group-hover:text-primary transition-colors duration-200">
                          Clean Cache
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Clear temporary files and cached data
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-text-secondary group-hover:text-primary transition-colors duration-200 rotate-180" />
                  </button>

                  <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 group">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="h-5 w-5 text-text-secondary group-hover:text-primary transition-colors duration-200" />
                      <div className="text-left">
                        <h3 className="font-medium text-text-primary group-hover:text-primary transition-colors duration-200">
                          Sync now
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Manually sync your data across all devices
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-text-secondary group-hover:text-primary transition-colors duration-200 rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};

export default ProfilePage;