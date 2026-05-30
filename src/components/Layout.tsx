import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import {
  Search,
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  ExternalLink,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { appPath } from '../lib/routes';
import { MOCK_PROJECTS, MOCK_PARTNERS } from '../constants';
import AIChat from './AIChat';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: 'notif.new_project.title',
    description: 'notif.new_project.desc',
    time: 'notif.2mins',
    type: 'info',
    read: false
  },
  {
    id: '2',
    title: 'notif.payment.title',
    description: 'notif.payment.desc',
    time: 'notif.1hour',
    type: 'success',
    read: false
  },
  {
    id: '3',
    title: 'notif.deadline.title',
    description: 'notif.deadline.desc',
    time: 'notif.5hours',
    type: 'warning',
    read: true
  }
];

export function Layout() {
  const { user, profile, logout } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const removeNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filteredProjects = MOCK_PROJECTS.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.client.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 3);

  const filteredPartners = MOCK_PARTNERS.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 2);

  const handleSearchItemClick = (path: string) => {
    navigate(path);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return (
    <div className="flex h-[100dvh] min-h-0 w-full max-w-full overflow-hidden bg-slate-50/50 font-sans text-slate-900">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-auto min-h-14 shrink-0 items-center gap-2 border-b border-slate-100 bg-white/95 px-3 py-2 backdrop-blur-md sm:min-h-16 sm:gap-3 sm:px-4 lg:px-6 xl:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="shrink-0 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="relative min-w-0 flex-1" ref={searchRef}>
            <div className="relative w-full">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={t('search_placeholder')}
                className="w-full min-w-0 rounded-xl border-none bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <AnimatePresence>
              {isSearchOpen && searchQuery.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,24rem)] overflow-hidden overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl"
                >
                  <div className="p-4">
                    {filteredProjects.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">{t('projects')}</h4>
                        <div className="space-y-1">
                          {filteredProjects.map(project => (
                            <button
                              key={project.id}
                              onClick={() => handleSearchItemClick(appPath('/projects'))}
                              className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-accent-light rounded-lg flex items-center justify-center text-accent-primary">
                                  <ExternalLink size={14} />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold text-slate-900">{project.name}</p>
                                  <p className="text-[10px] text-slate-500">{project.client}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 transition-all">
                                {t('view')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredPartners.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">{t('partners')}</h4>
                        <div className="space-y-1">
                          {filteredPartners.map(partner => (
                            <button
                              key={partner.id}
                              onClick={() => handleSearchItemClick(appPath('/partners'))}
                              className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <img src={partner.avatar} alt={partner.name} className="w-8 h-8 rounded-lg object-cover" />
                                <div className="text-left">
                                  <p className="text-sm font-bold text-slate-900">{partner.name}</p>
                                  <p className="text-[10px] text-slate-500">{partner.role}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 opacity-0 group-hover:opacity-100 transition-all">
                                {t('profile')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredProjects.length === 0 && filteredPartners.length === 0 && (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-500">{t('no_results')} "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-4">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "p-2 text-slate-400 hover:bg-slate-50 rounded-lg relative transition-colors",
                  isNotificationsOpen && "bg-slate-50 text-accent-primary"
                )}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed left-3 right-3 top-[4.5rem] z-50 mt-0 max-h-[min(70vh,28rem)] overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:h-auto sm:max-h-[400px] sm:w-80 sm:max-w-none rounded-2xl border border-slate-100 bg-white shadow-2xl"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900">{t('notifications')}</h3>
                      <button
                        onClick={markAllAsRead}
                        className="text-xs font-semibold text-accent-primary hover:opacity-80"
                      >
                        {t('mark_all_read')}
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={cn(
                              "p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors relative group cursor-pointer",
                              !notification.read && "bg-accent-light/30"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                notification.type === 'success' ? "bg-emerald-100 text-emerald-600" :
                                notification.type === 'warning' ? "bg-amber-100 text-amber-600" :
                                "bg-blue-100 text-blue-600"
                              )}>
                                {notification.type === 'success' ? <CheckCircle2 size={16} /> :
                                 notification.type === 'warning' ? <AlertCircle size={16} /> :
                                 <Info size={16} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{t(notification.title)}</p>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t(notification.description)}</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">{t(notification.time)}</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => removeNotification(e, notification.id)}
                              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-slate-500 transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell size={20} className="text-slate-300" />
                          </div>
                          <p className="text-sm text-slate-500 font-medium">{t('no_notifications')}</p>
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-3 bg-slate-50 text-center">
                        <button
                          onClick={() => {
                            setIsNotificationsOpen(false);
                          }}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700"
                        >
                          {t('view_all_notifications')}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mx-1 hidden h-8 w-px bg-slate-100 sm:mx-2 md:block" />
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold leading-none">{profile?.name || user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{profile?.role || user?.role || ''}</p>
                </div>
                {profile?.avatar || user?.avatar ? (
                  <img
                    src={profile?.avatar || user?.avatar}
                    alt="Avatar"
                    className="w-9 h-9 rounded-xl object-cover border border-accent-primary/20"
                  />
                ) : (
                  <div className="w-9 h-9 bg-accent-light rounded-xl flex items-center justify-center text-accent-primary font-bold border border-accent-primary/20">
                    {(profile?.name || user?.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                )}
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform hidden sm:block", isAccountOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isAccountOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed left-3 right-3 top-[4.5rem] z-50 mt-0 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-56 rounded-2xl border border-slate-100 bg-white shadow-2xl overflow-hidden"
                  >
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-sm font-semibold truncate">{profile?.name || user?.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{profile?.email || user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => { navigate(appPath('/settings')); setIsAccountOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-sm text-slate-700"
                      >
                        <Settings size={16} className="text-slate-400" />
                        {t('settings_nav')}
                      </button>
                      <button
                        onClick={async () => { await logout(); navigate('/login'); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 transition-colors text-sm text-rose-600"
                      >
                        <LogOut size={16} />
                        {t('logout')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <AIChat />
    </div>
  );
}
