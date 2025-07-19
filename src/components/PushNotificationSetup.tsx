import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, Check, X } from 'lucide-react';
import { pushNotificationManager } from '../utils/pushNotifications';
import { useUser } from '../contexts/UserContext';

interface PushNotificationSetupProps {
  onSetupComplete?: (enabled: boolean) => void;
}

const PushNotificationSetup: React.FC<PushNotificationSetupProps> = ({ onSetupComplete }) => {
  const { user } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) {
      console.log('PushNotificationSetup: No user found');
      setIsInitializing(false);
      return;
    }
    
    console.log('PushNotificationSetup: Checking subscription status for user:', user.id);
    setIsInitializing(true);
    
    try {
      // Add timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Subscription check timeout')), 8000);
      });

      const subscribed = await Promise.race([
        pushNotificationManager.isSubscribed(),
        timeoutPromise
      ]);

      console.log('PushNotificationSetup: User is subscribed:', subscribed);
      setIsSubscribed(subscribed);
      
      // Always show setup for testing - we'll show different UI based on subscription status
      setShowSetup(true);
      
    } catch (error) {
      console.error('PushNotificationSetup: Error checking subscription status:', error);
      // Show setup even on error so user can try to enable
      setIsSubscribed(false); // Assume not subscribed on error
      setShowSetup(true);
      
      // Set a user-friendly error message
      if (error instanceof Error && error.message.includes('timeout')) {
        setError('Unable to check notification status. You can still try to enable notifications.');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('PushNotificationSetup: Starting notification enable process...');
      
      // First check if notifications are supported at all
      if (!('Notification' in window)) {
        setError('This browser does not support notifications.');
        setIsLoading(false);
        return;
      }

      // Request permission first
      console.log('PushNotificationSetup: Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('PushNotificationSetup: Permission result:', permission);
      
      if (permission !== 'granted') {
        setError('Notification permission denied. Please enable notifications in your browser settings.');
        setIsLoading(false);
        return;
      }

      // Try to subscribe, but don't fail if service worker has issues
      try {
        console.log('PushNotificationSetup: Attempting to subscribe to push notifications...');
        
        // Add timeout to push subscription attempt
        const subscriptionPromise = pushNotificationManager.subscribeUser();
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Push subscription timeout')), 10000);
        });
        
        const subscription = await Promise.race([subscriptionPromise, timeoutPromise]);
        
        if (subscription) {
          console.log('PushNotificationSetup: Successfully subscribed to push notifications');
          setIsSubscribed(true);
          setShowSetup(false);
          onSetupComplete?.(true);
          
          // Send a test notification
          await sendTestNotification();
        } else {
          console.log('PushNotificationSetup: Push subscription failed, but basic notifications should work');
          // Even if push subscription fails, we can still show browser notifications
          setIsSubscribed(true);
          setError('Push notifications partially enabled. Browser notifications will work, but background notifications may not.');
          
          // Send a basic browser notification as test
          new Notification('Smart Receipts Test', {
            body: 'Basic browser notifications are working! (Background push may not work)',
            icon: '/Smart Receipt Logo.png'
          });
        }
      } catch (pushError) {
        console.error('PushNotificationSetup: Push subscription failed:', pushError);
        
        // Fall back to basic browser notifications
        setIsSubscribed(true);
        setError('Using basic browser notifications. Background push notifications are not available.');
        
        // Test basic notification
        new Notification('Smart Receipts', {
          body: 'Basic notifications enabled! You\'ll get alerts when the app is open.',
          icon: '/Smart Receipt Logo.png'
        });
      }
      
    } catch (error) {
      console.error('PushNotificationSetup: Error enabling notifications:', error);
      setError('Failed to enable notifications. Please try again or check your browser settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const unsubscribed = await pushNotificationManager.unsubscribe();
      
      if (unsubscribed) {
        setIsSubscribed(false);
        onSetupComplete?.(false);
      }
    } catch (error) {
      console.error('Error disabling notifications:', error);
      setError('Failed to disable notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!user) return;
    
    try {
      // This would call your Supabase Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          title: 'Smart Receipts Test',
          body: 'This is a test notification to verify Android push notifications are working!',
          data: { type: 'test', url: '/' }
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to send test notification:', await response.text());
      } else {
        console.log('Test notification sent successfully!');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const sendWarrantyTestNotification = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          title: 'Warranty Alert - Smart Receipts',
          body: 'Test: Warranty for iPhone 15 Pro expires in 7 days.',
          data: { 
            type: 'warranty_alert', 
            receiptId: 'test-receipt-123',
            url: '/warranty'
          }
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to send warranty test notification:', await response.text());
      } else {
        console.log('Warranty test notification sent successfully!');
      }
    } catch (error) {
      console.error('Error sending warranty test notification:', error);
    }
  };

  if (!showSetup && isSubscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            <span>Push notifications enabled</span>
          </div>
          <button
            onClick={handleDisableNotifications}
            disabled={isLoading}
            className="text-gray-500 hover:text-red-600"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
          </button>
        </div>
        
        {/* Test notification buttons */}
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-sm text-green-700 mb-2">Test Android Notifications:</p>
          <div className="flex space-x-2">
            <button
              onClick={sendTestNotification}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
            >
              <Bell className="h-3 w-3" />
              <span>Send Test</span>
            </button>
            <button
              onClick={sendWarrantyTestNotification}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
            >
              <Bell className="h-3 w-3" />
              <span>Test Warranty Alert</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show setup if user exists but not subscribed, or if there's an error
  if (!user) return null;

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
            <span className="text-gray-600">Checking notification settings...</span>
          </div>
          <button
            onClick={() => {
              console.log('PushNotificationSetup: Manual bypass triggered');
              setIsInitializing(false);
              setIsSubscribed(false);
              setShowSetup(true);
              setError('Bypassed automatic check - you can manually enable notifications.');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Skip Check
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-blue-900 mb-1">
            Enable Android Notifications
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            Get warranty alerts directly in your Android notification center, even when the app is closed.
          </p>
          
          {/* Debug info */}
          <div className="text-xs text-gray-500 mb-2">
            Status: {isSubscribed ? 'Subscribed' : 'Not subscribed'} | User: {user.id.slice(0, 8)}...
          </div>
          
          {error && (
            <div className="flex items-center space-x-2 text-sm text-red-600 mb-3">
              <X className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              <span>{isLoading ? 'Setting up...' : 'Enable Notifications'}</span>
            </button>
            
            {/* Stop button when loading */}
            {isLoading && (
              <button
                onClick={() => {
                  console.log('PushNotificationSetup: User stopped setup process');
                  setIsLoading(false);
                  setIsSubscribed(true);
                  setError('Setup stopped. Using basic browser notifications.');
                  
                  // Test basic notification
                  new Notification('Smart Receipts', {
                    body: 'Basic notifications are working! Setup was manually stopped.',
                    icon: '/Smart Receipt Logo.png'
                  });
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Stop & Use Basic</span>
              </button>
            )}
            
            {/* Simple test button that works without service workers */}
            {!isLoading && (
              <button
                onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        new Notification('Smart Receipts Test', {
                          body: 'This is a simple browser notification test!',
                          icon: '/Smart Receipt Logo.png'
                        });
                      }
                    });
                  } else {
                    alert('Notifications not supported in this browser');
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span>Quick Test</span>
              </button>
            )}
            
            <button
              onClick={() => setShowSetup(false)}
              className="text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationSetup; 