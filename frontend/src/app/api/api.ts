import { Course, Review, User, PointHistory, Inquiry, Notice } from '../types/types';
import { mockCourses, mockReviews, mockUser, mockPointHistory, mockNotices, mockInquiries } from '../data/mockData';

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory storage for the session (so updates work locally)
let courses = [...mockCourses];
let reviews = [...mockReviews];
let currentUser = { ...mockUser };
let pointHistory = [...mockPointHistory];
let inquiries = [...mockInquiries];
let notices = [...mockNotices];

export const courseService = {
  getAllCourses: async (): Promise<Course[]> => {
    await delay(300);
    return courses;
  },

  getCourseById: async (id: string): Promise<Course | undefined> => {
    await delay(200);
    return courses.find((c) => c.id === id);
  },

  searchCourses: async (query: string, department?: string, semester?: string): Promise<Course[]> => {
    await delay(300);
    const lowerQuery = query.toLowerCase();
    return courses.filter(
      (c) =>
        (c.name.toLowerCase().includes(lowerQuery) ||
          c.professor.toLowerCase().includes(lowerQuery) ||
          c.department.toLowerCase().includes(lowerQuery)) &&
        (!department || department === '전체' || c.department === department)
    );
  },

  getHoneyGE: async (): Promise<Course[]> => {
    await delay(300);
    return courses
      .filter((c) => c.category === '교양' && (c.difficulty === 'easy' || c.rating >= 4.0))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  },

  getMajorRecommended: async (department: string): Promise<Course[]> => {
    await delay(300);
    return courses
      .filter((c) => c.department === department && c.category === '전공')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  },
};

export const reviewService = {
  getReviewsByCourseId: async (courseId: string): Promise<Review[]> => {
    await delay(300);
    return reviews.filter((r) => r.courseId === courseId);
  },

  getReviewsByUserId: async (userId: string): Promise<Review[]> => {
    await delay(300);
    // Since mock reviews don't have userId, we'll assume the current user is the author of all of them for now
    // or better, just return a subset or add userId to mock reviews. 
    // The current mockReviews don't have userId. I should probably add it or filter assuming ownership.
    // For now, let's just return all reviews as if the user wrote them (or the first few).
    // Actually, looking at mockReviews, they don't have author ID.
    // Let's just return the first 3 for demo purposes, as MyPage used slice(0, 3).
    return reviews.slice(0, 3);
  },

  createReview: async (review: Omit<Review, 'id' | 'createdAt' | 'likes' | 'courseName' | 'professorName'>): Promise<Review> => {
    await delay(500);
    const course = courses.find(c => c.id === review.courseId);

    const newReview: Review = {
      ...review,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      likes: 0,
      courseName: course?.name || '',
      professorName: course?.professor || '',
    };

    reviews = [newReview, ...reviews];

    // Update course stats
    if (course) {
      const courseReviews = reviews.filter(r => r.courseId === review.courseId);
      const avgRating = courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length;

      const updatedCourse = {
        ...course,
        reviewCount: courseReviews.length,
        rating: avgRating
      };

      courses = courses.map(c => c.id === course.id ? updatedCourse : c);
    }

    return newReview;
  },
};

export const userService = {
  getCurrentUser: async (): Promise<User | null> => {
    await delay(200);
    // Check if user is logged in (mock)
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    return currentUser;
  },

  login: async (email: string, password?: string): Promise<User> => {
    await delay(500);
    // Simple mock logic
    if (email === 'fail@inha.ac.kr') {
      throw new Error('존재하지 않는 이메일입니다.');
    }
    if (password === 'wrong') {
      throw new Error('비밀번호가 틀렸습니다.');
    }
    localStorage.setItem('auth_token', 'mock-token');
    return currentUser;
  },

  logout: async (): Promise<void> => {
    await delay(200);
    localStorage.removeItem('auth_token');
  },

  signup: async (user: Partial<User>): Promise<User> => {
    await delay(800);
    const newUser = {
      ...mockUser,
      ...user,
      id: Math.random().toString(36).substr(2, 9),
    } as User;
    // Update current user for the session
    currentUser = newUser;
    localStorage.setItem('auth_token', 'mock-token');
    return newUser;
  },

  sendVerificationEmail: async (email: string): Promise<void> => {
    await delay(600);
    if (!email.endsWith('@inha.ac.kr')) {
      throw new Error('인하대 이메일(@inha.ac.kr) 형식이 아닙니다.');
    }
    console.log(`Verification email sent to ${email} (Code: 123456)`);
    // Success
  },

  verifyEmailCode: async (email: string, code: string): Promise<boolean> => {
    await delay(400);
    if (code === '123456') return true;
    throw new Error('인증코드가 일치하지 않습니다.');
  },

  sendVerificationPhone: async (phone: string): Promise<void> => {
    await delay(600);
    console.log(`Verification SMS sent to ${phone} (Code: 111111)`);
    // Success
  },

  verifyPhoneCode: async (phone: string, code: string): Promise<boolean> => {
    await delay(400);
    if (code === '111111') return true;
    throw new Error('인증코드가 일치하지 않습니다.');
  },

  findPassword: async (email: string, phone: string): Promise<void> => {
    await delay(600);
    if (email !== mockUser.email || (phone !== '01012345678' && phone !== '010-1234-5678')) {
      throw new Error('일치하는 회원 정보가 없습니다.');
    }
    // Success
  },

  resetPassword: async (email: string, newPassword: string): Promise<void> => {
    await delay(600);
    console.log(`Password reset for ${email} to ${newPassword}`);
    // Update mock current user password (conceptually)
    // Success
  },

  purchasePass: async (): Promise<User> => {
    await delay(400);
    if (currentUser.points < 50) {
      throw new Error('포인트가 부족합니다.');
    }

    currentUser = {
      ...currentUser,
      points: currentUser.points - 50,
      hasPass: true,
      passExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    // Add history
    const history: PointHistory = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date(),
      description: '열람권 구매',
      points: -50,
    };
    pointHistory = [history, ...pointHistory];

    return currentUser;
  },

  addPoints: async (amount: number, description: string): Promise<User> => {
    await delay(300);
    currentUser = {
      ...currentUser,
      points: currentUser.points + amount,
    };

    const history: PointHistory = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date(),
      description: description,
      points: amount,
    };
    pointHistory = [history, ...pointHistory];

    return currentUser;
  },

  getPointHistory: async (): Promise<PointHistory[]> => {
    await delay(300);
    return pointHistory;
  },

  updateProfile: async (data: { nickname?: string; department?: string }): Promise<User> => {
    await delay(400);
    currentUser = {
      ...currentUser,
      ...(data.nickname && { nickname: data.nickname }),
      ...(data.department && { department: data.department }),
    };
    return currentUser;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await delay(500);
    if (currentPassword === 'wrong') {
      throw new Error('현재 비밀번호가 틀렸습니다.');
    }
    if (newPassword.length < 4) {
      throw new Error('새 비밀번호는 4자리 이상이어야 합니다.');
    }
    console.log(`Password changed to ${newPassword}`);
  },

  changePhone: async (newPhone: string, verificationCode: string): Promise<User> => {
    await delay(400);
    if (verificationCode !== '111111') {
      throw new Error('인증코드가 일치하지 않습니다.');
    }
    // Phone is stored conceptually (not in User type currently, but we accept it)
    console.log(`Phone changed to ${newPhone}`);
    return currentUser;
  },

  deleteAccount: async (password: string): Promise<void> => {
    await delay(600);
    if (password === 'wrong') {
      throw new Error('비밀번호가 틀렸습니다.');
    }
    localStorage.removeItem('auth_token');
    // Reset to initial state
    currentUser = { ...mockUser };
  },

  // --- Inquiry & Notice ---
  submitInquiry: async (data: { category: string; title: string; content: string }): Promise<Inquiry> => {
    await delay(500);
    const newInquiry: Inquiry = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      status: '접수',
      createdAt: new Date(),
    };
    inquiries = [newInquiry, ...inquiries];
    return newInquiry;
  },

  getMyInquiries: async (): Promise<Inquiry[]> => {
    await delay(300);
    return inquiries;
  },

  getNotices: async (): Promise<Notice[]> => {
    await delay(300);
    return notices;
  },
};
