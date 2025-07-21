// Web Push Notifications utility for Android OS-level notifications
export class PushNotificationManager {
  private vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  // Request notification permission from user
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('This browser does not support service workers');
      return false;
    }

    if (!('PushManager' in window)) {
      console.warn('This browser does not support push messaging');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Subscribe user to push notifications
  async subscribeUser(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Send subscription to your backend
      await this.sendSubscriptionToBackend(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe user:', error);
      return null;
    }
  }

  // Send subscription to Supabase backend
  private async sendSubscriptionToBackend(subscription: PushSubscription) {
    const { supabase } = await import('../lib/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        subscription: subscription.toJSON(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
  }

  // Convert VAPID key to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if user is already subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      console.log('PushNotificationManager: Checking if subscribed...');
      
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.log('PushNotificationManager: Service workers not supported');
        return false;
      }

      if (!('PushManager' in window)) {
        console.log('PushNotificationManager: Push messaging not supported');
        return false;
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Service worker timeout')), 5000);
      });

      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        timeoutPromise
      ]);

      console.log('PushNotificationManager: Service worker ready');
      
      const subscription = await registration.pushManager.getSubscription();
      const isSubscribed = subscription !== null;
      
      console.log('PushNotificationManager: Subscription status:', isSubscribed);
      return isSubscribed;
      
    } catch (error) {
      console.error('PushNotificationManager: Error checking subscription:', error);
      return false;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        // Remove from backend
        await this.removeSubscriptionFromBackend();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  private async removeSubscriptionFromBackend() {
    const { supabase } = await import('../lib/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);
  }
}

export const pushNotificationManager = new PushNotificationManager(); 