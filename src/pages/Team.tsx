import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import {
  Search,
  MoreVertical,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  Loader2,
  Plus,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../context/SettingsContext';
import { useProjects } from '../context/ProjectsContext';
import { Partner } from '../types';

export default function Team() {
  const { t } = useSettings();
  const { partners, projects, updatePartner, addPartner, deletePartner } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);
  const [tempAvatar, setTempAvatar] = useState('');

  const [newMember, setNewMember] = useState<Partial<Partner>>({
    name: '',
    role: '',
    email: '',
    zalo: '',
    projects: []
  });

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSavePartner = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPartner?.id) return;

    setIsSaving(true);
    try {
      await updatePartner(editingPartner);
      setEditingPartner(null);
    } catch (err) {
      alert(t('team_err_save').replace('{{msg}}', (err as Error).message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;

    setIsSaving(true);
    try {
      const partner: Partial<Partner> = {
        name: newMember.name!,
        role: newMember.role || 'Member',
        email: newMember.email!,
        zalo: newMember.zalo,
        projects: [],
        avatar: tempAvatar || undefined
      };
      await addPartner(partner);
      setIsAddingMember(false);
      setNewMember({ name: '', role: '', email: '', zalo: '', projects: [] });
      setTempAvatar('');
    } catch (err) {
      alert(t('team_err_add').replace('{{msg}}', (err as Error).message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePartner = (id: string) => {
    if (window.confirm(t('team_confirm_remove'))) {
      deletePartner(id);
    }
  };

  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert(t('team_avatar_invalid'));
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(t('team_avatar_too_large'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (isEdit && editingPartner) {
        setEditingPartner({ ...editingPartner, avatar: result });
      } else {
        setTempAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = (isEdit: boolean) => {
    if (isEdit && editingPartner) {
      setEditingPartner({ ...editingPartner, avatar: '' });
    } else {
      setTempAvatar('');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('team_members')}</h1>
          <p className="text-slate-500 mt-1">{t('team_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('team_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none w-64"
            />
          </div>
          <button 
            onClick={() => setIsAddingMember(true)}
            className="bg-accent-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2"
          >
            <Plus size={18} />
            <span>{t('team_add_member')}</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map((member, idx) => {
          const memberProjects = projects.filter(p => p.partnerId === member.id);
          const memberTasks = memberProjects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
          const workload = Math.min(memberProjects.length * 25, 100);

          return (
            <motion.div 
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 border-2 border-white shadow-sm">
                    {member.avatar ? (
                      <img 
                        src={member.avatar} 
                        alt={member.name} 
                        className="w-full h-full rounded-2xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="relative group/menu">
                  <button className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                    <MoreVertical size={18} />
                  </button>
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-10 hidden group-hover/menu:block">
                    <button 
                      onClick={() => setEditingPartner(member)}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {t('team_edit_member')}
                    </button>
                    <button 
                      onClick={() => handleDeletePartner(member.id)}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      {t('team_remove')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                <p className="text-sm font-medium text-slate-500">{member.role}</p>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('workload')}</span>
                    <span className={`text-xs font-bold ${
                      workload > 90 ? 'text-rose-600' : 
                      workload > 70 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>{workload}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${workload}%` }}
                      transition={{ delay: idx * 0.1 + 0.5, duration: 1 }}
                      className={`h-full rounded-full ${
                        workload > 90 ? 'bg-rose-500' : 
                        workload > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2 text-slate-500">
                  <CheckCircle2 size={16} className="text-accent-primary" />
                  <span className="text-xs font-bold">
                    {t('team_card_projects').replace('{{count}}', String(memberProjects.length))}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock size={16} className="text-amber-500" />
                  <span className="text-xs font-bold">
                    {t('team_card_tasks').replace('{{count}}', String(memberTasks))}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <a 
                  href={`mailto:${member.email}`}
                  className="flex-1 py-2.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={14} />
                  {t('contact_email')}
                </a>
                {member.zalo && (
                  <a 
                    href={`https://zalo.me/${member.zalo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-sky-50 text-sky-600 text-xs font-bold rounded-xl hover:bg-sky-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={14} />
                    Zalo
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{t('team_add_new_title')}</h3>
                <button onClick={() => setIsAddingMember(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddMember} className="p-8 space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-slate-400 border-2 border-dashed border-slate-200 group-hover:border-accent-primary/40 transition-all cursor-pointer overflow-hidden">
                      {tempAvatar ? (
                        <img src={tempAvatar} alt={t('avatar_preview_alt')} className="w-full h-full object-cover" />
                      ) : (
                        '+'
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-xl shadow-lg border border-slate-100 text-accent-primary hover:scale-110 transition-transform"
                    >
                      <Palette size={12} />
                    </button>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleAvatarUpload(e, false)}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{t('team_profile_picture')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t('team_avatar_hint')}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="px-3 py-1.5 bg-accent-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors"
                      >
                        {t('upload')}
                      </button>
                      {tempAvatar && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAvatar(false)}
                          className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          {t('team_remove')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('team_full_name')}</label>
                    <input 
                      type="text" 
                      required
                      placeholder={t('ph_team_name')}
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('team_role')}</label>
                    <input 
                      type="text" 
                      placeholder={t('ph_team_role')}
                      value={newMember.role}
                      onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('team_email')}</label>
                    <input 
                      type="email" 
                      required
                      placeholder={t('ph_team_email')}
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('team_zalo')}</label>
                    <input 
                      type="text" 
                      placeholder={t('ph_zalo')}
                      value={newMember.zalo}
                      onChange={(e) => setNewMember({ ...newMember, zalo: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSaving && <Loader2 size={18} className="animate-spin" />}
                    {t('team_add_member')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Partner Modal */}
      <AnimatePresence>
        {editingPartner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{t('team_edit_title')}</h3>
                <button onClick={() => setEditingPartner(null)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSavePartner} className="p-8 space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-slate-400 border-2 border-dashed border-slate-200 group-hover:border-accent-primary/40 transition-all cursor-pointer overflow-hidden">
                      {editingPartner?.avatar ? (
                        <img src={editingPartner.avatar} alt={t('avatar_preview_alt')} className="w-full h-full object-cover" />
                      ) : (
                        editingPartner?.name?.charAt(0) || '?'
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => editAvatarInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-xl shadow-lg border border-slate-100 text-accent-primary hover:scale-110 transition-transform"
                    >
                      <Palette size={12} />
                    </button>
                    <input
                      type="file"
                      ref={editAvatarInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleAvatarUpload(e, true)}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{t('team_profile_picture')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t('team_avatar_hint')}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => editAvatarInputRef.current?.click()}
                        className="px-3 py-1.5 bg-accent-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors"
                      >
                        {t('upload')}
                      </button>
                      {editingPartner?.avatar && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAvatar(true)}
                          className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          {t('team_remove')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('team_full_name')}</label>
                    <input 
                      type="text" 
                      required
                      value={editingPartner.name}
                      onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('team_role')}</label>
                    <input 
                      type="text" 
                      required
                      value={editingPartner.role}
                      onChange={(e) => setEditingPartner({ ...editingPartner, role: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('team_email')}</label>
                    <input 
                      type="email" 
                      required
                      value={editingPartner.email}
                      onChange={(e) => setEditingPartner({ ...editingPartner, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('team_zalo')}</label>
                    <input 
                      type="text" 
                      placeholder={t('ph_zalo_edit')}
                      value={editingPartner.zalo || ''}
                      onChange={(e) => setEditingPartner({ ...editingPartner, zalo: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingPartner(null)}
                    className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSaving && <Loader2 size={18} className="animate-spin" />}
                    {t('save_changes')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
