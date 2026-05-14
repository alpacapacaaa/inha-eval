export interface User {
  email: string;
  nickname: string;
  department?: string;
  phoneNumber?: string;
  points: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  nickname: string;
  department?: string;
  phoneNumber?: string;
  points: number;
}

export interface Course {
  id: number;
  name: string;
  professor: string;
  department: string;
  credits?: number | null;
  section?: string | null;
  semester?: string | null;
  slots?: Array<{
    day: '월' | '화' | '수' | '목' | '금';
    startPeriod: number;
    endPeriod: number;
    location: string;
  }>;
  rating: number;
  reviewCount: number;
  category: string;
  type: string;
  difficulty: string;
  workload: string;
  attendance: string;
  grading: string;
  generalArea?: string | null;
  evaluationType?: string | null;
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
  likedByMe?: boolean;
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
  badges?: string[];
  examMidtermInfo?: string;
  examFinalInfo?: string;
  examAssignmentInfo?: string;
  examQuizInfo?: string;
  pastExamHelpfulness?: string;
  scopePredictability?: string;
  studyResources?: string[];
  problemStyles?: string[];
  examPrepTip?: string;
  diffScore?: number | null;
  gradScore?: number | null;
  workScore?: number | null;
  prerequisiteScore?: number | null;
  depthScore?: number | null;
  pastExamScore?: number | null;
}

export interface CourseStats {
  diffScore: number | null;
  diffScoreCount: number;
  gradScore: number | null;
  gradScoreCount: number;
  workScore: number | null;
  workScoreCount: number;
  prerequisiteScore: number | null;
  prerequisiteScoreCount: number;
  depthScore: number | null;
  depthScoreCount: number;
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
