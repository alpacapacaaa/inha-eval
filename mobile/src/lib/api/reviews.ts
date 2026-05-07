import { Review } from '../../types/models';
import { apiRequest } from './client';

export function getReviewsByCourseId(courseId: number, sort = 'latest') {
  const params = new URLSearchParams();
  params.set('sort', sort);

  return apiRequest<Review[]>(`/api/reviews/course/${courseId}?${params.toString()}`);
}

export interface CreateReviewPayload {
  courseId: number;
  semester: string;
  rating: number;
  difficulty: string;
  workload: string;
  attendance: string;
  grading: string;
  content: string;
  isAnonymous: boolean;
  examKeywords?: string[];
  examTypes?: string[];
  assignmentType?: string;
  textbook?: string;
  oneLineTip?: string;
  examInfo?: string;
  recommendFor?: string[];
  notRecommendFor?: string[];
  diffScore?: number;
  teachingScore?: number;
  gradScore?: number;
  workScore?: number;
  prerequisiteScore?: number;
  depthScore?: number;
  timeInvestScore?: number;
  attScore?: number;
  pastExamScore?: number;
}

export function createReview(payload: CreateReviewPayload) {
  return apiRequest<number>('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMyReviews() {
  return apiRequest<Review[]>('/api/reviews/my');
}

export function deleteReview(reviewId: number) {
  return apiRequest<void>(`/api/reviews/${reviewId}`, {
    method: 'DELETE',
  });
}

export function toggleReviewLike(reviewId: number) {
  return apiRequest<void>(`/api/reviews/${reviewId}/like`, {
    method: 'POST',
  });
}
