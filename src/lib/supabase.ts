import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://napulczxrrnsjtmaixzp.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'PLACEHOLDER_ANON_KEY'

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  console.warn('Supabase environment variables not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Receipt-specific database functions
export const saveReceiptToDatabase = async (receiptData: any, userId: string) => {
  try {
    console.log('Saving receipt to database for user:', userId);
    console.log('Receipt data:', receiptData);

    // Validate required fields
    if (!receiptData.product_description?.trim()) {
      throw new Error('Product description is required');
    }
    if (!receiptData.brand_name?.trim()) {
      throw new Error('Brand name is required');
    }
    if (!receiptData.purchase_date) {
      throw new Error('Purchase date is required');
    }
    if (!receiptData.warranty_period?.trim()) {
      throw new Error('Warranty period is required');
    }
    if (!receiptData.country?.trim()) {
      throw new Error('Country is required');
    }

    // Prepare the data for insertion
    const insertData = {
      user_id: userId,
      product_description: receiptData.product_description.trim(),
      brand_name: receiptData.brand_name.trim(),
      store_name: receiptData.store_name?.trim() || null,
      purchase_location: receiptData.purchase_location?.trim() || null,
      purchase_date: receiptData.purchase_date,
      amount: receiptData.amount && receiptData.amount > 0 ? receiptData.amount : null,
      warranty_period: receiptData.warranty_period.trim(),
      extended_warranty: receiptData.extended_warranty?.trim() || null,
      model_number: receiptData.model_number?.trim() || null,
      country: receiptData.country.trim(),
      image_url: receiptData.image_url || null,
      image_path: receiptData.image_url || null, // For backward compatibility
      processing_method: receiptData.processing_method || 'manual',
      ocr_confidence: receiptData.ocr_confidence || null,
      extracted_text: receiptData.extracted_text || null,
      ocr_engine: receiptData.ocr_engine || null
    };

    console.log('Prepared insert data:', insertData);

    // Insert the receipt
    const { data, error } = await supabase
      .from('receipts')
      .insert([insertData])
      .select();

    if (error) {
      console.error('Database insert error:', error);
      throw new Error(`Failed to save receipt: ${error.message}`);
    }

    console.log('Receipt saved successfully:', data);
    return { data, error: null };

  } catch (err: any) {
    console.error('Save receipt error:', err);
    return { 
      data: null, 
      error: { message: err.message || 'Failed to save receipt' } 
    };
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipt-images')
      .getPublicUrl(fileName);

    console.log('Image URL:', urlData.publicUrl);

    return { 
      data: { 
        path: fileName, 
        url: urlData.publicUrl 
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

export const deleteReceipt = async (userId: string, receiptId: string) => {
  try {
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
          // Don't fail the entire operation if image deletion fails
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
      if (cleanedData[key] === undefined) {
        delete cleanedData[key];
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
    if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
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

// GPT-powered receipt data extraction
export const extractReceiptDataWithGPT = async (extractedText: string) => {
  try {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment variables.');
      throw new Error('OpenAI API key not configured. Please check your environment variables.');
    }

    console.log('Extracting receipt data with GPT...');

    const prompt = `You are an AI assistant that extracts structured data from retail receipts.
Given raw text from a receipt, analyze and return a list of each item in the following JSON format.

For SINGLE ITEM receipts, return the main product information.
For MULTIPLE ITEM receipts, extract all individual products.

Return ONLY valid JSON in this format:
{
  "product_description": "string - main product name",
  "brand_name": "string - brand name",
  "model_number": "string - model/SKU or null",
  "store_name": "string - store name or null",
  "purchase_location": "string - store address or null",
  "purchase_date": "string - date in YYYY-MM-DD format",
  "amount": "number - price or null",
  "warranty_period": "string - warranty period like '1 year' or '24 months'",
  "extended_warranty": "string - extended warranty or null",
  "country": "string - country or 'United States'"
}

Extract the main product from the receipt. If multiple products exist, focus on the primary/most expensive item.

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
            content: 'You are a precise data extraction assistant specialized in retail receipts. Extract structured data from receipts and return only valid JSON. Focus on the main product information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
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
    
    // Clean and validate the extracted data
    const cleanedData = {
      product_description: extractedData.product_description || 'Unknown Product',
      brand_name: extractedData.brand_name || 'Unknown Brand',
      model_number: extractedData.model_number || null,
      store_name: extractedData.store_name || null,
      purchase_location: extractedData.purchase_location || null,
      purchase_date: extractedData.purchase_date || new Date().toISOString().split('T')[0],
      amount: typeof extractedData.amount === 'number' ? extractedData.amount : null,
      warranty_period: extractedData.warranty_period || '1 year',
      extended_warranty: extractedData.extended_warranty || null,
      country: extractedData.country || 'United States'
    };
    
    // Ensure date is in correct format
    if (cleanedData.purchase_date && !cleanedData.purchase_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(cleanedData.purchase_date);
      if (!isNaN(date.getTime())) {
        cleanedData.purchase_date = date.toISOString().split('T')[0];
      } else {
        cleanedData.purchase_date = new Date().toISOString().split('T')[0];
      }
    }
    
    console.log('GPT extraction successful:', {
      product: cleanedData.product_description,
      brand: cleanedData.brand_name,
      store: cleanedData.store_name
    });
    
    return cleanedData;

  } catch (error: any) {
    console.error('GPT extraction error:', error);
    throw new Error(error.message || 'Failed to extract data with GPT');
  }
}