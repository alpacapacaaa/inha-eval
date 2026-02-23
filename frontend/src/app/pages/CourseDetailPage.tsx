import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Star, Lock, Plus, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { ReviewCard } from '../components/ReviewCard';
import { courseService, reviewService, userService } from '../api/api';
import { Course, Review, User } from '../types/types';
import { toast } from 'sonner';

const difficultyLabel = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

const workloadLabel = {
  light: '적음',
  medium: '보통',
  heavy: '많음',
};

const attendanceLabel = {
  strict: '엄격',
  medium: '보통',
  flexible: '자유',
};

export function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [fetchedCourse, fetchedReviews, fetchedUser] = await Promise.all([
          courseService.getCourseById(id),
          reviewService.getReviewsByCourseId(id),
          userService.getCurrentUser(),
        ]);
        setCourse(fetchedCourse || null);
        setReviews(fetchedReviews);
        setUser(fetchedUser);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!course || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">강의를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(course.rating));

  const handlePurchaseAccess = async () => {
    try {
      const updatedUser = await userService.purchasePass();
      setUser(updatedUser);
      toast.success('열람권을 구매했습니다!');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('열람권 구매에 실패했습니다.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Course Header */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {course.name}
                </h1>
                <p className="text-lg text-gray-600">
                  {course.professor} · {course.department}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  {stars.map((filled, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xl font-semibold">{course.rating.toFixed(1)}점</span>
                <span className="text-gray-500">평가 {course.reviewCount}개</span>
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                <Badge variant="secondary">난이도 {difficultyLabel[course.difficulty]}</Badge>
                <Badge variant="secondary">학습량 {workloadLabel[course.workload]}</Badge>
                <Badge variant="secondary">출석 {attendanceLabel[course.attendance]}</Badge>

                <div className="ml-auto">
                  <Link to={`/review/write/${course.id}`}>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      평가 작성
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Access Gate */}
          {!user.hasPass && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Lock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      강의평가를 보려면 열람권이 필요합니다
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">
                      현재 내 포인트: {user.points}P
                    </p>
                    <div className="flex gap-3">
                      <Button onClick={handlePurchaseAccess} disabled={user.points < 50}>
                        열람권 구매 (-50P)
                      </Button>
                      <Link to={`/review/write/${course.id}`}>
                        <Button variant="outline">강의평 작성하고 포인트 받기</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {user.hasPass && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">강의평가</h2>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}

              {reviews.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-500">아직 등록된 강의평가가 없습니다.</p>
                    <Link to={`/review/write/${course.id}`}>
                      <Button className="mt-4">첫 번째 평가 작성하기</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
