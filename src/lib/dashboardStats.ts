import type { Project, ProjectStatus, Task } from '../types';

/** Trạng thái được tính là “dự án đang chạy” trên dashboard (không gồm tạm dừng / xong / hủy). */
const RUNNING_PROJECT_STATUSES: readonly ProjectStatus[] = [
  'Planning',
  'In Progress',
  'Review',
  'Maintenance',
];

function isTaskPending(t: Task): boolean {
  return t.status !== 'Done';
}

export function countRunningProjects(projects: Project[]): number {
  return projects.filter((p) => RUNNING_PROJECT_STATUSES.includes(p.status)).length;
}

export function countCompletedProjects(projects: Project[]): number {
  return projects.filter((p) => p.status === 'Completed').length;
}

export function countPendingTasks(projects: Project[]): number {
  return projects.reduce((acc, p) => {
    const tasks = p.tasks ?? [];
    return acc + tasks.filter(isTaskPending).length;
  }, 0);
}

export function sumProjectAmounts(projects: Project[]): number {
  return projects.reduce((acc, p) => {
    const n = typeof p.amount === 'number' && Number.isFinite(p.amount) ? p.amount : 0;
    return acc + n;
  }, 0);
}
