import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, supabase, onAuthStateChange } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  user_metadata?: any;
}

interface UserContextType {
  user: UserProfile | null;
  profilePicture: string | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  updateProfilePicture: (newPictureUrl: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfilePicture = async (avatarUrl: string | undefined) => {
    if (!avatarUrl) {
      setProfilePicture(null);
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .createSignedUrl(avatarUrl, 365 * 24 * 60 * 60); // 1 year expiry
      
      if (error) {
        console.error('Error creating signed URL:', error);
        setProfilePicture(null);
      } else if (data?.signedUrl) {
        setProfilePicture(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
      setProfilePicture(null);
    }
  };

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const userProfile: UserProfile = {
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: currentUser.user_metadata?.full_name || '',
          avatar_url: currentUser.user_metadata?.avatar_url,
          created_at: currentUser.created_at || '',
          user_metadata: currentUser.user_metadata
        };
        
        setUser(userProfile);
        await loadProfilePicture(userProfile.avatar_url);
      } else {
        setUser(null);
        setProfilePicture(null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
      setProfilePicture(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await loadUser();
  };

  const updateProfilePicture = (newPictureUrl: string) => {
    setProfilePicture(newPictureUrl);
  };

  useEffect(() => {
    // Initial load
    loadUser();

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in, load their profile
        loadUser();
      } else if (event === 'SIGNED_OUT') {
        // User signed out, clear data
        setUser(null);
        setProfilePicture(null);
        setIsLoading(false);
      } else if (event === 'USER_UPDATED' && session?.user) {
        // User data updated (like profile picture), reload
        loadUser();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value: UserContextType = {
    user,
    profilePicture,
    isLoading,
    refreshUser,
    updateProfilePicture
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}; 