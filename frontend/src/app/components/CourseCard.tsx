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

// "핵심교양-2.역사, 사상, 문화" -> "핵심교양 2영역" 포맷 변환
const formatArea = (type: string) => {
  if (type.includes('핵심교양-')) {
    const num = type.split('-')[1].split('.')[0];
    return `핵심교양 ${num}영역`;
  }
  if (type.includes('일반교양-')) {
    const num = type.split('-')[1].split('.')[0];
    return `일반교양 ${num}영역`;
  }
  return type;
};

export function CourseCard({ course, showPreview = false, previewText }: CourseCardProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(course.rating));

  return (
    <Link to={`/course/${course.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-lg text-slate-800 tracking-tight">{course.name}</h3>
              <p className="text-[13px] text-slate-500 mt-0.5 font-medium">
                {formatArea(course.type)} | {course.professor} | {course.department}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {stars.map((filled, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
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
