/**
 * Notifications Widget
 * 
 * Shows the latest notifications for the current user
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle, Clock, AlertCircle, ShoppingCart, ClipboardList, Package, MessageSquare, Settings, X } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import type { DashboardWidgetProps } from './types';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useWebAuth } from '../../contexts/WebAuthContext';
import { NotificationService } from '../../shared/services/notificationService';
import type { AppNotification, NotificationType } from '../../shared/types/notification';

interface NotificationsWidgetProps extends DashboardWidgetProps {
  userId?: string;
}

const MAX_NOTIFICATIONS = 10;

// Icon mapping for notification types
const getNotificationIcon = (type: NotificationType) => {
  if (type.startsWith('task_')) return <ClipboardList className="w-4 h-4" />;
  if (type.startsWith('shopping_')) return <ShoppingCart className="w-4 h-4" />;
  if (type.startsWith('subscription_')) return <Settings className="w-4 h-4" />;
  if (type === 'comment') return <MessageSquare className="w-4 h-4" />;
  if (type === 'prop_change_request') return <Package className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
};

// Color mapping for notification types
const getNotificationColor = (type: NotificationType, read: boolean) => {
  if (read) return 'text-pb-gray';
  
  if (type.includes('urgent') || type.includes('expired') || type.includes('failed')) {
    return 'text-red-400';
  }
  if (type.includes('due_today') || type.includes('expiring_today')) {
    return 'text-orange-400';
  }
  if (type.includes('due_soon') || type.includes('expiring_soon')) {
    return 'text-yellow-400';
  }
  return 'text-pb-primary';
};

// Format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Get link for notification entity
const getNotificationLink = (notification: AppNotification): string => {
  if (notification.entity) {
    switch (notification.entity.kind) {
      case 'task':
        return `/boards?cardId=${notification.entity.id}`;
      case 'prop':
        return `/props/${notification.entity.id}`;
      case 'container':
        return `/containers/${notification.entity.id}`;
      case 'packList':
        return `/packing-lists/${notification.entity.id}`;
      case 'shopping_item':
        return `/shopping?itemId=${notification.entity.id}`;
      default:
        return '#';
    }
  }
  return '#';
};

export const NotificationsWidget: React.FC<NotificationsWidgetProps> = ({
  userId,
}) => {
  const { service } = useFirebase();
  const { user } = useWebAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set());

  const effectiveUserId = userId || user?.uid;

  // Load notifications
  useEffect(() => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    const notificationService = new NotificationService(service);
    let mounted = true;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        setError(null);
        const all = await notificationService.listForUser(effectiveUserId, { 
          max: MAX_NOTIFICATIONS 
        });
        
        if (!mounted) return;
        
        // Convert createdAt timestamps to Date objects if they're not already
        const processed = all.map(n => {
          let createdAt: Date;
          if (n.createdAt instanceof Date) {
            createdAt = n.createdAt;
          } else if (n.createdAt && typeof (n.createdAt as any).toDate === 'function') {
            // Firestore Timestamp
            createdAt = (n.createdAt as any).toDate();
          } else {
            // String or number timestamp
            createdAt = new Date(n.createdAt as any);
          }
          return {
            ...n,
            createdAt
          };
        });
        
        setNotifications(processed);
      } catch (err: any) {
        if (!mounted) return;
        console.error('Error loading notifications:', err);
        
        // Check if this is an index building error
        if (err.code === 'failed-precondition' || 
            err.message?.includes('index') || 
            err.message?.includes('building')) {
          setError('Notifications index is being set up. This may take a few minutes. Please refresh the page in a moment.');
        } else {
          setError(err.message || 'Failed to load notifications');
        }
        setNotifications([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [service, effectiveUserId]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    if (markingRead.has(notificationId)) return;

    setMarkingRead(prev => new Set(prev).add(notificationId));
    
    try {
      const notificationService = new NotificationService(service);
      await notificationService.markRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    } finally {
      setMarkingRead(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  // Group notifications by read status
  const groupedNotifications = useMemo(() => {
    const unread = notifications.filter(n => !n.read);
    const read = notifications.filter(n => n.read);
    return { unread, read };
  }, [notifications]);

  const unreadCount = groupedNotifications.unread.length;
  const totalCount = notifications.length;

  if (loading && notifications.length === 0) {
    return (
      <WidgetContainer
        widgetId="notifications"
        title="Notifications"
        loading={true}
      >
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pb-primary mx-auto"></div>
          <p className="text-pb-gray text-sm mt-2">Loading notifications...</p>
        </div>
      </WidgetContainer>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <WidgetContainer
        widgetId="notifications"
        title="Notifications"
        error={error}
      >
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3 opacity-50" />
          <p className="text-pb-gray text-sm px-4">{error}</p>
          {error.includes('index') && (
            <p className="text-pb-gray text-xs mt-2 px-4 opacity-75">
              The notifications system is being set up. This usually takes 2-5 minutes.
            </p>
          )}
        </div>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer
      widgetId="notifications"
      title={
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      }
      loading={false}
    >
      {totalCount === 0 ? (
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
          <p className="text-pb-gray text-sm">No notifications</p>
          <p className="text-pb-gray text-xs mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Unread notifications */}
          {groupedNotifications.unread.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-pb-primary mb-2 uppercase tracking-wide">
                Unread ({groupedNotifications.unread.length})
              </h4>
              <div className="space-y-1">
                {groupedNotifications.unread.map((notification) => {
                  const link = getNotificationLink(notification);
                  const icon = getNotificationIcon(notification.type);
                  const color = getNotificationColor(notification.type, false);
                  
                  return (
                    <div
                      key={notification.id}
                      className="group relative p-3 rounded-lg bg-pb-primary/10 border border-pb-primary/20 hover:bg-pb-primary/20 transition-colors"
                    >
                      <Link
                        to={link}
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="block"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 mt-0.5 ${color}`}>
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${color} line-clamp-2`}>
                                {notification.title}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-pb-primary/20 rounded"
                                aria-label="Mark as read"
                                disabled={markingRead.has(notification.id)}
                              >
                                <CheckCircle className="w-4 h-4 text-pb-gray hover:text-green-400" />
                              </button>
                            </div>
                            {notification.message && (
                              <p className="text-xs text-pb-gray mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-pb-gray" />
                              <span className="text-[10px] text-pb-gray">
                                {formatRelativeTime(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Read notifications */}
          {groupedNotifications.read.length > 0 && (
            <div>
              {groupedNotifications.unread.length > 0 && (
                <h4 className="text-xs font-semibold text-pb-gray mb-2 uppercase tracking-wide">
                  Read ({groupedNotifications.read.length})
                </h4>
              )}
              <div className="space-y-1">
                {groupedNotifications.read.slice(0, 5).map((notification) => {
                  const link = getNotificationLink(notification);
                  const icon = getNotificationIcon(notification.type);
                  const color = getNotificationColor(notification.type, true);
                  
                  return (
                    <Link
                      key={notification.id}
                      to={link}
                      className="block p-3 rounded-lg hover:bg-pb-primary/5 transition-colors opacity-70"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-0.5 ${color}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${color} line-clamp-2`}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-pb-gray mt-1 line-clamp-1">
                              {notification.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-pb-gray" />
                            <span className="text-[10px] text-pb-gray">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </WidgetContainer>
  );
};

