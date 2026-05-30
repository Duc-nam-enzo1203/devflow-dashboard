import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../context/SettingsContext';
import { 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  MessageSquare, 
  Paperclip,
  Search,
  Filter,
  Users
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

import { Task, Project } from '@/src/types';
import { useProjects } from '../context/ProjectsContext';

type TaskStatus = 'Todo' | 'In Progress' | 'Review' | 'Done';

const columns: TaskStatus[] = ['Todo', 'In Progress', 'Review', 'Done'];

export default function Kanban() {
  const { t } = useSettings();
  const { projects, updateProject, deleteTask } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  // Flatten all tasks from all projects
  const allTasks = projects.flatMap(project => 
    (project.tasks || []).map(task => ({
      ...task,
      projectId: project.id,
      projectName: project.name,
    }))
  );

  const filteredTasks = allTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
    const matchesProject = projectFilter === 'All' || task.projectId === projectFilter;
    return matchesSearch && matchesPriority && matchesProject;
  });

  const getTasksByStatus = (status: TaskStatus) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const moveTask = (taskId: string, projectId: string, newStatus: TaskStatus) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.tasks) return;

    const updatedTasks = project.tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    );

    updateProject(project.id, { tasks: updatedTasks });
  };

  const handleDeleteTask = (projectId: string, taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(projectId, taskId);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('kanban.title')}</h1>
          <p className="text-slate-500 mt-1">{t('kanban.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('kanban.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none w-64"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2.5 bg-white border border-slate-100 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors",
                showFilters && "border-accent-primary text-accent-primary bg-accent-light/20"
              )}
            >
              <Filter size={18} />
            </button>
            
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                    <select 
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-accent-primary/20"
                    >
                      <option value="All">All Priorities</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project</label>
                    <select 
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-accent-primary/20"
                    >
                      <option value="All">All Projects</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => {
                      setPriorityFilter('All');
                      setProjectFilter('All');
                      setSearchQuery('');
                    }}
                    className="w-full py-2 text-xs font-bold text-accent-primary hover:bg-accent-light rounded-lg transition-colors"
                  >
                    Reset Filters
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex gap-6 min-w-[1000px] h-full">
          {columns.map(column => (
            <div key={column} className="flex-1 min-w-[280px] flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-700">{t(`kanban.status.${column.toLowerCase().replace(' ', '')}`)}</h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                    {getTasksByStatus(column).length}
                  </span>
                </div>
              </div>

              <div className="flex-1 bg-slate-50/50 rounded-3xl p-3 space-y-4 border border-dashed border-slate-200">
                <AnimatePresence mode="popLayout">
                  {getTasksByStatus(column).map((task) => (
                    <motion.div 
                      layout
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group relative"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          task.priority === 'High' ? "bg-rose-50 text-rose-600" : 
                          task.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {task.priority}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="relative group/menu">
                            <button className="p-1 text-slate-300 hover:text-slate-500 rounded-lg transition-all">
                              <MoreHorizontal size={14} />
                            </button>
                            <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-10 hidden group-hover/menu:block">
                              <button 
                                onClick={() => handleDeleteTask(task.projectId, task.id)}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                Delete Task
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {columns.map(col => col !== column && (
                              <button 
                                key={col}
                                onClick={() => moveTask(task.id, task.projectId, col)}
                                title={`Move to ${col}`}
                                className="w-5 h-5 flex items-center justify-center rounded bg-slate-50 text-slate-400 hover:bg-accent-primary hover:text-white transition-all text-[8px] font-bold"
                              >
                                {col.charAt(0)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        {task.title}
                      </h4>
                      <p className="text-[10px] text-accent-primary font-medium mb-4">
                        {task.projectName}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar size={12} />
                          <span className="text-[10px] font-bold">{task.date}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
