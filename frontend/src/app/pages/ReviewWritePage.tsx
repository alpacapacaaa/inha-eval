import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { courseService, reviewService, userService } from '../api/api';
import { Course } from '../types/types';
import { toast } from 'sonner';

const semesters = ['2025-2학기', '2025-1학기', '2024-2학기', '2024-1학기'];

export function ReviewWritePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [semester, setSemester] = useState('2025-2학기');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [workload, setWorkload] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [attendance, setAttendance] = useState<'strict' | 'medium' | 'flexible'>('medium');
  const [grading, setGrading] = useState<'generous' | 'medium' | 'strict'>('medium');
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      if (courseId) {
        try {
          const data = await courseService.getCourseById(courseId);
          setCourse(data || null);
        } catch (error) {
          console.error("Failed to fetch course", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchCourse();
  }, [courseId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">강의를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('별점을 선택해주세요');
      return;
    }

    if (content.length < 30) {
      toast.error('후기는 최소 30자 이상 작성해주세요');
      return;
    }

    if (!courseId) return;

    setIsSubmitting(true);
    try {
      await reviewService.createReview({
        courseId,
        semester,
        rating,
        difficulty,
        workload,
        attendance,
        grading,
        content,
        isAnonymous: true,
      });

      await userService.addPoints(20, '강의평 작성');

      toast.success('강의평이 등록되었습니다! 20P를 받았습니다.');
      setTimeout(() => {
        navigate(`/course/${courseId}`);
      }, 1000);
    } catch (error) {
      toast.error('리뷰 등록 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">강의평 작성</h1>
              <p className="text-gray-600">
                {course.name} · {course.professor}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>수강 학기</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((sem) => (
                      <SelectItem key={sem} value={sem}>
                        {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>전체 별점</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          value <= displayRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  {rating > 0 && <span className="ml-2 text-gray-600">{rating}점</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>난이도</Label>
                <RadioGroup value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="easy" id="diff-easy" />
                      <Label htmlFor="diff-easy" className="cursor-pointer">
                        쉬움
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="diff-medium" />
                      <Label htmlFor="diff-medium" className="cursor-pointer">
                        보통
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hard" id="diff-hard" />
                      <Label htmlFor="diff-hard" className="cursor-pointer">
                        어려움
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>학습량</Label>
                <RadioGroup value={workload} onValueChange={(v) => setWorkload(v as any)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="work-light" />
                      <Label htmlFor="work-light" className="cursor-pointer">
                        적음
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="work-medium" />
                      <Label htmlFor="work-medium" className="cursor-pointer">
                        보통
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="heavy" id="work-heavy" />
                      <Label htmlFor="work-heavy" className="cursor-pointer">
                        많음
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>출석</Label>
                <RadioGroup value={attendance} onValueChange={(v) => setAttendance(v as any)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="strict" id="att-strict" />
                      <Label htmlFor="att-strict" className="cursor-pointer">
                        엄격
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="att-medium" />
                      <Label htmlFor="att-medium" className="cursor-pointer">
                        보통
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="flexible" id="att-flexible" />
                      <Label htmlFor="att-flexible" className="cursor-pointer">
                        자유
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>성적</Label>
                <RadioGroup value={grading} onValueChange={(v) => setGrading(v as any)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="generous" id="grade-generous" />
                      <Label htmlFor="grade-generous" className="cursor-pointer">
                        잘줌
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="grade-medium" />
                      <Label htmlFor="grade-medium" className="cursor-pointer">
                        보통
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="strict" id="grade-strict" />
                      <Label htmlFor="grade-strict" className="cursor-pointer">
                        짜게줌
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>후기 (최소 30자)</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="이 강의에 대한 솔직한 후기를 작성해주세요."
                  rows={6}
                />
                <p className="text-sm text-gray-500">
                  {content.length} / 30자 이상
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      제출 중...
                    </>
                  ) : (
                    '제출하고 20P 받기'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
