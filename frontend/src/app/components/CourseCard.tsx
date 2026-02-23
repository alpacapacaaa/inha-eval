import { Link } from 'react-router';
import { Star } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Course } from '../types/types';

interface CourseCardProps {
  course: Course;
  showPreview?: boolean;
  previewText?: string;
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

export function CourseCard({ course, showPreview = false, previewText }: CourseCardProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(course.rating));

  return (
    <Link to={`/course/${course.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{course.name}</h3>
              <p className="text-sm text-gray-600">
                {course.professor} | {course.department}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
              <span className="font-medium">{course.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">평가 {course.reviewCount}개</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">난이도 {difficultyLabel[course.difficulty]}</Badge>
              <Badge variant="secondary">학습량 {workloadLabel[course.workload]}</Badge>
            </div>

            {showPreview && previewText && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {previewText}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
