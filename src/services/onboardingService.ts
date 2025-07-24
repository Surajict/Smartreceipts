import { supabase } from '../lib/supabase';

export interface OnboardingProgress {
  user_id: string;
  completed_items: string[];
  tour_completed: boolean;
  onboarding_completed: boolean;
  first_login: boolean;
  last_updated: string;
}

class OnboardingService {
  // Check if user is first-time (no onboarding record exists)
  async isFirstTimeUser(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No record found, user is first-time
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking first-time user:', error);
      return true; // Assume first-time if error
    }
  }

  // Initialize onboarding for new user
  async initializeOnboarding(userId: string): Promise<OnboardingProgress> {
    const initialProgress: Partial<OnboardingProgress> = {
      user_id: userId,
      completed_items: [],
      tour_completed: false,
      onboarding_completed: false,
      first_login: true,
      last_updated: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .insert(initialProgress)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error initializing onboarding:', error);
      // Return default progress if database fails
      return {
        user_id: userId,
        completed_items: [],
        tour_completed: false,
        onboarding_completed: false,
        first_login: true,
        last_updated: new Date().toISOString()
      };
    }
  }

  // Get user's onboarding progress
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No record found, initialize onboarding
        return await this.initializeOnboarding(userId);
      }

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      return null;
    }
  }

  // Mark a checklist item as completed
  async completeChecklistItem(userId: string, itemId: string): Promise<void> {
    try {
      const progress = await this.getOnboardingProgress(userId);
      
      if (!progress) {
        console.error('No onboarding progress found for user');
        return;
      }

      // Add item to completed list if not already there
      const updatedItems = progress.completed_items.includes(itemId)
        ? progress.completed_items
        : [...progress.completed_items, itemId];

      // Check if all required items are completed
      const requiredItems = ['take-tour', 'scan-first-receipt', 'try-smart-search', 'check-warranty', 'complete-profile'];
      const allCompleted = requiredItems.every(item => updatedItems.includes(item));

      const { error } = await supabase
        .from('onboarding_progress')
        .update({
          completed_items: updatedItems,
          onboarding_completed: allCompleted,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error completing checklist item:', error);
    }
  }

  // Mark tour as completed
  async completeTour(userId: string): Promise<void> {
    try {
      // Also mark the 'take-tour' checklist item as completed
      await this.completeChecklistItem(userId, 'take-tour');

      const { error } = await supabase
        .from('onboarding_progress')
        .update({
          tour_completed: true,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error completing tour:', error);
    }
  }

  // Skip tour (but don't mark as completed)
  async skipTour(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .update({
          tour_completed: true, // Still mark as completed since they chose to skip
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error skipping tour:', error);
    }
  }

  // Complete entire onboarding process
  async completeOnboarding(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .update({
          onboarding_completed: true,
          first_login: false,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  // Reset onboarding (for testing purposes)
  async resetOnboarding(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('onboarding_progress')
        .update({
          completed_items: [],
          tour_completed: false,
          onboarding_completed: false,
          first_login: true,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }

  // Check if user should see onboarding elements
  async shouldShowOnboarding(userId: string): Promise<boolean> {
    const progress = await this.getOnboardingProgress(userId);
    return progress ? !progress.onboarding_completed : true;
  }

  // Check if user should see tour
  async shouldShowTour(userId: string): Promise<boolean> {
    const progress = await this.getOnboardingProgress(userId);
    return progress ? progress.first_login && !progress.tour_completed : true;
  }

  // Auto-detect completed items based on user activity
  async autoDetectProgress(userId: string): Promise<void> {
    try {
      // Check if user has scanned any receipts
      const { data: receipts } = await supabase
        .from('receipts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (receipts && receipts.length > 0) {
        await this.completeChecklistItem(userId, 'scan-first-receipt');
      }

      // Check if user has tried smart search (this would be tracked elsewhere)
      // Check if user has profile information
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.user_metadata?.full_name) {
        await this.completeChecklistItem(userId, 'complete-profile');
      }

      // Check if user has checked warranties
      const { data: warranties } = await supabase
        .from('receipts')
        .select('id')
        .eq('user_id', userId)
        .not('warranty_period', 'is', null)
        .limit(1);

      if (warranties && warranties.length > 0) {
        await this.completeChecklistItem(userId, 'check-warranty');
      }

    } catch (error) {
      console.error('Error auto-detecting progress:', error);
    }
  }
}

export default new OnboardingService(); 