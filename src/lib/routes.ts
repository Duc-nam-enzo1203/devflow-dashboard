import { slugifyProjectName } from './slug';
import type { Project } from '../types';

/** Base path for the authenticated app (everything behind login). */
export const APP_BASE = '/app';

/** Path segment for project detail URL: `/projects/suzuki` */
export function projectDetailSegment(project: Pick<Project, 'id' | 'slug' | 'name'>): string {
  const s = project.slug?.trim();
  if (s) return s;
  return slugifyProjectName(project.name) || project.id;
}

export function projectDetailPath(project: Pick<Project, 'id' | 'slug' | 'name'>): string {
  return `/projects/${projectDetailSegment(project)}`;
}

export function appPath(path: string): string {
  if (path === '/' || path === '') return APP_BASE;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE}${normalized}`;
}
