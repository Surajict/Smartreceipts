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
  Shield
} from 'lucide-react';
import { getCurrentUser, supabase } from '../lib/supabase';

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

const ProfilePage: React.FC<ProfilePageProps> = ({ onBackToDashboard }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [alertsCount] = useState(3);
  
  // Email update states
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailUpdateError, setEmailUpdateError] = useState<string | null>(null);
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const userProfile: UserProfile = {
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: currentUser.user_metadata?.full_name || '',
          avatar_url: currentUser.user_metadata?.avatar_url,
          created_at: currentUser.created_at || ''
        };
        
        setUser(userProfile);
        setEditedName(userProfile.full_name);
        setNewEmail(userProfile.email);
        
        // Load profile picture if exists
        if (userProfile.avatar_url) {
          const { data } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(userProfile.avatar_url);
          setProfilePicture(data.publicUrl);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: fileName
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setProfilePicture(urlData.publicUrl);
      setUploadSuccess(true);
      
      // Clear success message after 3 seconds
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

      // Update local state
      setUser(prev => prev ? { ...prev, full_name: editedName.trim() } : null);
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
      
      // Update local state
      setUser(prev => prev ? { ...prev, email: newEmail } : null);
      
      // Clear success message after 5 seconds
      setTimeout(() => setEmailUpdateSuccess(false), 5000);

    } catch (error: any) {
      console.error('Email update error:', error);
      setEmailUpdateError(error.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
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
              {/* Alerts */}
              <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors duration-200">
                <Bell className="h-6 w-6" />
                {alertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {alertsCount}
                  </span>
                )}
              </button>

              {/* Settings */}
              <button className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-200">
                <Settings className="h-6 w-6" />
              </button>

              {/* Back to Dashboard */}
              <button
                onClick={onBackToDashboard}
                className="flex items-center space-x-2 bg-white text-primary border-2 border-primary px-4 py-2 rounded-lg font-medium hover:bg-primary hover:text-white transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            My Profile
          </h1>
          <p className="text-xl text-text-secondary">
            Manage your account settings and profile information
          </p>
        </div>

        {/* Error/Success Messages */}
        {(uploadError || emailUpdateError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-700">{uploadError || emailUpdateError}</p>
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Picture Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
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
          </div>

          {/* Profile Information Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
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
        </div>

        {/* Account Actions */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-text-primary mb-6">Account Actions</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <button className="flex items-center justify-center space-x-3 p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 group">
                <Settings className="h-6 w-6 text-text-secondary group-hover:text-primary transition-colors duration-200" />
                <div className="text-left">
                  <div className="font-medium text-text-primary group-hover:text-primary transition-colors duration-200">
                    Account Settings
                  </div>
                  <div className="text-sm text-text-secondary">
                    Manage privacy and security
                  </div>
                </div>
              </button>

              <button className="flex items-center justify-center space-x-3 p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 group">
                <Bell className="h-6 w-6 text-text-secondary group-hover:text-primary transition-colors duration-200" />
                <div className="text-left">
                  <div className="font-medium text-text-primary group-hover:text-primary transition-colors duration-200">
                    Notifications
                  </div>
                  <div className="text-sm text-text-secondary">
                    Configure alert preferences
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;