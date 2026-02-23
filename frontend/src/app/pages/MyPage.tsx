import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Star, Coins, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { userService, reviewService } from '../api/api';
import { User, Review, PointHistory } from '../types/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

export function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedUser, fetchedHistory, fetchedReviews] = await Promise.all([
          userService.getCurrentUser(),
          userService.getPointHistory(),
          reviewService.getReviewsByUserId('current-user'),
        ]);
        setUser(fetchedUser);
        setPointHistory(fetchedHistory);
        setUserReviews(fetchedReviews);
      } catch (error) {
        console.error('Failed to fetch user data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePurchasePass = async () => {
    try {
      const updatedUser = await userService.purchasePass();
      setUser(updatedUser);
      toast.success('열람권을 구매했습니다!');
      
      // Update history as well since purchase adds a history item
      const updatedHistory = await userService.getPointHistory();
      setPointHistory(updatedHistory);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('열람권 구매에 실패했습니다.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!user) return null;

  const formatDate = (date: Date) => {
    return format(date, 'yyyy.MM.dd', { locale: ko });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* User Info */}
          <div className="bg-white rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              안녕하세요, {user.nickname}님 👋
            </h1>
            <p className="text-gray-600">{user.department}</p>
          </div>

          {/* Points and Pass Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Coins className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">현재 포인트</p>
                    <p className="text-2xl font-bold">{user.points}P</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">열람권 상태</p>
                    <p className="text-lg font-semibold text-green-600">
                      {user.hasPass && user.passExpiryDate
                        ? `~${formatDate(user.passExpiryDate)}`
                        : '미보유'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {!user.hasPass && (
            <Card>
              <CardContent className="p-6">
                <Button 
                  className="w-full" 
                  disabled={user.points < 50}
                  onClick={handlePurchasePass}
                >
                  열람권 구매 -50P
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Point History */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">포인트 내역</h2>
            <div className="space-y-3">
              {pointHistory.map((history) => (
                <div key={history.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm text-gray-500">{formatDate(history.date)}</p>
                    <p className="font-medium">{history.description}</p>
                  </div>
                  <p className={`font-semibold ${history.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {history.points > 0 ? '+' : ''}{history.points}P
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* User Reviews */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              내가 쓴 강의평 ({userReviews.length}개)
            </h2>
            <div className="space-y-3">
              {userReviews.map((review) => (
                <Link key={review.id} to={`/course/${review.courseId}`}>
                  <div className="flex items-center justify-between py-3 hover:bg-gray-50 rounded px-2 -mx-2 transition-colors border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">
                        {review.courseName} · {review.professorName}
                      </p>
                      <p className="text-sm text-gray-500">{review.semester}</p>
                    </div>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </Link>
              ))}

              {userReviews.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  아직 작성한 강의평이 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
