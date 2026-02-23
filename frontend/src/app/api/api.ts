import { Course, Review, User, PointHistory } from '../types/types';
import { mockCourses, mockReviews, mockUser, mockPointHistory } from '../data/mockData';

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory storage for the session (so updates work locally)
let courses = [...mockCourses];
let reviews = [...mockReviews];
let currentUser = { ...mockUser };
let pointHistory = [...mockPointHistory];

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
        // Semester filtering might need to check if the course was offered in that semester
        // For now, mockCourses doesn't have a semester field (it's in reviews).
        // We'll ignore semester filtering on courses for this mock or assume all courses are available.
    );
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

  login: async (email: string): Promise<User> => {
    await delay(500);
    // Simple mock login
    localStorage.setItem('auth_token', 'mock-token');
    return currentUser;
  },

  logout: async (): Promise<void> => {
    await delay(200);
    localStorage.removeItem('auth_token');
  },

  signup: async (user: Partial<User>): Promise<User> => {
    await delay(800);
    return {
      ...mockUser,
      ...user,
      id: Math.random().toString(36).substr(2, 9),
    } as User;
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
  }
};
