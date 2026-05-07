import { Course } from '../../types/models';
import { apiRequest } from './client';

export function getAllCourses() {
  return apiRequest<Course[]>('/api/courses');
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
