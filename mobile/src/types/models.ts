export interface User {
  email: string;
  nickname: string;
  department?: string;
  points: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  nickname: string;
  department?: string;
  points: number;
}

export interface Course {
  id: number;
  name: string;
  professor: string;
  department: string;
  credits?: number | null;
  semester?: string | null;
  rating: number;
  reviewCount: number;
  category: string;
  type: string;
  difficulty: string;
  workload: string;
  attendance: string;
  grading: string;
}

export interface Review {
  id: number;
  courseId: number;
  courseName: string;
  professorName: string;
  semester: string;
  rating: number;
  difficulty: string;
  workload: string;
  attendance: string;
  grading: string;
  content: string;
  likes: number;
  createdAt: string;
  isAnonymous: boolean;
  examTypes?: string[];
  assignmentType?: string;
  textbook?: string;
  oneLineTip?: string;
  examInfo?: string;
  examKeywords?: string[];
  recommendFor?: string[];
  notRecommendFor?: string[];
  diffScore?: number | null;
  teachingScore?: number | null;
  gradScore?: number | null;
  workScore?: number | null;
  prerequisiteScore?: number | null;
  depthScore?: number | null;
  timeInvestScore?: number | null;
  attScore?: number | null;
  pastExamScore?: number | null;
}

export interface CourseStats {
  diffScore: number | null;
  diffScoreCount: number;
  gradScore: number | null;
  gradScoreCount: number;
  workScore: number | null;
  workScoreCount: number;
  teachingScore: number | null;
  teachingScoreCount: number;
  attScore: number | null;
  attScoreCount: number;
  pastExamScore: number | null;
  pastExamScoreCount: number;
}

export interface InquiryItem {
  id: number;
  category: string;
  title: string;
  content: string;
  status: string;
  answer: string | null;
  createdAt: string;
}

export interface NoticeItem {
  id: number;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;
}

export interface PointHistoryItem {
  id: number;
  date: string;
  description: string;
  points: number;
}
