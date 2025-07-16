import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

// Configure Supabase client with Google OAuth options
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Configure Google OAuth provider
    providers: {
      google: {
        clientId: '751272252597-eh4q33q5qevsrse3m0a7p6dtsnse8ocm.apps.googleusercontent.com'
      }
    }
  }
})

/**
 * Global data cleaning function to remove problematic fields before database operations
 * This ensures no old or invalid field names are sent to the database
 */
export const cleanReceiptDataGlobal = (receiptData: any): any => {
  if (!receiptData || typeof receiptData !== 'object') {
    return receiptData;
  }

  const cleanedData = { ...receiptData };
  
  // Comprehensive list of fields that might cause database errors
  const fieldsToRemove = [
    'has_line_items',
    'has_multiple_products', 
    'line_items',
    'items',
    'products', // This shouldn't be in individual receipt records
    'hasLineItems',
    'hasMultipleProducts',
    'lineItems',
    'multipleProducts',
    'productItems',
    'receiptItems'
  ];
  
  // Remove problematic fields
  fieldsToRemove.forEach(field => {
    if (cleanedData.hasOwnProperty(field)) {
      console.log(`🧹 Removing problematic field from database operation: ${field}`);
      delete cleanedData[field];
    }
  });
  
  // Log for debugging
  console.log('🛡️ Global data cleaning applied:', {
    original: receiptData,
    cleaned: cleanedData
  });
  
  return cleanedData;
};

/**
 * Test function to validate the global cleaning function
 * This can be called from the browser console for debugging
 */
export const testGlobalCleaning = () => {
  const testData = {
    product_description: 'Test Product',
    brand_name: 'Test Brand',
    has_line_items: true,
    has_multiple_products: false,
    line_items: ['item1', 'item2'],
    products: [{ name: 'product1' }],
    hasLineItems: true,
    amount: 100
  };

  console.log('🧪 Testing global cleaning function...');
  const cleaned = cleanReceiptDataGlobal(testData);
  
  console.log('✅ Global cleaning test completed:', {
    original: testData,
    cleaned: cleaned,
    removedFields: Object.keys(testData).filter(key => !cleaned.hasOwnProperty(key))
  });
  
  return cleaned;
};

// Make the test function available globally for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).testGlobalCleaning = testGlobalCleaning;
  (window as any).cleanReceiptDataGlobal = cleanReceiptDataGlobal;
}

// Helper function to get signed URL for existing receipt image
export const getReceiptImageSignedUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    if (!imageUrl) return null;
    
    // If it's already a signed URL (contains token), return as is
    if (imageUrl.includes('token=')) {
      return imageUrl;
    }
    
    // Extract the file path from the URL
    let filePath = '';
    
    if (imageUrl.includes('/storage/v1/object/public/receipt-images/')) {
      // Extract path from public URL format
      filePath = imageUrl.split('/storage/v1/object/public/receipt-images/')[1];
    } else if (imageUrl.includes('/storage/v1/object/sign/receipt-images/')) {
      // Extract path from signed URL format
      filePath = imageUrl.split('/storage/v1/object/sign/receipt-images/')[1]?.split('?')[0];
    } else {
      // Assume it's just the file path
      filePath = imageUrl;
    }
    
    if (!filePath) {
      console.warn('Could not extract file path from URL:', imageUrl);
      return null;
    }
    
    // Generate new signed URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from('receipt-images')
      .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 year expiry
    
    if (urlError || !urlData?.signedUrl) {
      console.error('Error creating signed URL for existing image:', urlError);
      return null;
    }
    
    return urlData.signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
    return null;
  }
};

// Receipt-specific database functions
export const saveReceiptToDatabase = async (receiptData: any, userId: string) => {
  try {
    console.log('📝 [saveReceiptToDatabase] Inserting into receipts:', receiptData);
    // Clean the data globally before any processing
    const cleanedReceiptData = cleanReceiptDataGlobal(receiptData);
    // Validate required fields
    if (!cleanedReceiptData.product_description?.trim()) {
      throw new Error('Product description is required');
    }
    if (!cleanedReceiptData.brand_name?.trim()) {
      throw new Error('Brand name is required');
    }
    if (!cleanedReceiptData.purchase_date) {
      throw new Error('Purchase date is required');
    }
    if (!cleanedReceiptData.warranty_period?.trim()) {
      throw new Error('Warranty period is required');
    }
    // Insert into receipts table
    const { data, error } = await supabase
      .from('receipts')
      .insert([cleanedReceiptData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving receipt to database:', error);
    throw error;
  }
};

export const uploadReceiptImage = async (file: File | Blob, userId: string, filename?: string) => {
  try {
    console.log('Uploading receipt image for user:', userId);
    
    // Generate unique filename if not provided
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file instanceof File ? file.name.split('.').pop() || 'jpg' : 'jpg';
    const fileName = filename || `${userId}/${timestamp}-${randomId}.${fileExtension}`;
    
    console.log('Uploading to path:', fileName);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipt-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Image upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    console.log('Image uploaded successfully:', uploadData);

    // Generate signed URL for private bucket (valid for 1 year)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('receipt-images')
      .createSignedUrl(fileName, 365 * 24 * 60 * 60); // 1 year expiry

    if (urlError || !urlData?.signedUrl) {
      console.error('Error creating signed URL:', urlError);
      throw new Error(`Failed to create signed URL: ${urlError?.message}`);
    }

    console.log('Signed URL created:', urlData.signedUrl);

    return { 
      data: { 
        path: fileName, 
        url: urlData.signedUrl
      }, 
      error: null 
    };

  } catch (err: any) {
    console.error('Upload image error:', err);
    return { 
      data: null, 
      error: { message: err.message || 'Failed to upload image' } 
    };
  }
};

export const getUserReceiptStats = async (userId: string) => {
  try {
    console.log('Getting receipt stats for user:', userId);

    const { data, error } = await supabase
      .rpc('get_user_receipt_stats', { user_uuid: userId });

    if (error) {
      console.error('Error getting receipt stats:', error);
      throw error;
    }

    console.log('Receipt stats:', data);
    return { data: data[0] || {}, error: null };

  } catch (err: any) {
    console.error('Get receipt stats error:', err);
    return { 
      data: null, 
      error: { message: err.message || 'Failed to get receipt stats' } 
    };
  }
};

export const searchUserReceipts = async (userId: string, query: string, limit: number = 10) => {
  try {
    console.log('Searching receipts for user:', userId, 'query:', query);

    const { data, error } = await supabase
      .rpc('search_user_receipts', { 
        user_uuid: userId, 
        search_query: query,
        limit_count: limit 
      });

    if (error) {
      console.error('Error searching receipts:', error);
      throw error;
    }

    console.log('Search results:', data);
    return { data: data || [], error: null };

  } catch (err: any) {
    console.error('Search receipts error:', err);
    return { 
      data: [], 
      error: { message: err.message || 'Failed to search receipts' } 
    };
  }
};

export const getUserReceipts = async (userId: string, limit?: number, offset?: number) => {
  try {
    console.log('Getting receipts for user:', userId);

    let query = supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting receipts:', error);
      throw error;
    }

    console.log('Retrieved receipts:', data?.length);
    return { data: data || [], error: null };

  } catch (err: any) {
    console.error('Get receipts error:', err);
    return { 
      data: [], 
      error: { message: err.message || 'Failed to get receipts' } 
    };
  }
};

export const getReceiptById = async (userId: string, receiptId: string) => {
  try {
    console.log('Getting receipt by ID:', receiptId, 'for user:', userId);

    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .eq('id', receiptId)
      .single();

    if (error) {
      console.error('Error getting receipt by ID:', error);
      throw error;
    }

    console.log('Retrieved receipt:', data);
    return { data, error: null };

  } catch (err: any) {
    console.error('Get receipt by ID error:', err);
    return { 
      data: null, 
      error: { message: err.message || 'Failed to get receipt' } 
    };
  }
};

export const getReceiptWithWarrantyStatus = async (userId: string, receiptId: string) => {
  try {
    console.log('Getting receipt with warranty status:', receiptId);

    // Use the function instead of a view
    const { data, error } = await supabase
      .rpc('get_receipts_with_warranty_status', { user_uuid: userId });

    if (error) {
      console.error('Error getting receipts with warranty status:', error);
      throw error;
    }

    // Filter for the specific receipt
    const receipt = data?.find((r: any) => r.id === receiptId);
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    console.log('Receipt with warranty status:', receipt);
    return { data: receipt, error: null };

  } catch (err: any) {
    console.error('Get receipt with warranty status error:', err);
    return { 
      data: null, 
      error: { message: err.message || 'Failed to get receipt' } 
    };
  }
};

export const deleteReceipt = async (userId: string, receiptId?: string, receiptGroupId?: string) => {
  try {
    if (receiptGroupId) {
      // Delete all receipts in the group
      console.log('Deleting all receipts in group:', receiptGroupId, 'for user:', userId);
      // Get all receipts in the group
      const { data: receipts, error: fetchError } = await supabase
        .from('receipts')
        .select('id, image_path')
        .eq('user_id', userId)
        .eq('receipt_group_id', receiptGroupId);
      if (fetchError) {
        console.error('Error fetching group receipts for deletion:', fetchError);
        throw fetchError;
      }
      // Delete all receipts in the group
      const { error: deleteError } = await supabase
        .from('receipts')
        .delete()
        .eq('user_id', userId)
        .eq('receipt_group_id', receiptGroupId);
      if (deleteError) {
        console.error('Error deleting group receipts:', deleteError);
        throw deleteError;
      }
      // Delete all associated images
      const imagePaths = receipts?.map((r: any) => r.image_path).filter(Boolean);
      if (imagePaths && imagePaths.length > 0) {
        try {
          const { error: storageError } = await supabase.storage
            .from('receipt-images')
            .remove(imagePaths);
          if (storageError) {
            console.warn('Failed to delete images from storage:', storageError);
          }
        } catch (storageErr) {
          console.warn('Error deleting images from storage:', storageErr);
        }
      }
      console.log('Group receipts deleted successfully');
      return { data: true, error: null };
    }
    // Single receipt deletion (existing logic)
    if (!receiptId) throw new Error('No receiptId provided for single deletion');
    console.log('Deleting receipt:', receiptId, 'for user:', userId);
    // First get the receipt to check for image
    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('image_url, image_path')
      .eq('user_id', userId)
      .eq('id', receiptId)
      .single();
    if (fetchError) {
      console.error('Error fetching receipt for deletion:', fetchError);
      throw fetchError;
    }
    // Delete the receipt from database
    const { error: deleteError } = await supabase
      .from('receipts')
      .delete()
      .eq('user_id', userId)
      .eq('id', receiptId);
    if (deleteError) {
      console.error('Error deleting receipt:', deleteError);
      throw deleteError;
    }
    // Delete associated image if exists
    if (receipt?.image_path) {
      try {
        const { error: storageError } = await supabase.storage
          .from('receipt-images')
          .remove([receipt.image_path]);
        if (storageError) {
          console.warn('Failed to delete image from storage:', storageError);
        }
      } catch (storageErr) {
        console.warn('Error deleting image from storage:', storageErr);
      }
    }
    console.log('Receipt deleted successfully');
    return { data: true, error: null };
  } catch (err: any) {
    console.error('Delete receipt error:', err);
    return { 
      data: null, 
      error: { message: err.message || 'Failed to delete receipt' } 
    };
  }
};

export const updateReceipt = async (userId: string, receiptId: string, updateData: any) => {
  try {
    console.log('Updating receipt:', receiptId, 'for user:', userId);

    // Prepare the update data
    const cleanedData = {
      product_description: updateData.product_description?.trim(),
      brand_name: updateData.brand_name?.trim(),
      store_name: updateData.store_name?.trim() || null,
      purchase_location: updateData.purchase_location?.trim() || null,
      purchase_date: updateData.purchase_date,
      amount: updateData.amount && updateData.amount > 0 ? updateData.amount : null,
      warranty_period: updateData.warranty_period?.trim(),
      extended_warranty: updateData.extended_warranty?.trim() || null,
      model_number: updateData.model_number?.trim() || null,
      country: updateData.country?.trim(),
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(cleanedData).forEach(key => {
      if ((cleanedData as any)[key] === undefined) {
        delete (cleanedData as any)[key];
      }
    });

    const { data, error } = await supabase
      .from('receipts')
      .update(cleanedData)
      .eq('user_id', userId)
      .eq('id', receiptId)
      .select();

    if (error) {
      console.error('Error updating receipt:', error);
      throw error;
    }

    console.log('Receipt updated successfully:', data);
    return { data: data[0], error: null };

  } catch (err: any) {
    console.error('Update receipt error:', err);
    return { 
      data: null, 
      error: { message: err.message || 'Failed to update receipt' } 
    };
  }
};

// Google sign in function
export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google sign in process')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    if (error) {
      console.error('Google SignIn error:', error)
      return { data: null, error }
    }

    console.log('Google SignIn initiated:', data)
    return { data, error: null }
  } catch (err: any) {
    console.error('Unexpected Google signin error:', err)
    return { 
      data: null, 
      error: { 
        message: 'An unexpected error occurred during Google signin. Please try again.',
        details: err
      } 
    }
  }
}

// Auth helper functions with improved error handling
export const signUp = async (email: string, password: string, fullName: string) => {
  try {
    console.log('Starting signup process for:', email)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    })
    
    if (error) {
      console.error('SignUp error:', error)
      
      // Handle specific Supabase errors
      if (error.message.includes('User already registered') || 
          error.message.includes('already registered') || 
          error.message.includes('user_already_exists')) {
        return { 
          data: null, 
          error: { message: 'This email is already registered. Try signing in instead.' } 
        }
      }
      
      if (error.message.includes('Password should be at least')) {
        return { 
          data: null, 
          error: { message: 'Password must be at least 6 characters long.' } 
        }
      }
      
      if (error.message.includes('Invalid email')) {
        return { 
          data: null, 
          error: { message: 'Please enter a valid email address.' } 
        }
      }
      
      if (error.message.includes('signup_disabled')) {
        return { 
          data: null, 
          error: { message: 'Account creation is temporarily disabled. Please try again later.' } 
        }
      }
      
      if (error.message.includes('Database error') || 
          error.message.includes('unexpected_failure')) {
        return { 
          data: null, 
          error: { message: 'Account creation failed due to a server error. Please try again in a few moments.' } 
        }
      }
      
      return { data: null, error }
    }

    if (data.user) {
      console.log('Signup successful, user created:', data.user.id)
      
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Verify user profile was created
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.warn('Profile verification failed:', profileError)
          // Try to create profile manually if trigger failed
          await createUserProfileManually(data.user.id, email, fullName)
        } else if (profile) {
          console.log('User profile created successfully')
        }
      } catch (profileErr) {
        console.warn('Profile verification error:', profileErr)
        // Try to create profile manually
        await createUserProfileManually(data.user.id, email, fullName)
      }
    }
    
    return { data, error: null }
  } catch (err: any) {
    console.error('Unexpected signup error:', err)
    return { 
      data: null, 
      error: { 
        message: 'An unexpected error occurred during signup. Please try again.',
        details: err
      } 
    }
  }
}

// Helper function to create user profile manually if trigger fails
const createUserProfileManually = async (userId: string, email: string, fullName: string) => {
  try {
    console.log('Creating user profile manually for:', userId)
    
    // Create user profile
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName
      }, {
        onConflict: 'id'
      })
    
    if (userError) {
      console.error('Failed to create user profile manually:', userError)
    } else {
      console.log('User profile created manually')
    }

    // Create notification settings
    const { error: notifError } = await supabase
      .from('user_notification_settings')
      .upsert({
        user_id: userId,
        warranty_alerts: true,
        auto_system_update: true,
        marketing_notifications: false
      }, {
        onConflict: 'user_id'
      })
    
    if (notifError) {
      console.error('Failed to create notification settings manually:', notifError)
    } else {
      console.log('Notification settings created manually')
    }

    // Create privacy settings
    const { error: privacyError } = await supabase
      .from('user_privacy_settings')
      .upsert({
        user_id: userId,
        data_collection: true,
        data_analysis: 'allowed',
        biometric_login: false,
        two_factor_auth: false
      }, {
        onConflict: 'user_id'
      })
    
    if (privacyError) {
      console.error('Failed to create privacy settings manually:', privacyError)
    } else {
      console.log('Privacy settings created manually')
    }
    
  } catch (err) {
    console.error('Error creating user profile manually:', err)
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    console.log('Attempting to sign in user:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('SignIn error:', error)
      
      // Handle specific sign-in errors
      if (error.message.includes('Invalid login credentials') || 
          error.message.includes('invalid_credentials') ||
          error.message.includes('Invalid email or password')) {
        return { 
          data: null, 
          error: { message: 'Invalid email or password. Please try again.' } 
        }
      }
      
      if (error.message.includes('Email not confirmed') || 
          error.message.includes('email_not_confirmed')) {
        return { 
          data: null, 
          error: { message: 'Please check your email and confirm your account before signing in.' } 
        }
      }
      
      if (error.message.includes('Too many requests')) {
        return { 
          data: null, 
          error: { message: 'Too many login attempts. Please wait a few minutes before trying again.' } 
        }
      }
      
      return { data: null, error }
    } else {
      console.log('SignIn successful for:', email)
      
      // Ensure user settings exist for existing users
      if (data.user) {
        try {
          await initializeUserSettings(data.user.id)
        } catch (settingsError) {
          console.warn('Failed to initialize user settings on signin:', settingsError)
        }
      }
    }
    
    return { data, error: null }
  } catch (err: any) {
    console.error('Unexpected signin error:', err)
    return { 
      data: null, 
      error: { 
        message: 'An unexpected error occurred during signin. Please try again.',
        details: err
      } 
    }
  }
}

export const signOut = async () => {
  try {
    console.log('Signing out user')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('SignOut error:', error)
    } else {
      console.log('SignOut successful')
    }
    return { error }
  } catch (err: any) {
    console.error('Unexpected signout error:', err)
    return { error: { message: 'Failed to sign out. Please try again.' } }
  }
}

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // Only log actual errors, not when user is simply not authenticated
      if (error.message !== 'Auth session missing!') {
        console.error('Get user error:', error)
      }
      return null
    }
    
    return user
  } catch (err: any) {
    // Only log if it's not a session missing error
    if (err.message !== 'Auth session missing!') {
      console.error('Unexpected get user error:', err)
    }
    return null
  }
}

export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      // Only log actual errors, not when session is missing
      if (error.message !== 'Auth session missing!') {
        console.error('Get session error:', error)
      }
      return null
    }
    
    return session
  } catch (err: any) {
    // Only log if it's not a session missing error
    if (err.message !== 'Auth session missing!') {
      console.error('Unexpected get session error:', err)
    }
    return null
  }
}

// Auth state listener
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session?.user?.email)
    callback(event, session)
  })
}

// Test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    // If using placeholder values, return false
    if (supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
      console.warn('Using placeholder Supabase credentials')
      return false
    }
    
    console.log('Testing Supabase connection...')
    
    // Test basic connection by checking if we can access the auth endpoint
    const { data, error } = await supabase.auth.getSession()
    
    if (error && error.message !== 'Auth session missing!') {
      console.error('Supabase connection test failed:', error)
      return false
    }
    
    console.log('Supabase connection successful')
    return true
  } catch (err) {
    console.error('Supabase connection test error:', err)
    return false
  }
}

// Initialize user settings (can be called separately if needed)
export const initializeUserSettings = async (userId: string) => {
  try {
    console.log('Initializing settings for user:', userId)
    
    // Check if settings already exist
    const { data: existingNotif } = await supabase
      .from('user_notification_settings')
      .select('user_id')
      .eq('user_id', userId)
      .limit(1)

    const { data: existingPrivacy } = await supabase
      .from('user_privacy_settings')
      .select('user_id')
      .eq('user_id', userId)
      .limit(1)

    // Initialize notification settings if they don't exist
    if (!existingNotif || existingNotif.length === 0) {
      const { error: notifError } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: userId,
          warranty_alerts: true,
          auto_system_update: true,
          marketing_notifications: false
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true
        })

      if (notifError) {
        console.warn('Failed to initialize notification settings:', notifError)
      } else {
        console.log('Notification settings initialized successfully')
      }
    }

    // Initialize privacy settings if they don't exist
    if (!existingPrivacy || existingPrivacy.length === 0) {
      const { error: privacyError } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: userId,
          data_collection: true,
          data_analysis: 'allowed',
          biometric_login: false,
          two_factor_auth: false
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true
        })

      if (privacyError) {
        console.warn('Failed to initialize privacy settings:', privacyError)
      } else {
        console.log('Privacy settings initialized successfully')
      }
    }

    return true
  } catch (error) {
    console.error('Error initializing user settings:', error)
    return false
  }
}

// Test OpenAI API connection
export const testOpenAIConnection = async () => {
  try {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured');
      return false;
    }

    console.log('Testing OpenAI API connection...');
    
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`
      }
    });

    if (response.ok) {
      console.log('OpenAI API connection successful');
      return true;
    } else {
      console.error('OpenAI API connection failed:', response.status, response.statusText);
      return false;
    }
  } catch (err) {
    console.error('OpenAI API connection test error:', err);
    return false;
  }
}

// GPT-powered receipt data extraction with multi-product support
export const extractReceiptDataWithGPT = async (extractedText: string) => {
  try {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Extracting receipt data with GPT...');

    const prompt = `You are a reliable AI that extracts structured receipt details from plain text.
Analyze the receipt and determine if it contains one product or multiple products.

IMPORTANT: Look for multiple line items with different product names and prices. If you see 2 or more distinct products with individual prices, this is a MULTI-PRODUCT receipt.

Examples of MULTI-PRODUCT receipts:
- "DJI Mini Drone $899.00, Nintendo Switch $649.00, Surface Pro $1299.00"
- Multiple different items listed separately with individual prices

WARRANTY PERIOD DETECTION:
- Look for explicit warranty mentions: "1 year warranty", "2 year limited warranty", "90 days warranty"
- For electronics without explicit warranty, use these defaults:
  * Gaming consoles (Nintendo, Xbox, PlayStation): "1 year"
  * Computers/laptops/tablets (Surface, MacBook, iPad): "1 year"
  * Smartphones (iPhone, Samsung, Pixel): "1 year"
  * Drones and cameras (DJI, GoPro): "1 year"
  * TVs and appliances: "1 year"
  * Small electronics: "1 year"
- If no warranty info found, default to "1 year" for electronics

For SINGLE PRODUCT receipts, return JSON with these fields:
- product_description (string): Main product or service purchased
- brand_name (string): Brand or manufacturer name
- store_name (string): Name of the store/merchant
- purchase_location (string): Store location/address
- purchase_date (string): Date in YYYY-MM-DD format
- amount (number): Total amount paid (numeric only, no currency symbol)
- warranty_period (string): Warranty duration for this specific product (e.g., "1 year", "6 months")
- extended_warranty (string): Extended warranty info if any
- model_number (string): Product model number if available
- country (string): Country where purchase was made

For MULTI-PRODUCT receipts, return JSON with these fields:
- store_name (string): Name of the store/merchant
- purchase_location (string): Store location/address
- purchase_date (string): Date in YYYY-MM-DD format
- total_amount (number): Total amount paid for all products
- extended_warranty (string): Extended warranty info if any
- country (string): Country where purchase was made
- products (array): Array of product objects, each with:
  - product_description (string): Product name
  - brand_name (string): Brand name
  - model_number (string): Model number if available
  - amount (number): Individual product price
  - warranty_period (string): Individual product warranty period (REQUIRED for each product)

If a field is missing, set its value to null. Return ONLY valid JSON, no extra text.

Receipt text:
${extractedText}

Return only valid JSON:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a precise data extraction assistant. Return only valid JSON with the requested fields.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Clean the response to extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Check if this is a multi-product receipt
    const isMultiProduct = extractedData.products && Array.isArray(extractedData.products);
    
    if (isMultiProduct) {
      // Handle multi-product receipt
      const baseData = {
        store_name: extractedData.store_name || null,
        purchase_location: extractedData.purchase_location || null,
        purchase_date: extractedData.purchase_date || new Date().toISOString().split('T')[0],
        total_amount: extractedData.total_amount || null,
        extended_warranty: extractedData.extended_warranty || null,
        country: extractedData.country || 'United States'
      };

      // Validate and clean products
      const cleanedProducts = extractedData.products.map((product: any) => ({
        product_description: product.product_description || 'Receipt Item',
        brand_name: product.brand_name || 'Unknown Brand',
        model_number: product.model_number || null,
        amount: typeof product.amount === 'number' ? product.amount : null,
        warranty_period: product.warranty_period || '1 year' // Each product must have its own warranty
      }));

      // Ensure date is in correct format
      if (baseData.purchase_date && !baseData.purchase_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(baseData.purchase_date);
        if (!isNaN(date.getTime())) {
          baseData.purchase_date = date.toISOString().split('T')[0];
        } else {
          baseData.purchase_date = new Date().toISOString().split('T')[0];
        }
      }

      const cleanedData = {
        ...baseData,
        products: cleanedProducts
      };

      console.log('GPT extraction successful (multi-product):', cleanedData);
      return { data: cleanedData, error: null };
    } else {
      // Handle single-product receipt (existing logic)
      const cleanedData = {
        product_description: extractedData.product_description || 'Receipt Item',
        brand_name: extractedData.brand_name || 'Unknown Brand',
        store_name: extractedData.store_name || null,
        purchase_location: extractedData.purchase_location || null,
        purchase_date: extractedData.purchase_date || new Date().toISOString().split('T')[0],
        amount: extractedData.amount && typeof extractedData.amount === 'number' ? extractedData.amount : null,
        warranty_period: extractedData.warranty_period || '1 year',
        extended_warranty: extractedData.extended_warranty || null,
        model_number: extractedData.model_number || null,
        country: extractedData.country || 'United States'
      };

      // Ensure amount is a number or null
      if (cleanedData.amount && typeof cleanedData.amount === 'string') {
        const numericAmount = parseFloat(cleanedData.amount.replace(/[^0-9.]/g, ''));
        cleanedData.amount = isNaN(numericAmount) ? null : numericAmount;
      }

      // Ensure date is in correct format
      if (cleanedData.purchase_date && !cleanedData.purchase_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(cleanedData.purchase_date);
        if (!isNaN(date.getTime())) {
          cleanedData.purchase_date = date.toISOString().split('T')[0];
        } else {
          cleanedData.purchase_date = new Date().toISOString().split('T')[0];
        }
      }

      console.log('GPT extraction successful (single-product):', cleanedData);
      return { data: cleanedData, error: null };
    }

  } catch (error: any) {
    console.error('GPT extraction error:', error);
    return { 
      data: null, 
      error: { message: error.message || 'Failed to extract data with GPT' } 
    };
  }
}

// Notification Types
export type NotificationType = 'warranty_alert' | 'new_receipt' | 'system' | 'other';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  created_at: string;
  read: boolean;
  archived: boolean;
}

// Create a new notification
export const createNotification = async (
  userId: string,
  type: NotificationType,
  message: string
): Promise<{ data: Notification[] | null; error: any }> => {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{ user_id: userId, type, message }])
    .select();
  return { data, error };
};

// Fetch notifications for a user (unarchived, newest first)
export const getUserNotifications = async (
  userId: string
): Promise<{ data: Notification[] | null; error: any }> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('created_at', { ascending: false });
  return { data, error };
};

// Mark a notification as read and archive it
export const archiveNotification = async (
  notificationId: string
): Promise<{ data: Notification[] | null; error: any }> => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true, archived: true })
    .eq('id', notificationId)
    .select();
  return { data, error };
};

// Mark all notifications as read and archive for a user
export const archiveAllNotifications = async (
  userId: string
): Promise<{ data: Notification[] | null; error: any }> => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true, archived: true })
    .eq('user_id', userId)
    .eq('archived', false)
    .select();
  return { data, error };
};

// Check if a notification was previously dismissed for a specific item
export const wasNotificationDismissed = async (
  userId: string,
  itemName: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'warranty_alert')
    .eq('archived', true)
    .ilike('message', `%${itemName}%`);
  
  if (error) {
    console.error('Error checking dismissed notifications:', error);
    return false;
  }
  
  return (data || []).length > 0;
};

// Clean up duplicate notifications for a user
export const cleanupDuplicateNotifications = async (userId: string): Promise<void> => {
  try {
    // Get all warranty notifications for the user
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'warranty_alert')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications for cleanup:', error);
      return;
    }

    if (!notifications || notifications.length === 0) return;

    // Group notifications by item name
    const notificationGroups: { [key: string]: any[] } = {};
    
    notifications.forEach(notification => {
      const match = notification.message.match(/Warranty for (.+?) expires in/);
      const itemName = match ? match[1] : notification.message;
      
      if (!notificationGroups[itemName]) {
        notificationGroups[itemName] = [];
      }
      notificationGroups[itemName].push(notification);
    });

    // For each group, keep only the most recent notification and delete the rest
    for (const [itemName, group] of Object.entries(notificationGroups)) {
      if (group.length > 1) {
        // Sort by creation date (newest first)
        group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        // Keep the first (most recent) and delete the rest
        const duplicateIds = group.slice(1).map(n => n.id);
        
        if (duplicateIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('notifications')
            .delete()
            .in('id', duplicateIds);
          
          if (deleteError) {
            console.error(`Error deleting duplicate notifications for ${itemName}:`, deleteError);
          } else {
            console.log(`Cleaned up ${duplicateIds.length} duplicate notifications for ${itemName}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in cleanupDuplicateNotifications:', error);
  }
};