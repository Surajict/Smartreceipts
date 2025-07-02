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
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: undefined // Disable email confirmation for now
      }
    })
    
    if (error) {
      console.error('SignUp error:', error)
      return { data: null, error }
    }

    console.log('Signup successful, user created:', data.user?.id)

    // Initialize user settings after successful signup
    if (data.user && data.user.id) {
      try {
        console.log('Initializing user settings for:', data.user.id)
        
        // Wait a moment for the user to be fully created
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Initialize notification settings
        const { error: notifError } = await supabase
          .from('user_notification_settings')
          .upsert({
            user_id: data.user.id,
            warranty_alerts: true,
            auto_system_update: true,
            marketing_notifications: false
          }, {
            onConflict: 'user_id'
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
            user_id: data.user.id,
            data_collection: true,
            data_analysis: 'allowed',
            biometric_login: false,
            two_factor_auth: false
          }, {
            onConflict: 'user_id'
          })

        if (privacyError) {
          console.warn('Failed to initialize privacy settings:', privacyError)
        } else {
          console.log('Privacy settings initialized successfully')
        }
        
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
    
    // Only log actual errors, not when user is simply not authenticated
    if (error && error.message !== 'Auth session missing!') {
      console.error('Get user error:', error)
    }
    
    // Return null for both error cases and when user is not authenticated
    if (error) {
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
    
    // Only log actual errors, not when session is missing
    if (error && error.message !== 'Auth session missing!') {
      console.error('Get session error:', error)
    }
    
    if (error) {
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
          onConflict: 'user_id'
        })

      if (notifError) {
        console.error('Failed to initialize notification settings:', notifError)
      } else {
        console.log('Notification settings initialized')
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
          onConflict: 'user_id'
        })

      if (privacyError) {
        console.error('Failed to initialize privacy settings:', privacyError)
      } else {
        console.log('Privacy settings initialized')
      }
    }

    return true
  } catch (error) {
    console.error('Error initializing user settings:', error)
    return false
  }
}