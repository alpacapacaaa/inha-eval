import { Star, ThumbsUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Review } from '../types/types';

interface ReviewCardProps {
  review: Review;
}

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

const gradingLabel = {
  generous: '잘줌',
  medium: '보통',
  strict: '짜게줌',
};

export function ReviewCard({ review }: ReviewCardProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">익명</span>
                <span className="text-sm text-gray-400">·</span>
                <span className="text-sm text-gray-600">{review.semester}</span>
              </div>
            </div>
            <div className="flex items-center">
              {stars.map((filled, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">난이도 {difficultyLabel[review.difficulty]}</Badge>
            <Badge variant="outline">학습량 {workloadLabel[review.workload]}</Badge>
            <Badge variant="outline">출석 {attendanceLabel[review.attendance]}</Badge>
            <Badge variant="outline">성적 {gradingLabel[review.grading]}</Badge>
          </div>

          <p className="text-sm text-gray-700">{review.content}</p>

          <div className="flex items-center gap-1 text-gray-500">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm">추천 {review.likes}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
