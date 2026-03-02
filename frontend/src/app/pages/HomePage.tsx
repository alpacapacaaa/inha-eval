import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { CourseCard } from '../components/CourseCard';
import { courseService, reviewService } from '../api/api';
import { Course } from '../types/types';

interface CourseWithReview extends Course {
  latestReviewContent?: string;
}

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCourses, setRecentCourses] = useState<CourseWithReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const courses = await courseService.getAllCourses();
        const recent = courses.slice(0, 3);

        const coursesWithReviews = await Promise.all(
          recent.map(async (course) => {
            const reviews = await reviewService.getReviewsByCourseId(course.id);
            // Sort by date ideally, but mockReviews are static list. 
            // Assuming first one is latest or just pick one.
            const latestReview = reviews.length > 0 ? reviews[0].content : undefined;
            return { ...course, latestReviewContent: latestReview };
          })
        );

        setRecentCourses(coursesWithReviews);
      } catch (error) {
        console.error('Failed to fetch courses', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            인하대 강의평가,
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

      {/* Recent Reviews Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">최근 등록된 강의평가</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                showPreview
                previewText={course.latestReviewContent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
