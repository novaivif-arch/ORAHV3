import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, Bell, Settings, Check, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GlobalSearch } from '../search/GlobalSearch';
import { cn } from '../../lib/utils';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!session?.access_token) return;

    setLoadingNotifications(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notifications`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!session?.access_token) return;

    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notifications/${notificationId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ is_read: true }),
        }
      );

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!session?.access_token) return;

    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notifications`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ markAllRead: true }),
        }
      );

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      setShowNotifications(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-100 text-blue-600',
      success: 'bg-emerald-100 text-emerald-600',
      warning: 'bg-amber-100 text-amber-600',
      error: 'bg-rose-100 text-rose-600',
    };
    return colors[type] || colors.info;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Manage your voice AI platform</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <GlobalSearch />

        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowDropdown(false);
              if (!showNotifications) fetchNotifications();
            }}
            className="relative p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-500" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-blue-600 rounded-full text-[10px] text-white font-medium flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200/80 overflow-hidden z-50">
                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Notifications</h3>
                    <p className="text-xs text-slate-500">{unreadCount} unread</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchNotifications}
                      disabled={loadingNotifications}
                      className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={cn("w-4 h-4 text-slate-500", loadingNotifications && "animate-spin")} />
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors",
                          !notification.is_read && "bg-blue-50/50"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            getNotificationIcon(notification.type)
                          )}>
                            <Bell className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                "text-sm truncate",
                                !notification.is_read ? "font-semibold text-slate-900" : "text-slate-700"
                              )}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowDropdown(!showDropdown);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-900">{profile?.name}</p>
              <p className="text-[11px] text-slate-500 capitalize">{profile?.role === 'super_admin' ? 'Super Admin' : profile?.role || 'Admin'}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold text-sm shadow-lg shadow-blue-500/25">
              {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200/80 overflow-hidden z-50">
                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200/80">
                  <p className="font-semibold text-slate-900">{profile?.name}</p>
                  <p className="text-sm text-slate-500">{profile?.email}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    Settings
                  </button>
                  <div className="my-2 border-t border-slate-200"></div>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
