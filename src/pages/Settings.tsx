import React, { useState, useRef } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  Moon,
  Sun,
  Check,
  Loader2,
  X,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useProjects } from '../context/ProjectsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type Tab = 'Profile' | 'Notifications' | 'Security' | 'Appearance' | 'Language' | 'System';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const { t, language, setLanguage, timezone, setTimezone } = useSettings();
  const { resetData } = useProjects();
  const { user, profile: authProfile } = useAuth();

  // Language Temp State
  const [tempLanguage, setTempLanguage] = useState(language);
  const [tempTimezone, setTempTimezone] = useState(timezone);

  // Profile State - load from auth context
  const [profile, setProfile] = useState({
    name: authProfile?.name || user?.name || '',
    email: authProfile?.email || user?.email || '',
    bio: '',
    avatar: authProfile?.avatar || ''
  });
  const [tempProfile, setTempProfile] = useState({ ...profile });

  // Notifications State - load from profile
  const [notifications, setNotifications] = useState({
    email: authProfile?.notify_email ?? true,
  });

  // Security State
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '' });
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [setupStep, setSetupStep] = useState<'phone' | 'verify'>('phone');

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error(t('settings_err_auth'));

      let avatarUrl = tempProfile.avatar;

      // If avatar is a new base64 image (not a Supabase URL), upload it
      if (tempProfile.avatar && tempProfile.avatar.startsWith('data:')) {
        const ext = tempProfile.avatar.split(';')[0].split('/')[1];
        const fileName = `${userId}/avatar.${ext === 'jpeg' ? 'jpg' : ext}`;

        const res = await fetch(tempProfile.avatar);
        const blob = await res.blob();

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = urlData.publicUrl;
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: tempProfile.name,
          avatar: avatarUrl,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Sync to Supabase auth user_metadata so AuthContext stays up to date
      const { error: metaError } = await supabase.auth.updateUser({
        data: { name: tempProfile.name, avatar: avatarUrl }
      });
      if (metaError) console.warn('Could not update auth metadata:', metaError);

      setProfile({ ...tempProfile, avatar: avatarUrl });
      alert(t('settings_profile_ok'));
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert(t('settings_profile_err'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setTempProfile({ ...profile });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert(t('team_avatar_invalid'));
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert(t('team_avatar_too_large'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempProfile(prev => ({ ...prev, avatar: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setTempProfile(prev => ({ ...prev, avatar: '' }));
  };

  const handleUpdateNotifications = async () => {
    setIsSaving(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error(t('settings_err_auth'));

      const { error } = await supabase
        .from('profiles')
        .update({
          notify_email: notifications.email,
        })
        .eq('id', userId);

      if (error) throw error;
      alert(t('settings_notif_ok'));
    } catch (err) {
      console.error('Failed to save notifications:', err);
      alert(t('settings_notif_err'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (!passwords.new) {
      alert(t('pwd_new_required'));
      return;
    }
    const pwd = passwords.new;
    if (pwd.length < 8) {
      alert(t('pwd_min_8'));
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      alert(t('pwd_upper'));
      return;
    }
    if (!/[a-z]/.test(pwd)) {
      alert(t('pwd_lower'));
      return;
    }
    if (!/[0-9]/.test(pwd)) {
      alert(t('pwd_number'));
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });
      if (error) throw error;
      setPasswords({ current: '', new: '' });
      alert(t('pwd_updated'));
    } catch (err) {
      console.error('Failed to update password:', err);
      alert(t('pwd_update_fail').replace('{{msg}}', (err as Error).message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnable2FA = () => {
    if (is2FAEnabled) {
      setIs2FAEnabled(false);
    } else {
      setShow2FAModal(true);
      setSetupStep('phone');
    }
  };

  const handleSendCode = () => {
    if (!phoneNumber) return;
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSetupStep('verify');
    }, 1000);
  };

  const handleVerifyCode = () => {
    if (!verificationCode) return;
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIs2FAEnabled(true);
      setShow2FAModal(false);
      setPhoneNumber('');
      setVerificationCode('');
      alert(t('settings_2fa_success'));
    }, 1000);
  };

  const handleSaveLanguage = () => {
    setIsSaving(true);
    setTimeout(() => {
      setLanguage(tempLanguage);
      setTimezone(tempTimezone);
      setIsSaving(false);
      alert(
        t('settings_prefs_saved')
          .replace('{{lang}}', tempLanguage === 'en' ? t('lang_name_en') : t('lang_name_vi'))
          .replace('{{tz}}', tempTimezone)
      );
    }, 800);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Profile':
        return (
          <motion.section 
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User size={20} className="text-accent-primary" />
              {t('settings_public_profile')}
            </h3>
            
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 bg-accent-light rounded-3xl flex items-center justify-center text-3xl font-bold text-accent-primary border-2 border-dashed border-accent-primary/20 group-hover:border-accent-primary/40 transition-all cursor-pointer overflow-hidden">
                  {tempProfile.avatar ? (
                    <img src={tempProfile.avatar} alt={t('avatar_preview_alt')} className="w-full h-full object-cover" />
                  ) : (
                    tempProfile.name.split(' ').map(n => n[0]).join('')
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-accent-primary hover:scale-110 transition-transform"
                >
                  <Palette size={14} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">{t('team_profile_picture')}</h4>
                <p className="text-xs text-slate-500 mt-1">{t('team_avatar_hint')}</p>
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-accent-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors"
                  >
                    {t('settings_upload_new')}
                  </button>
                  <button 
                    onClick={handleRemoveAvatar}
                    className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {t('team_remove')}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('team_full_name')}</label>
                <input 
                  type="text" 
                  value={tempProfile.name}
                  onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('settings_email_address')}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="email" 
                    value={tempProfile.email}
                    onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                  />
                </div>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('settings_bio')}</label>
                <textarea 
                  rows={4}
                  value={tempProfile.bio}
                  onChange={(e) => setTempProfile({ ...tempProfile, bio: e.target.value })}
                  placeholder={t('ph_settings_bio')}
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button 
                onClick={handleCancelProfile}
                className="px-6 py-2.5 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-6 py-2.5 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {t('save_changes')}
              </button>
            </div>
          </motion.section>
        );
      case 'Notifications':
        return (
          <motion.section
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell size={20} className="text-accent-primary" />
                {t('settings_notif_section')}
              </h3>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-accent-primary transition-colors">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t('settings_email_notif_title')}</p>
                  <p className="text-xs text-slate-500">{t('settings_email_notif_desc')}</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
                className={`w-12 h-6 rounded-full transition-all relative ${notifications.email ? 'bg-accent-primary shadow-inner' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${notifications.email ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="pt-4 p-4 bg-accent-light/30 rounded-2xl border border-accent-primary/10">
              <div className="flex items-start gap-3">
                <Mail size={20} className="text-accent-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{t('settings_test_email_card')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('settings_test_email_desc')}</p>
                  <button
                    onClick={async () => {
                      if (!user?.email) return;
                      setIsSaving(true);
                      try {
                        const { sendEmail, buildNotificationEmail } = await import('../lib/email');
                        const { subject, html, text } = buildNotificationEmail({
                          type: 'project',
                          recipientName: profile?.name || user.name,
                          content: {
                            title: 'Test Email from DevFlow',
                            message: 'This is a test email to verify that your email notifications are working correctly. If you received this, everything is set up properly!',
                            link: `${window.location.origin}/settings`,
                          },
                        });
                        const result = await sendEmail({ to: user.email, subject, html, text });
                        if (result.success) {
                          alert(t('settings_test_email_sent'));
                        } else {
                          alert(t('settings_test_email_fail').replace('{{msg}}', result.error || ''));
                        }
                      } catch (err) {
                        alert(t('settings_test_email_error').replace('{{msg}}', (err as Error).message));
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving || !user?.email}
                    className="mt-3 px-4 py-2 bg-accent-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                    {t('settings_send_test_email')}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 flex justify-end">
              <button
                onClick={handleUpdateNotifications}
                disabled={isSaving}
                className="px-6 py-2.5 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {t('save_preferences')}
              </button>
            </div>
          </motion.section>
        );
      case 'Security':
        return (
          <motion.section 
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield size={20} className="text-accent-primary" />
              {t('settings_security_privacy')}
            </h3>

            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900">{t('settings_change_password')}</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('settings_current_password')}</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('settings_new_password')}</label>
                    <input 
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                </div>
                <button type="button" className="text-xs font-bold text-accent-primary hover:underline">{t('settings_forgot_password')}</button>
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-4">
                <h4 className="text-sm font-bold text-slate-900">{t('settings_2fa_section')}</h4>
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  is2FAEnabled ? "bg-emerald-50 border-emerald-100" : "bg-accent-light/50 border-accent-primary/10"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      is2FAEnabled ? "bg-emerald-100 text-emerald-600" : "bg-accent-light text-accent-primary"
                    )}>
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t('settings_sms_2fa')}</p>
                      <p className="text-xs text-slate-500">{t('settings_sms_2fa_desc')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleEnable2FA}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg border transition-colors",
                      is2FAEnabled 
                        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700" 
                        : "bg-white text-accent-primary border-accent-primary/20 hover:bg-accent-light"
                    )}
                  >
                    {is2FAEnabled ? t('settings_2fa_enabled_btn') : t('settings_2fa_enable_btn')}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSaveSecurity}
                disabled={isSaving}
                className="px-6 py-2.5 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {t('settings_update_security')}
              </button>
            </div>
          </motion.section>
        );
      case 'Appearance':
        return (
          <motion.section 
            key="appearance"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Palette size={20} className="text-accent-primary" />
              {t('settings_appearance')}
            </h3>

            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900">{t('settings_interface_theme')}</h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', labelKey: 'theme_light', icon: Sun },
                    { id: 'dark', labelKey: 'theme_dark', icon: Moon },
                    { id: 'system', labelKey: 'theme_system', icon: Laptop },
                  ].map((opt) => (
                    <button 
                      key={opt.id}
                      onClick={() => setTheme(opt.id as 'light' | 'dark' | 'system')}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                        theme === opt.id 
                          ? 'bg-accent-light border-accent-primary/30 text-accent-primary shadow-sm' 
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <opt.icon size={24} />
                      <span className="text-xs font-bold">{t(opt.labelKey)}</span>
                      {theme === opt.id && <Check size={12} className="mt-1" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-4">
                <h4 className="text-sm font-bold text-slate-900">{t('settings_accent_color')}</h4>
                <div className="flex gap-4">
                  {[
                    { id: 'indigo', color: 'bg-indigo-600' },
                    { id: 'rose', color: 'bg-rose-600' },
                    { id: 'emerald', color: 'bg-emerald-600' },
                    { id: 'amber', color: 'bg-amber-600' },
                    { id: 'sky', color: 'bg-sky-600' }
                  ].map((c) => (
                    <button 
                      key={c.id}
                      onClick={() => setAccentColor(c.id as any)}
                      className={`w-10 h-10 rounded-full ${c.color} border-4 border-white shadow-sm hover:scale-110 transition-transform flex items-center justify-center`}
                    >
                      {accentColor === c.id && <Check size={16} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        );
      case 'Language':
        return (
          <motion.section 
            key="language"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Globe size={20} className="text-accent-primary" />
              {t('language_region')}
            </h3>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('preferred_language')}</label>
                  <select 
                    value={tempLanguage}
                    onChange={(e) => setTempLanguage(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                  >
                    <option value="en">English (US)</option>
                    <option value="vi">Tiếng Việt</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('time_zone')}</label>
                  <select 
                    value={tempTimezone}
                    onChange={(e) => setTempTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                  >
                    <option value="utc+7">(UTC+07:00) Bangkok, Hanoi, Jakarta</option>
                    <option value="utc+0">(UTC+00:00) London, Dublin, Lisbon</option>
                    <option value="utc-5">(UTC-05:00) Eastern Time (US & Canada)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={handleSaveLanguage}
                disabled={isSaving}
                className="px-6 py-2.5 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {t('save_preferences')}
              </button>
            </div>
          </motion.section>
        );
      case 'System':
        return (
          <motion.section 
            key="system"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Laptop size={20} className="text-accent-primary" />
              {t('settings_system_title')}
            </h3>

            <div className="space-y-6">
              <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 space-y-4">
                <div className="flex items-center gap-3 text-rose-600">
                  <Shield size={20} />
                  <h4 className="font-bold">{t('settings_danger_zone')}</h4>
                </div>
                <p className="text-sm text-rose-600/80">
                  {t('settings_reset_desc')}
                </p>
                <button 
                  onClick={() => {
                    if (window.confirm(t('settings_reset_confirm'))) {
                      resetData();
                      alert(t('settings_reset_ok'));
                    }
                  }}
                  className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                >
                  {t('settings_reset_btn')}
                </button>
              </div>
            </div>
          </motion.section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">{t('settings')}</h1>
        <p className="text-slate-500 mt-1">{t('settings_subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-1">
          {[
            { id: 'Profile', icon: User, labelKey: 'settings_tab_profile' },
            { id: 'Notifications', icon: Bell, labelKey: 'settings_tab_notifications' },
            { id: 'Security', icon: Shield, labelKey: 'settings_tab_security' },
            { id: 'Appearance', icon: Palette, labelKey: 'settings_tab_appearance' },
            { id: 'Language', icon: Globe, labelKey: 'settings_tab_language' },
            { id: 'System', icon: Laptop, labelKey: 'settings_tab_system' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? "bg-accent-light text-accent-primary shadow-sm" 
                  : "text-slate-500 hover:bg-white hover:text-slate-800"
              }`}
            >
              <item.icon size={18} />
              {t(item.labelKey)}
            </button>
          ))}
        </aside>

        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {show2FAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{t('settings_2fa_modal_title')}</h3>
                <button onClick={() => setShow2FAModal(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                {setupStep === 'phone' ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center text-accent-primary mx-auto">
                      <Phone size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900">{t('settings_phone_step_title')}</p>
                      <p className="text-xs text-slate-500 mt-1">{t('settings_phone_step_desc')}</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('settings_phone_label')}</label>
                      <input 
                        type="tel" 
                        placeholder={t('ph_settings_phone')}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                      />
                    </div>
                    <button 
                      onClick={handleSendCode}
                      disabled={!phoneNumber || isSaving}
                      className="w-full py-3 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSaving && <Loader2 size={18} className="animate-spin" />}
                      {t('settings_send_verification')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
                      <Check size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900">{t('settings_verify_step_title')}</p>
                      <p className="text-xs text-slate-500 mt-1">{t('settings_verify_step_desc').replace('{{phone}}', phoneNumber)}</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('settings_verif_code_label')}</label>
                      <input 
                        type="text" 
                        maxLength={6}
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none text-center tracking-[0.5em] font-mono text-lg"
                      />
                    </div>
                    <button 
                      onClick={handleVerifyCode}
                      disabled={verificationCode.length < 6 || isSaving}
                      className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSaving && <Loader2 size={18} className="animate-spin" />}
                      {t('settings_verify_enable_btn')}
                    </button>
                    <button 
                      onClick={() => setSetupStep('phone')}
                      className="w-full text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      {t('settings_back_phone')}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
