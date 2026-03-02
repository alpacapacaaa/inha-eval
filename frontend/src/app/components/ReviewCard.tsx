import { useState } from 'react';
import { Star, ThumbsUp, Sparkles, AlertCircle, BookOpen, PenTool, ChevronDown, ChevronUp, Award } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);

  // Check if review has any extended fields
  const hasExtendedInfo = !!(
    review.oneLineTip ||
    (review.examTypes && review.examTypes.length > 0) ||
    review.assignmentType ||
    review.textbook ||
    (review.recommendFor && review.recommendFor.length > 0) ||
    (review.notRecommendFor && review.notRecommendFor.length > 0)
  );

  // 알고리즘: 글자 수가 100자 이상이거나, 상세 선택항목(hasExtendedInfo)이 작성되었을 경우 우수 강의평으로 선정
  const isHighQuality = review.content.length > 100 || hasExtendedInfo;

  return (
    <Card
      className={`transition-all duration-300 border-gray-100 shadow-sm ${hasExtendedInfo ? 'cursor-pointer hover:border-indigo-200 hover:shadow-md' : ''}`}
      onClick={() => hasExtendedInfo && setIsExpanded(!isExpanded)}
    >
      <CardContent className="p-5 md:p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{review.isAnonymous ? '익명' : '작성자'}</span>
                <span className="text-gray-300 text-xs">|</span>
                <span className="text-sm text-gray-500">{review.semester}</span>
              </div>
              {review.oneLineTip && (
                <div className="flex items-center gap-1.5 mt-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full w-max border border-blue-100">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{review.oneLineTip}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center">
                {stars.map((filled, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 md:w-5 md:h-5 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'
                      }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400 opacity-80">
                {review.createdAt.toLocaleDateString()}
              </span>
            </div>
          </div>

          {!isExpanded && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 font-normal">난이도 <strong className="ml-1 text-gray-800">{difficultyLabel[review.difficulty]}</strong></Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 font-normal">학습량 <strong className="ml-1 text-gray-800">{workloadLabel[review.workload]}</strong></Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 font-normal">출석 <strong className="ml-1 text-gray-800">{attendanceLabel[review.attendance]}</strong></Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 font-normal">성적 <strong className="ml-1 text-gray-800">{gradingLabel[review.grading]}</strong></Badge>
            </div>
          )}

          {/* 확장된 상세 뷰 */}
          <div className={`grid transition-all duration-300 ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden space-y-6">

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">난이도</p>
                  <p className="font-bold text-gray-900">{difficultyLabel[review.difficulty]}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">학습량</p>
                  <p className="font-bold text-gray-900">{workloadLabel[review.workload]}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">출석 체크</p>
                  <p className="font-bold text-gray-900">{attendanceLabel[review.attendance]}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">성적 비율</p>
                  <p className="font-bold text-gray-900">{gradingLabel[review.grading]}</p>
                </div>
              </div>

              {(review.examTypes || review.assignmentType || review.textbook) && (
                <div className="bg-indigo-50/50 p-4 rounded-xl space-y-3">
                  {review.examTypes && review.examTypes.length > 0 && (
                    <div className="flex gap-2 text-sm">
                      <span className="font-semibold text-indigo-900 flex items-center gap-1.5 w-24 shrink-0"><PenTool className="w-4 h-4 text-indigo-500" /> 시험 방식</span>
                      <div className="flex flex-wrap gap-1.5">
                        {review.examTypes.map(type => (
                          <span key={type} className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-700 rounded-md text-xs">{type}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {review.assignmentType && (
                    <div className="flex gap-2 text-sm text-gray-700">
                      <span className="font-semibold text-indigo-900 flex items-center gap-1.5 w-24 shrink-0"><AlertCircle className="w-4 h-4 text-indigo-500" /> 과제/팀플</span>
                      <span>{review.assignmentType}</span>
                    </div>
                  )}
                  {review.textbook && (
                    <div className="flex gap-2 text-sm text-gray-700">
                      <span className="font-semibold text-indigo-900 flex items-center gap-1.5 w-24 shrink-0"><BookOpen className="w-4 h-4 text-indigo-500" /> 교재 사용</span>
                      <span>{review.textbook}</span>
                    </div>
                  )}
                </div>
              )}

              {(review.recommendFor || review.notRecommendFor) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {review.recommendFor && review.recommendFor.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <h4 className="text-sm font-bold text-green-800 mb-2">이런 분들께 강추! 👍</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {review.recommendFor.map(item => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {review.notRecommendFor && review.notRecommendFor.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <h4 className="text-sm font-bold text-red-800 mb-2">이런 분들은 피하세요 👎</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {review.notRecommendFor.map(item => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className={`text-gray-700 leading-relaxed ${isExpanded ? 'text-base pt-2' : 'text-sm line-clamp-3'}`}>
            {review.content}
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm font-medium">추천 {review.likes}</span>
              </button>

              {isHighQuality && (
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 text-amber-600 px-2.5 py-1.5 rounded-lg text-xs font-black shadow-sm select-none">
                  <Award className="w-3.5 h-3.5" />
                  정성이 들어간 강의평
                </div>
              )}
            </div>

            {hasExtendedInfo && (
              <button
                className="text-xs font-semibold text-indigo-600 flex items-center gap-1 hover:text-indigo-800"
              >
                {isExpanded ? (
                  <>접기 <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>자세히 보기 <ChevronDown className="w-3 h-3" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
