import React, { useState } from 'react';
import { Plus, MoreVertical, Clock, X, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useProjects } from '../context/ProjectsContext';
import { useSettings } from '../context/SettingsContext';
import { PlanItem } from '../types';

const PLAN_STATUSES = ['Todo', 'Doing', 'Done'] as const;

const PLAN_STATUS_KEY: Record<(typeof PLAN_STATUSES)[number], string> = {
  Todo: 'plan_col_todo',
  Doing: 'plan_col_doing',
  Done: 'plan_col_done',
};

const PRIORITY_KEY: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

function planColLabel(status: (typeof PLAN_STATUSES)[number], t: (key: string) => string) {
  return t(PLAN_STATUS_KEY[status]);
}

function priorityLabel(p: PlanItem['priority'], t: (key: string) => string) {
  return t(PRIORITY_KEY[p]);
}

export default function Planning() {
  const { t } = useSettings();
  const { planItems, addPlanItem, updatePlanItem, deletePlanItem } = useProjects();
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PlanItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<PlanItem>>({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Todo',
    date: new Date().toISOString().split('T')[0]
  });

  const handleOpenEdit = (item: PlanItem) => {
    setEditingGoal(item);
    setNewGoal(item);
    setIsAddingGoal(true);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title) return;

    setIsSaving(true);
    setTimeout(() => {
      if (editingGoal) {
        updatePlanItem({ ...editingGoal, ...newGoal } as PlanItem);
      } else {
        const goal: PlanItem = {
          id: `goal-${Date.now()}`,
          title: newGoal.title!,
          description: newGoal.description || '',
          priority: newGoal.priority as any || 'Medium',
          status: newGoal.status as any || 'Todo',
          date: newGoal.date || new Date().toISOString().split('T')[0]
        };
        addPlanItem(goal);
      }
      setIsSaving(false);
      setIsAddingGoal(false);
      setEditingGoal(null);
      setNewGoal({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Todo',
        date: new Date().toISOString().split('T')[0]
      });
    }, 500);
  };

  const moveGoal = (id: string, newStatus: PlanItem['status']) => {
    const item = planItems.find(p => p.id === id);
    if (item) {
      updatePlanItem({ ...item, status: newStatus });
    }
  };

  const handleDeleteGoal = (id: string) => {
    if (window.confirm(t('planning_delete_confirm'))) {
      deletePlanItem(id);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('planning')}</h1>
          <p className="text-slate-500 mt-1">{t('planning_subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsAddingGoal(true)}
          className="bg-accent-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2"
        >
          <Plus size={18} />
          <span>{t('planning_add_goal')}</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {PLAN_STATUSES.map((status) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">{planColLabel(status, t)}</h3>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                  {planItems.filter(p => p.status === status).length}
                </span>
              </div>
              <button 
                onClick={() => {
                  setNewGoal(prev => ({ ...prev, status }));
                  setIsAddingGoal(true);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {planItems.filter(p => p.status === status).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                      item.priority === 'High' ? "bg-rose-50 text-rose-600" : 
                      item.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {priorityLabel(item.priority, t)}
                    </span>
                    <div className="relative group/menu">
                      <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={16} />
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-10 hidden group-hover/menu:block">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          {t('planning_edit_goal')}
                        </button>
                        {PLAN_STATUSES.map(s => s !== status && (
                          <button 
                            key={s}
                            onClick={() => moveGoal(item.id, s)}
                            className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            {t('planning_move_to').replace('{{status}}', planColLabel(s, t))}
                          </button>
                        ))}
                        <button 
                          onClick={() => handleDeleteGoal(item.id)}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <h4 className="font-bold text-slate-900 mb-2">{item.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.description}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={12} />
                      <span className="text-[10px] font-medium">{item.date}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {planItems.filter(p => p.status === status).length === 0 && (
                <div className="h-32 border-2 border-dashed border-slate-100 rounded-3xl flex items-center justify-center text-slate-300 text-sm">
                  {t('planning_empty')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isAddingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingGoal ? t('planning_edit_goal') : t('planning_add_modal_title')}
                </h3>
                <button onClick={() => {
                  setIsAddingGoal(false);
                  setEditingGoal(null);
                  setNewGoal({
                    title: '',
                    description: '',
                    priority: 'Medium',
                    status: 'Todo',
                    date: new Date().toISOString().split('T')[0]
                  });
                }} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddGoal} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('planning_goal_title')}</label>
                    <input 
                      type="text" 
                      required
                      placeholder={t('ph_planning_goal')}
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('description')}</label>
                    <textarea 
                      rows={3}
                      placeholder={t('ph_planning_details')}
                      value={newGoal.description}
                      onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('priority')}</label>
                      <select 
                        value={newGoal.priority}
                        onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value as any })}
                        className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                      >
                        <option value="Low">{t('low')}</option>
                        <option value="Medium">{t('medium')}</option>
                        <option value="High">{t('high')}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('planning_target_date')}</label>
                      <input 
                        type="date" 
                        value={newGoal.date}
                        onChange={(e) => setNewGoal({ ...newGoal, date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingGoal(false);
                      setEditingGoal(null);
                      setNewGoal({
                        title: '',
                        description: '',
                        priority: 'Medium',
                        status: 'Todo',
                        date: new Date().toISOString().split('T')[0]
                      });
                    }}
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
                    {editingGoal ? t('planning_update_goal') : t('planning_add_goal')}
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
