import { useState, FormEvent, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ExternalLink,
  Globe,
  Database,
  MoreVertical,
  ChevronRight,
  LayoutGrid,
  List as ListIcon,
  X,
  Link as LinkIcon,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Trash2,
  Loader2
} from 'lucide-react';
import { cn, formatMoney, formInputToVnd, progressRangeStyle, vndToFormInput } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Project, PaymentStatus, ProjectStatus, ProjectType } from '@/src/types';
import { useLocation, useNavigate } from 'react-router-dom';

import { useProjects } from '../context/ProjectsContext';
import { useSettings } from '../context/SettingsContext';
import { translatePayment, translateStatus, translateType } from '../lib/projectLabels';
import { appPath, projectDetailPath } from '../lib/routes';
import {
  PROJECT_SORT_OPTIONS,
  PROJECT_SORT_STORAGE_KEY,
  parseStoredProjectSort,
  sortProjectsBy,
  type ProjectSortKey,
} from '../lib/sortProjects';

const PROJECT_FILTERS: { value: string; tkey: string }[] = [
  { value: 'All', tkey: 'filter_all' },
  { value: 'Freelance', tkey: 'type_freelance' },
  { value: 'Corporate', tkey: 'type_corporate' },
  { value: 'In Progress', tkey: 'status_in_progress' },
  { value: 'Completed', tkey: 'status_completed' },
  { value: 'Planning', tkey: 'planning' },
];

export default function Projects() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useSettings();
  const { projects, partners, addProject, updateProject, deleteProject } = useProjects();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditingProject, setQuickEditingProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<ProjectSortKey>(() =>
    parseStoredProjectSort(
      typeof window !== 'undefined' ? localStorage.getItem(PROJECT_SORT_STORAGE_KEY) : null
    )
  );

  useEffect(() => {
    try {
      localStorage.setItem(PROJECT_SORT_STORAGE_KEY, sortKey);
    } catch {
      /* ignore quota / private mode */
    }
  }, [sortKey]);

  useEffect(() => {
    if (location.state?.openModal) {
      handleOpenModal();
      // Clear state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    client: '',
    type: 'Freelance',
    status: 'Planning',
    paymentStatus: 'Unpaid',
    amount: 0,
    progress: 0,
    deadline: new Date().toISOString().split('T')[0],
    resources: [],
    hostingInfo: '',
    demoLink: '',
    liveLink: '',
    customFields: [],
    partnerId: '',
  });
  const [quickFormData, setQuickFormData] = useState<Pick<Project, 'name' | 'progress' | 'paymentStatus' | 'deadline'>>({
    name: '',
    progress: 0,
    paymentStatus: 'Unpaid',
    deadline: new Date().toISOString().split('T')[0],
  });

  const filteredProjects = projects.filter(p => 
    filter === 'All' || p.type === filter || p.status === filter
  );

  const visibleProjects = useMemo(
    () => sortProjectsBy(filteredProjects, sortKey),
    [filteredProjects, sortKey]
  );

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        ...project,
        customFields: project.customFields || []
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        client: '',
        type: 'Freelance',
        status: 'Planning',
        paymentStatus: 'Unpaid',
        amount: 0,
        progress: 0,
        deadline: new Date().toISOString().split('T')[0],
        resources: [],
        hostingInfo: '',
        demoLink: '',
        liveLink: '',
        customFields: [],
        partnerId: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenQuickEdit = (project: Project) => {
    setQuickEditingProject(project);
    setQuickFormData({
      name: project.name,
      progress: project.progress ?? 0,
      paymentStatus: project.paymentStatus ?? 'Unpaid',
      deadline: project.deadline || new Date().toISOString().split('T')[0],
    });
    setIsQuickEditOpen(true);
  };

  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), { label: '', value: '' }]
    }));
  };

  const updateCustomField = (index: number, field: 'label' | 'value', value: string) => {
    const newFields = [...(formData.customFields || [])];
    newFields[index] = { ...newFields[index], [field]: value };
    setFormData({ ...formData, customFields: newFields });
  };

  const removeCustomField = (index: number) => {
    setFormData({
      ...formData,
      customFields: formData.customFields?.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
      } else {
        await addProject(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save project:', err);
      alert(t('err_save_project'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t('delete_project_confirm').replace('{{name}}', name))) return;
    setIsDeleting(true);
    try {
      await deleteProject(id);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert(t('err_delete_project'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickEditingProject) return;
    setIsSaving(true);
    try {
      await updateProject(quickEditingProject.id, {
        name: quickFormData.name,
        progress: quickFormData.progress,
        paymentStatus: quickFormData.paymentStatus,
        deadline: quickFormData.deadline,
      });
      setIsQuickEditOpen(false);
      setQuickEditingProject(null);
    } catch (err) {
      console.error('Failed to quick update project:', err);
      alert(language === 'vi' ? 'Không thể cập nhật nhanh dự án.' : 'Failed to quick update project.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('projects')}</h1>
          <p className="text-slate-500 mt-1">{t('projects_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            <button 
              onClick={() => setView('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                view === 'grid' ? "bg-accent-light text-accent-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                view === 'list' ? "bg-accent-light text-accent-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <ListIcon size={18} />
            </button>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-accent-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2"
          >
            <Plus size={18} />
            <span>{t('new_project')}</span>
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {PROJECT_FILTERS.map(({ value: f, tkey }) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              filter === f 
                ? "bg-slate-900 text-white shadow-md" 
                : "bg-white text-slate-500 border border-slate-100 hover:border-slate-200"
            )}
          >
            {t(tkey)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('projects_sort_label')}</span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as ProjectSortKey)}
          className="w-full rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20 sm:ml-auto sm:max-w-sm"
        >
          {PROJECT_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.tkey)}
            </option>
          ))}
        </select>
      </div>

      {/* Projects Grid */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {visibleProjects.map((project, idx) => (
              <motion.div
                layout
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      project.type === 'Freelance' ? "bg-accent-light text-accent-primary" : "bg-slate-100 text-slate-600"
                    )}>
                      {translateType(project.type, t)}
                    </div>
                    <button 
                      onClick={() => handleOpenQuickEdit(project)}
                      className="text-slate-400 hover:text-accent-primary p-1 hover:bg-accent-light rounded-lg transition-all"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                  
                  <h3 
                    onClick={() => navigate(appPath(projectDetailPath(project)))}
                    className="text-xl font-bold text-slate-900 mb-1 group-hover:text-accent-primary transition-colors cursor-pointer"
                  >
                    {project.name}
                  </h3>
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-slate-500">{project.client}</p>
                    {project.partnerId && (
                      <div className="flex items-center gap-2 group/partner relative">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm">
                          <img 
                            src={partners.find(p => p.id === project.partnerId)?.avatar || `https://ui-avatars.com/api/?name=${partners.find(p => p.id === project.partnerId)?.name}`} 
                            alt={t('partner_avatar_alt')} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover/partner:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {t('member_prefix')}: {partners.find(p => p.id === project.partnerId)?.name}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{t('progress_label')}</span>
                      <span className="font-bold text-slate-900">{project.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        className={cn(
                          "h-full rounded-full",
                          project.progress === 100 ? "bg-emerald-500" : "bg-accent-primary"
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{t('amount_label')}</p>
                      <p className="text-sm font-bold text-slate-900">
                        {project.amount > 0 ? formatMoney(project.amount, language) : t('not_applicable')}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{t('payment_label')}</p>
                      <p className={cn(
                        "text-sm font-bold",
                        project.paymentStatus === 'Paid' ? "text-emerald-600" : 
                        project.paymentStatus === 'Partial' ? "text-amber-600" : "text-rose-600"
                      )}>
                        {translatePayment(project.paymentStatus, t)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">{t('resources_label')}</p>
                    <div className="flex flex-wrap gap-2">
                      {project.resources.length > 0 ? project.resources.map((res, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] rounded-md font-medium">
                          {res}
                        </span>
                      )) : (
                        <span className="text-[10px] text-slate-300 italic">{t('no_resources_added')}</span>
                      )}
                    </div>
                  </div>

                  {project.customFields && project.customFields.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-50">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">{t('additional_info')}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {project.customFields.map((field, i) => (
                          <div key={i} className="min-w-0">
                            <p className="text-[10px] text-slate-400 font-bold truncate">{field.label}</p>
                            <p className="text-xs font-medium text-slate-700 truncate">{field.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {project.demoLink && (
                      <a href={project.demoLink} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-lg text-slate-400 hover:text-accent-primary hover:shadow-sm transition-all">
                        <Globe size={16} />
                      </a>
                    )}
                    {project.liveLink && (
                      <a href={project.liveLink} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-lg text-slate-400 hover:text-emerald-600 hover:shadow-sm transition-all">
                        <ExternalLink size={16} />
                      </a>
                    )}
                    {project.hostingInfo && (
                      <div className="p-2 bg-white rounded-lg text-slate-400 group/host relative cursor-help">
                        <Database size={16} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover/host:opacity-100 transition-opacity whitespace-nowrap">
                          {project.hostingInfo}
                        </div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => navigate(appPath(projectDetailPath(project)))}
                    className="flex items-center gap-1 text-xs font-bold text-accent-primary hover:gap-2 transition-all"
                  >
                    {t('details')} <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('col_project')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('col_type')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('col_progress')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('col_payment')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('col_amount')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleProjects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div 
                      onClick={() => navigate(appPath(projectDetailPath(project)))}
                      className="cursor-pointer"
                    >
                      <p className="text-sm font-bold text-slate-900 group-hover:text-accent-primary transition-colors">{project.name}</p>
                      <p className="text-xs text-slate-400">{project.client}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                      project.type === 'Freelance' ? "bg-accent-light text-accent-primary" : "bg-slate-100 text-slate-600"
                    )}>
                      {translateType(project.type, t)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-[100px] overflow-hidden">
                        <div className="h-full bg-accent-primary rounded-full" style={{ width: `${project.progress}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs font-semibold",
                      project.paymentStatus === 'Paid' ? "text-emerald-600" : 
                      project.paymentStatus === 'Partial' ? "text-amber-600" : "text-rose-600"
                    )}>
                      {translatePayment(project.paymentStatus, t)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">
                      {project.amount > 0 ? formatMoney(project.amount, language) : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenQuickEdit(project)}
                      className="p-2 text-slate-400 hover:text-accent-primary hover:bg-white rounded-lg transition-all"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Project Modal */}
      <AnimatePresence>
        {isQuickEditOpen && quickEditingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickEditOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {language === 'vi' ? 'Chỉnh sửa nhanh' : 'Quick Edit'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {language === 'vi'
                      ? 'Chỉnh tên, tiến độ, thanh toán và deadline.'
                      : 'Update name, progress, payment status and deadline.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickEditOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </header>

              <form onSubmit={handleQuickEditSubmit} className="space-y-5 p-6">
                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('project_name')}
                  </label>
                  <input
                    required
                    type="text"
                    value={quickFormData.name}
                    onChange={(e) => setQuickFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('progress_percent')}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={quickFormData.progress}
                    onChange={(e) =>
                      setQuickFormData((prev) => ({ ...prev, progress: Number(e.target.value) }))
                    }
                    style={progressRangeStyle(quickFormData.progress)}
                    className="range-track-fill mt-3 h-2 w-full cursor-pointer"
                  />
                  <p className="text-right text-[10px] font-bold text-accent-primary">{quickFormData.progress}%</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('payment_status')}
                    </label>
                    <select
                      value={quickFormData.paymentStatus}
                      onChange={(e) =>
                        setQuickFormData((prev) => ({
                          ...prev,
                          paymentStatus: e.target.value as PaymentStatus,
                        }))
                      }
                      className="w-full rounded-xl bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                    >
                      <option value="Unpaid">{translatePayment('Unpaid', t)}</option>
                      <option value="Partial">{translatePayment('Partial', t)}</option>
                      <option value="Paid">{translatePayment('Paid', t)}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('due_date')}
                    </label>
                    <input
                      type="date"
                      value={quickFormData.deadline}
                      onChange={(e) =>
                        setQuickFormData((prev) => ({ ...prev, deadline: e.target.value }))
                      }
                      className="w-full rounded-xl bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => navigate(appPath(projectDetailPath(quickEditingProject)))}
                    className="text-xs font-bold text-accent-primary hover:underline"
                  >
                    {language === 'vi'
                      ? 'Chỉnh sửa đầy đủ trong trang chi tiết'
                      : 'Full edit in project details page'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-primary/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                    {language === 'vi' ? 'Lưu nhanh' : 'Save quick edit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <header className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingProject ? t('edit_project') : t('new_project')}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </header>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('project_name')}</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('ph_project_name')}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('client_company')}</label>
                    <input 
                      required
                      type="text" 
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      placeholder={t('ph_client')}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('project_type')}</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as ProjectType })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    >
                      <option value="Freelance">{t('type_freelance')}</option>
                      <option value="Corporate">{t('type_corporate')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('status')}</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    >
                      <option value="Planning">{translateStatus('Planning', t)}</option>
                      <option value="In Progress">{translateStatus('In Progress', t)}</option>
                      <option value="Review">{translateStatus('Review', t)}</option>
                      <option value="Completed">{translateStatus('Completed', t)}</option>
                      <option value="Maintenance">{translateStatus('Maintenance', t)}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                      {t(language === 'en' ? 'amount_usd' : 'amount_vnd')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                        {language === 'en' ? '$' : '₫'}
                      </span>
                      <input 
                        type="number" 
                        step={language === 'en' ? 'any' : '1'}
                        value={vndToFormInput(formData.amount ?? 0, language)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const v = raw === '' ? 0 : parseFloat(raw);
                          setFormData({
                            ...formData,
                            amount: formInputToVnd(Number.isNaN(v) ? 0 : v, language),
                          });
                        }}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('progress_percent')}</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                      style={progressRangeStyle(formData.progress ?? 0)}
                      className="range-track-fill mt-4 h-2 w-full cursor-pointer"
                    />
                    <p className="text-right text-[10px] font-bold text-accent-primary">{formData.progress}%</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('payment_status')}</label>
                    <select 
                      value={formData.paymentStatus}
                      onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    >
                      <option value="Unpaid">{translatePayment('Unpaid', t)}</option>
                      <option value="Partial">{translatePayment('Partial', t)}</option>
                      <option value="Paid">{translatePayment('Paid', t)}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('due_date')}</label>
                    <div className="relative">
                      <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="date" 
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('assigned_member')}</label>
                    <div className="relative">
                      <UsersIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                        value={formData.partnerId}
                        onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                      >
                        <option value="">{t('no_member')}</option>
                        {partners.map(partner => (
                          <option key={partner.id} value={partner.id}>{partner.name} ({partner.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2">{t('technical_details')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('hosting_info')}</label>
                      <div className="relative">
                        <Database size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={formData.hostingInfo}
                          onChange={(e) => setFormData({ ...formData, hostingInfo: e.target.value })}
                          placeholder={t('ph_hosting')}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('demo_link')}</label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="url" 
                          value={formData.demoLink}
                          onChange={(e) => setFormData({ ...formData, demoLink: e.target.value })}
                          placeholder={t('ph_demo_url')}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('live_link')}</label>
                      <div className="relative">
                        <ExternalLink size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="url" 
                          value={formData.liveLink}
                          onChange={(e) => setFormData({ ...formData, liveLink: e.target.value })}
                          placeholder={t('ph_live_url')}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">{t('custom_fields')}</h3>
                    <button 
                      type="button"
                      onClick={addCustomField}
                      className="text-xs font-bold text-accent-primary hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> {t('add_field')}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.customFields?.map((field, idx) => (
                      <div key={idx} className="flex gap-3 items-end">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('field_label')}</label>
                          <input 
                            type="text"
                            value={field.label}
                            onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                            placeholder={t('ph_field_label')}
                            className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('field_value')}</label>
                          <input 
                            type="text"
                            value={field.value}
                            onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                            placeholder={t('ph_field_value')}
                            className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeCustomField(idx)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all mb-0.5"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {(!formData.customFields || formData.customFields.length === 0) && (
                      <p className="text-xs text-slate-400 italic text-center py-2">{t('no_custom_fields')}</p>
                    )}
                  </div>
                </div>

                <div className="pt-6 flex justify-between items-center gap-3">
                  <div>
                    {editingProject && (
                      <button
                        type="button"
                        onClick={() => handleDelete(editingProject.id, editingProject.name)}
                        disabled={isDeleting}
                        className="px-4 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {t('delete_project')}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2.5 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving && <Loader2 size={16} className="animate-spin" />}
                      {editingProject ? t('update_project') : t('create_project')}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
