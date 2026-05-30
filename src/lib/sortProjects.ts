import type { Project } from '../types';

export type ProjectSortKey =
  | 'created_desc'
  | 'created_asc'
  | 'deadline_asc'
  | 'deadline_desc'
  | 'name_asc'
  | 'name_desc'
  | 'progress_desc'
  | 'amount_desc';

export const PROJECT_SORT_STORAGE_KEY = 'devflow_projects_sort';

export const PROJECT_SORT_OPTIONS: { value: ProjectSortKey; tkey: string }[] = [
  { value: 'created_desc', tkey: 'projects_sort_created_desc' },
  { value: 'created_asc', tkey: 'projects_sort_created_asc' },
  { value: 'deadline_asc', tkey: 'projects_sort_deadline_asc' },
  { value: 'deadline_desc', tkey: 'projects_sort_deadline_desc' },
  { value: 'name_asc', tkey: 'projects_sort_name_asc' },
  { value: 'name_desc', tkey: 'projects_sort_name_desc' },
  { value: 'progress_desc', tkey: 'projects_sort_progress_desc' },
  { value: 'amount_desc', tkey: 'projects_sort_amount_desc' },
];

const SORT_VALUES = new Set<string>(PROJECT_SORT_OPTIONS.map((o) => o.value));

export function parseStoredProjectSort(raw: string | null): ProjectSortKey {
  if (raw && SORT_VALUES.has(raw)) return raw as ProjectSortKey;
  return 'created_desc';
}

function time(s: string): number {
  const n = new Date(s).getTime();
  return Number.isFinite(n) ? n : 0;
}

/** Stable tie-break: newer created first when primary keys equal. */
function tieCreatedDesc(a: Project, b: Project): number {
  return time(b.createdAt) - time(a.createdAt);
}

export function sortProjectsBy(list: Project[], sort: ProjectSortKey): Project[] {
  const arr = [...list];
  arr.sort((a, b) => {
    switch (sort) {
      case 'created_desc':
        return time(b.createdAt) - time(a.createdAt);
      case 'created_asc':
        return time(a.createdAt) - time(b.createdAt);
      case 'deadline_asc':
        return time(a.deadline) - time(b.deadline) || tieCreatedDesc(a, b);
      case 'deadline_desc':
        return time(b.deadline) - time(a.deadline) || tieCreatedDesc(a, b);
      case 'name_asc':
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || tieCreatedDesc(a, b);
      case 'name_desc':
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }) || tieCreatedDesc(a, b);
      case 'progress_desc':
        return b.progress - a.progress || tieCreatedDesc(a, b);
      case 'amount_desc':
        return b.amount - a.amount || tieCreatedDesc(a, b);
      default:
        return tieCreatedDesc(a, b);
    }
  });
  return arr;
}
