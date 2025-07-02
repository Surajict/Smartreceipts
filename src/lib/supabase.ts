import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helper functions
export const signUp = async (email: string, password: string, fullName: string) => {
  try {
    console.log('Starting signup process for:', email)
    
    // First, check if user already exists
    const { data: existingUser } = await supabase.auth.getUser()
    if (existingUser?.user?.email === email) {
      return { 
        data: null, 
        error: { message: 'This email is already registered. Try signing in instead.' } 
      }
    }
    
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
      if (error.message.includes('User already registered')) {
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
      
      return { data: null, error }
    }

    if (data.user) {
      console.log('Signup successful, user created:', data.user.id)
      
      // Wait a moment for triggers to complete
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
        } else if (profile) {
          console.log('User profile created successfully')
        }
      } catch (profileErr) {
        console.warn('Profile verification error:', profileErr)
      }
      
      // Initialize user settings
      try {
        await initializeUserSettings(data.user.id)
      } catch (settingsError) {
        console.warn('Failed to initialize user settings:', settingsError)
        // Don't fail the signup if settings initialization fails
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

export const signIn = async (email: string, password: string) => {
  try {
    console.log('Attempting to sign in user:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      console.error('SignIn error:', error)
    } else {
      console.log('SignIn successful for:', email)
    }
    
    return { data, error }
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
    
    // Initialize notification settings
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

    // Initialize privacy settings
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

    return true
  } catch (error) {
    console.error('Error initializing user settings:', error)
    return false
  }
}