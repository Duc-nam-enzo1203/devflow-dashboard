import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Project, Partner, Task, PlanItem, Note, ProjectFile } from '../types';
import { supabase, mapDBTask } from '../lib/supabase';
import type { DBTask } from '../lib/supabase';
import {
  fetchProjects,
  fetchPartners,
  fetchPlanItems,
  fetchNotes,
  createProject,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  createPartner,
  updatePartner as dbUpdatePartner,
  deletePartner as dbDeletePartner,
  createTask,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
  createPlanItem as dbCreatePlanItem,
  updatePlanItem as dbUpdatePlanItem,
  deletePlanItem as dbDeletePlanItem,
  createNote as dbCreateNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
  reorderNotes as dbReorderNotes,
} from '../hooks/useDatabase';

interface ProjectsContextType {
  projects: Project[];
  partners: Partner[];
  planItems: PlanItem[];
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  refreshAll: () => Promise<void>;
  updatePartner: (partner: Partner) => Promise<void>;
  addPartner: (partner: Partner) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
  addProject: (project: Partial<Project>) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addTask: (projectId: string, task: Partial<Task>) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  toggleTask: (projectId: string, taskId: string) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  addMember: (projectId: string, partnerId: string) => Promise<void>;
  removeMember: (projectId: string, partnerId: string) => Promise<void>;
  addFile: (projectId: string, file: File, displayName?: string) => Promise<void>;
  deleteFile: (projectId: string, fileId: string) => Promise<void>;
  addPlanItem: (item: PlanItem) => Promise<void>;
  updatePlanItem: (item: PlanItem) => Promise<void>;
  deletePlanItem: (id: string) => Promise<void>;
  addNote: (note: Partial<Note>) => Promise<void>;
  updateNote: (id: string, note: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  reorderNotes: (orderedIds: string[]) => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const p = await fetchProjects();
      setProjects(p);

      if (session) {
        const [pa, pl, n] = await Promise.all([
          fetchPartners(),
          fetchPlanItems(),
          fetchNotes(),
        ]);
        setPartners(pa);
        setPlanItems(pl);
        setNotes(n);
      } else {
        setPartners([]);
        setPlanItems([]);
        setNotes([]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load data';
      setError(msg);
      console.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshAll();
    });
    return () => subscription.unsubscribe();
  }, [refreshAll]);

  const updatePartner = async (partner: Partner) => {
    if (!partner?.id) {
      console.error('updatePartner: missing partner id', partner);
      throw new Error('Partner id is required');
    }
    try {
      const updated = await dbUpdatePartner(partner.id, partner);
      setPartners(prev => prev.map(p => (p.id === partner.id ? updated : p)));
    } catch (e) {
      console.error('Failed to update partner:', e);
      throw e;
    }
  };

  const addPartner = async (partner: Partial<Partner>) => {
    try {
      const created = await createPartner(partner);
      setPartners(prev => [created, ...prev]);
    } catch (e) {
      console.error('Failed to add partner:', e);
      throw e;
    }
  };

  const deletePartner = async (id: string) => {
    try {
      await dbDeletePartner(id);
      setPartners(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('Failed to delete partner:', e);
      throw e;
    }
  };

  const addProject = async (projectData: Partial<Project>) => {
    try {
      const created = await createProject(projectData);
      setProjects(prev => [created, ...prev]);
    } catch (e) {
      console.error('Failed to add project:', e);
      throw e;
    }
  };

  const updateProject = async (id: string, projectData: Partial<Project>): Promise<Project> => {
    try {
      const updated = await dbUpdateProject(id, projectData);
      setProjects(prev => prev.map(p => (p.id === id ? updated : p)));
      return updated;
    } catch (e) {
      console.error('Failed to update project:', e);
      throw e;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await dbDeleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('Failed to delete project:', e);
      throw e;
    }
  };

  const addTask = async (projectId: string, task: Partial<Task>) => {
    try {
      const created = await createTask(projectId, task);
      const mapped = mapDBTask(created as DBTask);
      setProjects(prev =>
        prev.map(p =>
          p.id === projectId
            ? { ...p, tasks: [...(p.tasks || []), mapped] }
            : p
        )
      );
    } catch (e) {
      console.error('Failed to add task:', e);
      throw e;
    }
  };

  const updateTask = async (id: string, task: Partial<Task>) => {
    try {
      const updated = await dbUpdateTask(id, task);
      const mapped = mapDBTask(updated as DBTask);
      setProjects(prev =>
        prev.map(p => ({
          ...p,
          tasks: (p.tasks || []).map(t => (t.id === id ? mapped : t)),
        }))
      );
    } catch (e) {
      console.error('Failed to update task:', e);
      throw e;
    }
  };

  const toggleTask = async (projectId: string, taskId: string) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        const task = (p.tasks || []).find(t => t.id === taskId);
        if (!task) return p;
        const newStatus = task.status === 'Done' ? 'Todo' : 'Done';
        // Optimistic update first
        dbUpdateTask(taskId, { status: newStatus }).catch(console.error);
        return {
          ...p,
          tasks: (p.tasks || []).map(t =>
            t.id === taskId ? { ...t, status: newStatus } : t
          ),
        };
      })
    );
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    try {
      await dbDeleteTask(taskId);
      setProjects(prev =>
        prev.map(p =>
          p.id === projectId
            ? { ...p, tasks: (p.tasks || []).filter(t => t.id !== taskId) }
            : p
        )
      );
    } catch (e) {
      console.error('Failed to delete task:', e);
      throw e;
    }
  };

  const addMember = async (projectId: string, partnerId: string) => {
    try {
      await updateProject(projectId, { partnerId } as Partial<Project>);
    } catch (e) {
      console.error('Failed to add member:', e);
      throw e;
    }
  };

  const removeMember = async (projectId: string, _partnerId: string) => {
    try {
      await updateProject(projectId, { partnerId: undefined } as Partial<Project>);
    } catch (e) {
      console.error('Failed to remove member:', e);
      throw e;
    }
  };

  const MAX_PROJECT_FILE_BYTES = 10 * 1024 * 1024;

  const addFile = async (projectId: string, file: File, displayName?: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('Not authenticated');

    if (file.size > MAX_PROJECT_FILE_BYTES) {
      throw new Error('File too large (max 10MB)');
    }

    const project = projects.find((p) => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const safeBase =
      file.name
        .replace(/[^\w.\- ()]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120) || 'file';
    const fileId = crypto.randomUUID();
    const objectPath = `${user.id}/${projectId}/files/${fileId}-${safeBase}`;

    const { error: uploadErr } = await supabase.storage
      .from('project-files')
      .upload(objectPath, file, { upsert: false, contentType: file.type || undefined });

    if (uploadErr) throw uploadErr;

    const { data: publicData } = supabase.storage.from('project-files').getPublicUrl(objectPath);
    const publicUrl = publicData.publicUrl;

    let sizeStr: string;
    if (file.size < 1024) {
      sizeStr = `${Math.max(1, file.size)} B`;
    } else if (file.size < 1024 * 1024) {
      sizeStr = `${Math.max(1, Math.round(file.size / 1024))} KB`;
    } else {
      sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    }

    const resolvedName = (displayName?.trim() || file.name).trim() || file.name;

    const newEntry: ProjectFile = {
      id: fileId,
      name: resolvedName,
      size: sizeStr,
      type: file.type || 'application/octet-stream',
      url: publicUrl,
      storagePath: objectPath,
    };

    const nextFiles = [...(project.files || []), newEntry];
    const updated = await dbUpdateProject(projectId, { files: nextFiles });
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
  };

  const deleteFile = async (projectId: string, fileId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const file = (project.files || []).find((f) => f.id === fileId);
    if (!file) return;

    if (file.storagePath) {
      const { error: removeErr } = await supabase.storage.from('project-files').remove([file.storagePath]);
      if (removeErr) console.error('Storage remove failed:', removeErr);
    }

    const nextFiles = (project.files || []).filter((f) => f.id !== fileId);
    const updated = await dbUpdateProject(projectId, { files: nextFiles });
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
  };

  const addPlanItem = async (item: PlanItem) => {
    try {
      const created = await dbCreatePlanItem(item);
      setPlanItems(prev => [created, ...prev]);
    } catch (e) {
      console.error('Failed to add plan item:', e);
      throw e;
    }
  };

  const updatePlanItem = async (item: PlanItem) => {
    try {
      const updated = await dbUpdatePlanItem(item.id, item);
      setPlanItems(prev => prev.map(p => (p.id === item.id ? updated : p)));
    } catch (e) {
      console.error('Failed to update plan item:', e);
      throw e;
    }
  };

  const deletePlanItem = async (id: string) => {
    try {
      await dbDeletePlanItem(id);
      setPlanItems(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('Failed to delete plan item:', e);
      throw e;
    }
  };

  const addNote = async (noteData: Partial<Note>) => {
    try {
      const created = await dbCreateNote(noteData);
      setNotes(prev => [created, ...prev]);
    } catch (e) {
      console.error('Failed to add note:', e);
      throw e;
    }
  };

  const updateNote = async (id: string, noteData: Partial<Note>) => {
    try {
      const updated = await dbUpdateNote(id, noteData);
      setNotes(prev => prev.map(n => (n.id === id ? updated : n)));
    } catch (e) {
      const err = e as { message?: string; details?: string; hint?: string; code?: string };
      console.error('Failed to update note:', err.message, err.details ?? '', err.hint ?? '', err.code ?? '', e);
      throw e;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await dbDeleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('Failed to delete note:', e);
      throw e;
    }
  };

  const reorderNotes = async (orderedIds: string[]) => {
    try {
      await dbReorderNotes(orderedIds);
      setNotes(prev => {
        const byId = new Map<string, Note>(prev.map(n => [n.id, n]));
        const next: Note[] = [];
        for (let i = 0; i < orderedIds.length; i++) {
          const n = byId.get(orderedIds[i]);
          if (!n) return prev;
          next.push({ ...n, sortOrder: i });
        }
        return next;
      });
    } catch (e) {
      console.error('Failed to reorder notes:', e);
      throw e;
    }
  };

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        partners,
        planItems,
        notes,
        isLoading,
        error,
        refreshAll,
        updatePartner,
        addPartner,
        deletePartner,
        addProject,
        updateProject,
        deleteProject,
        addTask,
        updateTask,
        toggleTask,
        deleteTask,
        addMember,
        removeMember,
        addFile,
        deleteFile,
        addPlanItem,
        updatePlanItem,
        deletePlanItem,
        addNote,
        updateNote,
        deleteNote,
        reorderNotes,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}
