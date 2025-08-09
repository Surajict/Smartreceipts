import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, X, Loader2 } from 'lucide-react';
import { getUserNotifications, archiveNotification, archiveAllNotifications, cleanupDuplicateNotifications, Notification } from '../lib/supabase';

interface NotificationDropdownProps {
  userId: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivingAll, setArchivingAll] = useState(false);

  useEffect(() => {
    if (userId) loadNotifications();
    // eslint-disable-next-line
  }, [userId]);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getUserNotifications(userId);
      if (error) {
        setError('Failed to load notifications');
      } else {
        await cleanupDuplicateNotifications(userId);
        setNotifications(removeDuplicateNotifications(data || []));
      }
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const removeDuplicateNotifications = (notifications: Notification[]): Notification[] => {
    const seen = new Set<string>();
    const filtered: Notification[] = [];
    const sorted = [...notifications].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    for (const notification of sorted) {
      if (notification.type === 'warranty_alert') {
        const match = notification.message.match(/Warranty for (.+?) expires in/);
        const itemName = match ? match[1] : notification.message;
        if (!seen.has(itemName)) {
          seen.add(itemName);
          filtered.push(notification);
        }
      } else {
        filtered.push(notification);
      }
    }
    return filtered;
  };

  const handleArchiveNotification = async (id: string) => {
    try {
      // Immediately update local state to hide the notification
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Then update the database
      await archiveNotification(id);
      
      // Optionally reload to ensure consistency (but notification already removed from UI)
      const { data } = await getUserNotifications(userId);
      if (data) {
        const cleanedNotifications = removeDuplicateNotifications(data);
        setNotifications(cleanedNotifications);
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
      // On error, reload notifications to restore the correct state
      loadNotifications();
    }
  };

  const handleArchiveAll = async () => {
    try {
      setArchivingAll(true);
      
      // Immediately clear local state
      setNotifications([]);
      
      // Then update the database
      await archiveAllNotifications(userId);
      
      // Reload to ensure consistency
      const { data } = await getUserNotifications(userId);
      if (data) {
        const cleanedNotifications = removeDuplicateNotifications(data);
        setNotifications(cleanedNotifications);
      }
    } catch (error) {
      console.error('Error archiving all notifications:', error);
      // On error, reload notifications to restore the correct state
      loadNotifications();
    } finally {
      setArchivingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-accent-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </button>
      {showDropdown && (

        <div className="mobile-dropdown-fix fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 left-2 sm:left-auto sm:w-72 md:w-80 lg:w-96 bg-white rounded-lg shadow-card border border-gray-200 py-2 z-50 max-w-none sm:max-w-[calc(100vw-1rem)]">
          <div className="px-3 sm:px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-text-primary text-sm sm:text-base">Notifications</h3>

            {notifications.length > 0 && (
              <button
                onClick={handleArchiveAll}
                disabled={archivingAll}
                className="text-xs text-primary hover:underline disabled:opacity-50 flex-shrink-0"
              >
                {archivingAll ? 'Clearing...' : 'Clear All'}
              </button>
            )}
          </div>

          <div className="max-h-48 xs:max-h-56 sm:max-h-80 overflow-y-auto">

            {loading ? (
              <div className="px-3 sm:px-4 py-6 sm:py-8 text-center text-text-secondary">
                <div className="text-sm">Loading...</div>
              </div>
            ) : error ? (
              <div className="px-3 sm:px-4 py-6 sm:py-8 text-center text-red-500">
                <div className="text-sm">{error}</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-3 sm:px-4 py-6 sm:py-8 text-center">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-text-secondary">No notifications at this time</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start justify-between min-w-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-xs sm:text-sm font-medium text-text-primary mb-1 break-words">{n.message}</div>
                    <div className="text-xs text-text-secondary">
                      {n.type.replace('_', ' ')} • {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleArchiveNotification(n.id)}
                    className="text-xs text-primary hover:underline flex-shrink-0"
                  >
                    Clear
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default NotificationDropdown; 