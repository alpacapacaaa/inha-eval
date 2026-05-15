import { Course, CourseStats } from '../../types/models';
import { apiRequest } from './client';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30분

let coursesCache: Course[] | null = null;
let cacheTimestamp: number | null = null;

export async function getAllCourses(): Promise<Course[]> {
  if (coursesCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return coursesCache;
  }
  const data = await apiRequest<Course[]>('/api/courses');
  coursesCache = data;
  cacheTimestamp = Date.now();
  return data;
}

export function searchCourses(query: string, department?: string) {
  const params = new URLSearchParams();
  params.set('query', query);

  if (department && department.trim()) {
    params.set('department', department.trim());
  }

  return apiRequest<Course[]>(`/api/courses/search?${params.toString()}`);
}

export function getCourseById(courseId: number) {
  return apiRequest<Course>(`/api/courses/${courseId}`);
}

export function getFamousCourses() {
  return apiRequest<Course[]>('/api/courses/famous');
}

export function getHoneyGeCourses() {
  return apiRequest<Course[]>('/api/courses/honey-ge');
}

export function getVerifiedCourses() {
  return apiRequest<Course[]>('/api/courses/verified');
}

export function getGrowthCourses() {
  return apiRequest<Course[]>('/api/courses/growth');
}

export function getCourseStats(courseId: number) {
  return apiRequest<CourseStats>(`/api/courses/${courseId}/stats`);
}

export async function getDepartments(): Promise<string[]> {
  const courses = await getAllCourses();
  const unique = [...new Set(courses.map((c) => c.department).filter(Boolean))];
  return unique.sort((a, b) => a.localeCompare(b, 'ko'));
}
