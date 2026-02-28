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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            인하대 재학생만 강의평가를 열람할 수 있습니다.<br />
            로그인하고 모든 강의의 생생한 리뷰를 확인하세요!
          </p>
          <div className="space-y-3">
            <Link to="/auth?mode=login" className="block w-full">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl text-lg transition-all shadow-md hover:shadow-lg">
                로그인 하러가기
              </Button>
            </Link>
            <Link to="/" className="block w-full">
              <Button variant="ghost" className="w-full text-gray-500 hover:text-gray-700 h-11 rounded-xl">
                메인으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 코스 정보가 없는 경우 에러 처리
  if (!course) {
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
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-100">
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
                      className={`w-6 h-6 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                        }`}
                    />
                  ))}
                </div>
                <span className="text-xl font-bold text-gray-800">{course.rating.toFixed(1)}점</span>
                <span className="text-gray-500">평가 {course.reviewCount}개</span>
              </div>

              <div className="flex gap-2 flex-wrap items-center pt-2">
                <Badge variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100">난이도 {difficultyLabel[course.difficulty]}</Badge>
                <Badge variant="secondary" className="px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100">학습량 {workloadLabel[course.workload]}</Badge>
                <Badge variant="secondary" className="px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100">출석 {attendanceLabel[course.attendance]}</Badge>

                <div className="ml-auto mt-4 sm:mt-0">
                  <Link to={`/review/write/${course.id}`}>
                    <Button className="font-semibold bg-indigo-600 hover:bg-indigo-700 h-10 px-5 rounded-lg">
                      <Plus className="w-5 h-5 mr-1" />
                      강의평 남기기
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Access Gate (Logged In, No Pass) */}
          {!user.hasPass && (
            <Card className="mb-6 border-indigo-200 bg-indigo-50/50 shadow-md">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2 text-gray-900">
                      상세 강의평가를 보려면 열람권이 필요합니다
                    </h3>
                    <p className="text-base text-gray-600 mb-6">
                      내 강의평을 1개 작성하면 모든 강의를 무료로 볼 수 있어요!<br className="hidden md:block" />
                      (현재 보유 포인트: <strong className="text-indigo-600">{user.points}P</strong>)
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                      <Button
                        onClick={handlePurchaseAccess}
                        disabled={user.points < 50}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 rounded-xl"
                      >
                        열람권 구매 (-50P)
                      </Button>
                      <Link to={`/review/write/${course.id}`}>
                        <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold h-11 px-6 rounded-xl w-full sm:w-auto">
                          강의평 1개 작성하고 포인트 받기
                        </Button>
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
