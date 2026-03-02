export interface Course {
  id: string;
  name: string;
  professor: string;
  department: string;
  rating: number;
  reviewCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  workload: 'light' | 'medium' | 'heavy';
  attendance: 'strict' | 'medium' | 'flexible';
  grading: 'generous' | 'medium' | 'strict';
}

export interface Review {
  id: string;
  courseId: string;
  courseName: string;
  professorName: string;
  semester: string;
  rating: number;
  difficulty: 'easy' | 'medium' | 'hard';
  workload: 'light' | 'medium' | 'heavy';
  attendance: 'strict' | 'medium' | 'flexible';
  grading: 'generous' | 'medium' | 'strict';
  content: string;
  likes: number;
  createdAt: Date;
  isAnonymous: boolean;

  // Premium / Extended fields
  examTypes?: string[];
  assignmentType?: string;
  textbook?: string;
  oneLineTip?: string;
  recommendFor?: string[];
  notRecommendFor?: string[];
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  department: string;
  points: number;
  hasPass: boolean;
  passExpiryDate?: Date;
}

export interface PointHistory {
  id: string;
  date: Date;
  description: string;
  points: number;
}
