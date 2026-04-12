export interface CourseSlot {
  day: '월' | '화' | '수' | '목' | '금';
  startPeriod: number;
  endPeriod: number;
  location?: string | null;
}

export interface StructuredReviewSurvey {
  answers?: Record<string, number>;
  teamProject?: boolean;
  lab?: boolean;
  quiz?: boolean;
  prerequisiteDetails?: string;
  otherExamTypeDescription?: string;
}

export interface Course {
  id: string;
  name: string;
  professor: string;
  department: string;
  semester?: string;
  credits?: number;
  section?: string;
  rating: number;
  reviewCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  workload: 'light' | 'medium' | 'heavy';
  attendance: 'strict' | 'medium' | 'flexible';
  grading: 'generous' | 'medium' | 'strict';
  category: '전공' | '교양';
  type: string; // 전공필수, 전공선택, 핵심교양, 기초교양 등
  year?: number; // 1, 2, 3, 4학년
  slots?: CourseSlot[];
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
  badges?: string[];

  // Premium / Extended fields
  examTypes?: string[];
  assignmentType?: string;
  textbook?: string;
  oneLineTip?: string;
  examInfo?: string;
  examKeywords?: string[];
  examMidtermInfo?: string;
  examFinalInfo?: string;
  examAssignmentInfo?: string;
  examQuizInfo?: string;
  pastExamHelpfulness?: string;
  scopePredictability?: string;
  studyResources?: string[];
  problemStyles?: string[];
  examPrepTip?: string;
  structuredSurvey?: StructuredReviewSurvey;
  recommendFor?: string[];
  notRecommendFor?: string[];

  // Slider bar stats (1-5)
  diffScore?: number;
  gradScore?: number;
  workScore?: number;
  prerequisiteScore?: number;
  depthScore?: number;
  pastExamScore?: number;
}

export interface CreateReviewInput {
  courseId: string;
  semester: string;
  rating: number;
  difficulty: 'easy' | 'medium' | 'hard';
  workload: 'light' | 'medium' | 'heavy';
  attendance: 'strict' | 'medium' | 'flexible';
  grading: 'generous' | 'medium' | 'strict';
  content: string;
  isAnonymous: boolean;
  badges?: string[];
  examTypes?: string[];
  assignmentType?: string;
  textbook?: string;
  oneLineTip?: string;
  examInfo?: string;
  examKeywords?: string[];
  examMidtermInfo?: string;
  examFinalInfo?: string;
  examAssignmentInfo?: string;
  examQuizInfo?: string;
  pastExamHelpfulness?: string;
  scopePredictability?: string;
  studyResources?: string[];
  problemStyles?: string[];
  examPrepTip?: string;
  structuredSurvey?: StructuredReviewSurvey;
  recommendFor?: string[];
  notRecommendFor?: string[];
  diffScore?: number;
  gradScore?: number;
  workScore?: number;
  prerequisiteScore?: number;
  depthScore?: number;
  pastExamScore?: number;
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

export interface Inquiry {
  id: string;
  category: string;
  title: string;
  content: string;
  status: '접수' | '답변완료';
  createdAt: Date;
  answer?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  isImportant: boolean;
}
