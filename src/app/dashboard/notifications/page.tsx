'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  merchant?: string;
  amount?: number;
  dueDate?: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionText?: string;
}

export default function NotificationsPage() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Load read/dismissed state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const read = localStorage.getItem('readNotifications');
      const dismissed = localStorage.getItem('dismissedNotifications');
      if (read) setReadNotifications(new Set(JSON.parse(read)));
      if (dismissed) setDismissedNotifications(new Set(JSON.parse(dismissed)));
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user, readNotifications, dismissedNotifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      const data = await response.json();
      // Filter out dismissed notifications and mark read ones
      const filtered = data.notifications
        .filter((n: Notification) => !dismissedNotifications.has(n.id))
        .map((n: Notification) => ({
          ...n,
          isRead: readNotifications.has(n.id) || n.isRead
        }));
      setNotifications(filtered);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const newRead = new Set(readNotifications);
    newRead.add(id);
    setReadNotifications(newRead);
    localStorage.setItem('readNotifications', JSON.stringify(Array.from(newRead)));
    
    // Update local state
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );

    // Call API (for future database storage)
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' }),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = async (id: string) => {
    const newDismissed = new Set(dismissedNotifications);
    newDismissed.add(id);
    setDismissedNotifications(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify(Array.from(newDismissed)));
    
    // Remove from local state
    setNotifications(prev => prev.filter(n => n.id !== id));

    // Call API (for future database storage)
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'renewal_reminder':
        return '⏰';
      case 'price_increase':
        return '📈';
      case 'spending_limit':
        return '💰';
      case 'duplicate_detection':
        return '🔍';
      case 'savings_opportunity':
        return '💡';
      default:
        return '🔔';
    }
  };

  if (!user?.id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 mt-1">Please log in to view your notifications</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 mt-1">Loading your notifications...</p>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 mt-1">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up! No new notifications'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => {
              notifications.forEach(n => {
                if (!n.isRead) markAsRead(n.id);
              });
            }}
            className="px-4 py-2 bg-[#ff8b3d] text-white rounded-lg hover:bg-[#ffa056] transition-colors text-sm font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Notifications</h3>
          <p className="text-gray-600">
            You're all caught up! We'll notify you about subscription renewals, price changes, and other important updates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow-sm border ${
                notification.isRead 
                  ? 'border-gray-200' 
                  : 'border-[#ff8b3d] border-l-4'
              } p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl flex-shrink-0">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="h-2 w-2 bg-[#ff8b3d] rounded-full"></span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{notification.message}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(notification.severity)}`}>
                          {notification.severity}
                        </span>
                        {notification.amount && (
                          <span className="text-sm font-semibold text-gray-700">
                            ${Math.abs(notification.amount).toFixed(2)}
                          </span>
                        )}
                        {notification.dueDate && (
                          <span className="text-sm text-gray-500">
                            Due: {new Date(notification.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      {notification.actionUrl && notification.actionText && (
                        <a
                          href={notification.actionUrl}
                          className="inline-block mt-3 text-sm text-[#ff8b3d] hover:text-[#ffa056] font-medium"
                        >
                          {notification.actionText} →
                        </a>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Dismiss notification"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

