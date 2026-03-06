import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Sparkles, Award, BookOpen } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { CourseCard } from '../components/CourseCard';
import { CourseCardSkeleton } from '../components/course/CourseSkeleton';
import { courseService, reviewService, userService } from '../api/api';
import { Course, User } from '../types/types';

interface CourseWithReview extends Course {
  latestReviewContent?: string;
}

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCourses, setRecentCourses] = useState<CourseWithReview[]>([]);
  const [honeyGECourses, setHoneyGECourses] = useState<Course[]>([]);
  const [majorCourses, setMajorCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allCourses, userData] = await Promise.all([
          courseService.getAllCourses(),
          userService.getCurrentUser()
        ]);
        setUser(userData);

        // 1. Recent Courses with previews
        const recent = allCourses.slice(0, 3);
        const coursesWithReviews = await Promise.all(
          recent.map(async (course) => {
            const reviews = await reviewService.getReviewsByCourseId(course.id);
            const latestReview = reviews.length > 0 ? reviews[0].content : undefined;
            return { ...course, latestReviewContent: latestReview };
          })
        );
        setRecentCourses(coursesWithReviews);

        // 2. Honey GE Courses
        const honeyGE = await courseService.getHoneyGE();
        setHoneyGECourses(honeyGE);

        // 3. Department Courses (using user's dept or fallback)
        const myDept = userData?.department || '컴퓨터공학과';
        const departmentRecs = await courseService.getMajorRecommended(myDept);
        setMajorCourses(departmentRecs);

      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            인하대 강의평가
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            수강신청 전에 미리 확인하세요.
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="강의명 or 교수명 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="px-8">
                검색
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-16 mt-16">
        {/* Recent Reviews Section */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">최근 등록된 강의평가</h2>
            <p className="text-sm text-gray-400 font-medium">지금 선배들이 작성한 따끈따끈한 리뷰</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              [1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)
            ) : (
              recentCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  showPreview
                  previewText={course.latestReviewContent}
                />
              ))
            )}
          </div>
        </section>

        {/* Honey GE Section */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">학점 보장! 꿀 교양 추천</h2>
            <p className="text-sm text-gray-400 font-medium">성적 잘 나오고 내용도 알찬 핵심 교양 모음</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              [1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)
            ) : (
              honeyGECourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))
            )}
          </div>
        </section>

        {/* Major Recommended Section */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              <span className="text-indigo-600">{user?.department || '컴퓨터공학과'}</span> 선배들의 추천
            </h2>
            <p className="text-sm text-gray-400 font-medium">우리 전공에서 꼭 들어야 할 갓전공 강의들</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              [1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)
            ) : (
              majorCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
