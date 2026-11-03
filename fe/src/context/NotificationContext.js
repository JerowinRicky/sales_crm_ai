import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationCtx = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const prevUserIdRef = useRef(null);
  const hasShownPopupForSessionRef = useRef(false);

  // Fetch unread notifications
  const fetchUnread = useCallback(async (isInitialLogin = false) => {
    if (!user) {
      setUnreadNotifications([]);
      setUnreadCount(0);
      setShowLoginPopup(false);
      return;
    }
    try {
      const res = await notificationsAPI.getUnread();
      const list = res.data || [];
      setUnreadNotifications(list);
      setUnreadCount(res.count || list.length);

      if (isInitialLogin && list.length > 0 && !hasShownPopupForSessionRef.current) {
        setShowLoginPopup(true);
        hasShownPopupForSessionRef.current = true;
      }
    } catch (err) {
      console.error('Failed to fetch unread notifications:', err);
    }
  }, [user]);

  // When user logs in or changes
  useEffect(() => {
    if (user && user.id !== prevUserIdRef.current) {
      prevUserIdRef.current = user.id;
      hasShownPopupForSessionRef.current = false;
      fetchUnread(true);
    } else if (!user) {
      prevUserIdRef.current = null;
      hasShownPopupForSessionRef.current = false;
      setUnreadNotifications([]);
      setUnreadCount(0);
      setShowLoginPopup(false);
    }
  }, [user, fetchUnread]);

  // Periodically check for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchUnread(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [user, fetchUnread]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setUnreadNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Marked as read');
    } catch (err) {
      toast.error('Failed to mark notification as read');
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setUnreadNotifications([]);
      setUnreadCount(0);
      setShowLoginPopup(false);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  }, []);

  // Close popup without marking as read
  const closeLoginPopup = useCallback(() => {
    setShowLoginPopup(false);
  }, []);

  return (
    <NotificationCtx.Provider
      value={{
        unreadNotifications,
        unreadCount,
        loading,
        showLoginPopup,
        setShowLoginPopup,
        closeLoginPopup,
        markAsRead,
        markAllAsRead,
        refreshUnread: () => fetchUnread(false),
      }}
    >
      {children}
    </NotificationCtx.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationCtx);
  if (!context) {
    return {
      unreadNotifications: [],
      unreadCount: 0,
      loading: false,
      showLoginPopup: false,
      setShowLoginPopup: () => {},
      closeLoginPopup: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      refreshUnread: () => {},
    };
  }
  return context;
};

