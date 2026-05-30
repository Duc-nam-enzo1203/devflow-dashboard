import { useState, FormEvent } from 'react';
import {
  X,
  Plus,
  Calendar as CalendarIcon,
  Globe,
  ExternalLink,
  Database,
  Users as UsersIcon,
  Trash2,
  Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formInputToVnd, progressRangeStyle, vndToFormInput } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import type { Project, ProjectStatus, PaymentStatus, ProjectType, Partner } from '../types';

interface EditProjectFormProps {
  project: Project | null;
  partners: Partner[];
  onClose: () => void;
  onSave: (data: Partial<Project>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const emptyForm: Partial<Project> = {
  name: '',
  client: '',
  type: 'Freelance' as ProjectType,
  status: 'Planning' as ProjectStatus,
  paymentStatus: 'Unpaid' as PaymentStatus,
  amount: 0,
  progress: 0,
  deadline: new Date().toISOString().split('T')[0],
  resources: [],
  hostingInfo: '',
  demoLink: '',
  liveLink: '',
  customFields: [],
  partnerId: '',
};

export default function EditProjectForm({ project, partners, onClose, onSave, onDelete }: EditProjectFormProps) {
  const { t, language } = useSettings();
  const [formData, setFormData] = useState<Partial<Project>>(
    project
      ? { ...project, customFields: project.customFields || [] }
      : emptyForm
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const addCustomField = () => {
    setFormData(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), { label: '', value: '' }],
    }));
  };

  const updateCustomField = (index: number, field: 'label' | 'value', value: string) => {
    const newFields = [...(formData.customFields || [])];
    newFields[index] = { ...newFields[index], [field]: value };
    setFormData({ ...formData, customFields: newFields });
  };

  const removeCustomField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields?.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (err) {
      console.error('Failed to save project:', err);
      alert('Failed to save project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          {project ? 'Edit Project' : 'New Project'}
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
        >
          <X size={20} />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Project Name</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. E-commerce Website"
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Client / Company</label>
            <input
              required
              type="text"
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              placeholder="e.g. Fashion Hub"
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Project Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ProjectType })}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
            >
              <option value="Freelance">Freelance</option>
              <option value="Corporate">Corporate</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
            >
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Review</option>
              <option value="Completed">Completed</option>
              <option value="Maintenance">Maintenance</option>
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
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Progress (%)</label>
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
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Payment Status</label>
            <select
              value={formData.paymentStatus}
              onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })}
              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
            >
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Deadline</label>
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
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Assigned Member</label>
            <div className="relative">
              <UsersIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={formData.partnerId}
                onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
              >
                <option value="">No Member</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.name} ({partner.role})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-50 pb-2">Technical Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Hosting Info</label>
              <div className="relative">
                <Database size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formData.hostingInfo}
                  onChange={(e) => setFormData({ ...formData, hostingInfo: e.target.value })}
                  placeholder="e.g. Vercel, AWS, Netlify"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Demo Link</label>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={formData.demoLink}
                  onChange={(e) => setFormData({ ...formData, demoLink: e.target.value })}
                  placeholder="https://staging.example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Live Link</label>
              <div className="relative">
                <ExternalLink size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  value={formData.liveLink}
                  onChange={(e) => setFormData({ ...formData, liveLink: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-slate-900">Custom Fields</h3>
            <button
              type="button"
              onClick={addCustomField}
              className="text-xs font-bold text-accent-primary hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Add Field
            </button>
          </div>
          <div className="space-y-3">
            {formData.customFields?.map((field, idx) => (
              <div key={idx} className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                    placeholder="e.g. Server IP"
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Value</label>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                    placeholder="e.g. 192.168.1.1"
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
              <p className="text-xs text-slate-400 italic text-center py-2">No custom fields added yet.</p>
            )}
          </div>
        </div>

        <div className="pt-6 flex justify-between items-center gap-3">
          <div>
            {project && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete Project
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
