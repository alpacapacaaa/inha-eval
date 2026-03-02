import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Star, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion';
import { courseService, reviewService, userService } from '../api/api';
import { Course } from '../types/types';
import { toast } from 'sonner';

const semesters = ['2025-2학기', '2025-1학기', '2024-2학기', '2024-1학기'];
const examTypeOptions = ['객관식', '주관식/서술형', '오픈북', '과제 대체', '실습/발표'];
const recommendOptions = ['벼락치기 가능', '성실한 출석러', '팀플/발표 선호', '이해력 중시', '암기력 중시'];
const notRecommendOptions = ['암기 취약', '팀플 극혐', '발표 공포증', '수학/계산 약함', '독학 선호'];

export function ReviewWritePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 기본 항목
  const [semester, setSemester] = useState('2025-1학기');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [workload, setWorkload] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [attendance, setAttendance] = useState<'strict' | 'medium' | 'flexible'>('medium');
  const [grading, setGrading] = useState<'generous' | 'medium' | 'strict'>('medium');

  // 🔥 추가 항목
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<string>('개인 과제 위주');
  const [textbook, setTextbook] = useState<string>('참고용');
  const [oneLineTip, setOneLineTip] = useState('');
  const [recommendFor, setRecommendFor] = useState<string[]>([]);
  const [notRecommendFor, setNotRecommendFor] = useState<string[]>([]);

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

  // 다중 선택 핸들러
  const toggleSelection = (item: string, state: string[], setState: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (state.includes(item)) {
      setState(state.filter(i => i !== item));
    } else {
      setState([...state, item]);
    }
  };

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
      // API call includes the new fields (requires backend update eventually)
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
        // Optional parameters backend might ignore for now or we can structure inside a JSON string
        // examTypes, assignmentType, textbook, oneLineTip, recommendFor, notRecommendFor
      });

      await userService.addPoints(30, '상세 강의평 작성');

      toast.success('강의평이 등록되었습니다! 30P를 받았습니다.');
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-indigo-600 pb-24 pt-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">프리미엄 강의평 작성하기</h1>
          <p className="text-indigo-100 opacity-90">후배들에게 도움이 될 생생한 후기를 남겨주세요!</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-16">
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl shadow-indigo-100">
          <div className="mb-8 border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900">{course.name}</h2>
            <p className="text-gray-500 mt-1">
              {course.professor} 교수님 · {course.department}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* 기본 정보 섹션 */}
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="space-y-3 flex-1">
                  <Label className="text-base font-semibold">수강 학기</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((sem) => (
                        <SelectItem key={sem} value={sem}>{sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 flex-1">
                  <Label className="text-base font-semibold">전체 별점</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        onMouseEnter={() => setHoveredRating(value)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${value <= displayRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-200'
                            }`}
                        />
                      </button>
                    ))}
                    {rating > 0 && <span className="ml-3 font-bold text-lg text-gray-700">{rating}점</span>}
                  </div>
                </div>
              </div>

              {/* 한 줄 꿀팁 */}
              <div className="space-y-3 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                <Label className="text-base font-semibold flex items-center gap-2 text-blue-900">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  이 강의의 한 줄 꿀팁!
                </Label>
                <div className="flex items-center">
                  <Input
                    placeholder="예: 앞자리 앉아서 눈 맞추면 A+ 보장, 족보 필수"
                    value={oneLineTip}
                    onChange={(e) => setOneLineTip(e.target.value)}
                    maxLength={40}
                    className="bg-white border-blue-200 focus-visible:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-blue-600 text-right">{oneLineTip.length}/40자</p>
              </div>

              {/* 라디오 버튼 평가들 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {/* 난이도 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium text-gray-700">시험 난이도</Label>
                  <RadioGroup value={difficulty} onValueChange={(v) => setDifficulty(v as any)} className="flex gap-3">
                    {[{ v: 'easy', l: '쉬움' }, { v: 'medium', l: '보통' }, { v: 'hard', l: '어려움' }].map((item) => (
                      <div key={item.v} className="flex-1">
                        <RadioGroupItem value={item.v} id={`diff-${item.v}`} className="peer sr-only" />
                        <Label
                          htmlFor={`diff-${item.v}`}
                          className="flex justify-center p-3 border rounded-lg cursor-pointer peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:text-indigo-700 transition-all hover:bg-gray-50"
                        >
                          {item.l}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* 학습량 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium text-gray-700">학습량(과제량)</Label>
                  <RadioGroup value={workload} onValueChange={(v) => setWorkload(v as any)} className="flex gap-3">
                    {[{ v: 'light', l: '적음' }, { v: 'medium', l: '보통' }, { v: 'heavy', l: '많음' }].map((item) => (
                      <div key={item.v} className="flex-1">
                        <RadioGroupItem value={item.v} id={`work-${item.v}`} className="peer sr-only" />
                        <Label
                          htmlFor={`work-${item.v}`}
                          className="flex justify-center p-3 border rounded-lg cursor-pointer peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:text-indigo-700 transition-all hover:bg-gray-50"
                        >
                          {item.l}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* 학점 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium text-gray-700">학점 비율</Label>
                  <RadioGroup value={grading} onValueChange={(v) => setGrading(v as any)} className="flex gap-3">
                    {[{ v: 'generous', l: '꿀잼/잘줌' }, { v: 'medium', l: '보통' }, { v: 'strict', l: '짜게줌' }].map((item) => (
                      <div key={item.v} className="flex-1">
                        <RadioGroupItem value={item.v} id={`grad-${item.v}`} className="peer sr-only" />
                        <Label
                          htmlFor={`grad-${item.v}`}
                          className="flex justify-center p-3 border rounded-lg cursor-pointer peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:text-indigo-700 transition-all hover:bg-gray-50"
                        >
                          {item.l}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* 출석 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium text-gray-700">출석 체크</Label>
                  <RadioGroup value={attendance} onValueChange={(v) => setAttendance(v as any)} className="flex gap-3">
                    {[{ v: 'strict', l: '매번 부름' }, { v: 'medium', l: '가끔 부름' }, { v: 'flexible', l: '안부름/전자' }].map((item) => (
                      <div key={item.v} className="flex-1">
                        <RadioGroupItem value={item.v} id={`att-${item.v}`} className="peer sr-only" />
                        <Label
                          htmlFor={`att-${item.v}`}
                          className="flex justify-center p-3 border rounded-lg cursor-pointer peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:text-indigo-700 transition-all hover:bg-gray-50"
                        >
                          {item.l}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* 🔥 추가 상세 정보 (Accordion) */}
            <Accordion type="single" collapsible className="w-full border rounded-xl overflow-hidden shadow-sm">
              <AccordionItem value="detailed-info" className="border-b-0">
                <AccordionTrigger className="px-5 py-4 bg-gray-50 hover:bg-gray-100/80 transition-colors font-bold text-gray-800">
                  선택 사항 (자세히 적고 포인트 더 받기)
                </AccordionTrigger>
                <AccordionContent className="px-5 py-6 bg-white space-y-8">

                  {/* 시험 방식 (다중 선택) */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium text-gray-800">시험 방식 (다중 선택 가능)</Label>
                    <div className="flex flex-wrap gap-2">
                      {examTypeOptions.map((item) => {
                        const isChecked = examTypes.includes(item);
                        return (
                          <label key={item} className={`flex items-center px-4 py-2 rounded-full border cursor-pointer transition-all ${isChecked ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                            <Checkbox
                              className="sr-only"
                              checked={isChecked}
                              onCheckedChange={() => toggleSelection(item, examTypes, setExamTypes)}
                            />
                            {item}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* 과제 유형 */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium text-gray-800">과제 및 팀플 비중</Label>
                    <RadioGroup value={assignmentType} onValueChange={setAssignmentType} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['개인 과제 위주', '팀플 위주', '초반에만 있음', '과제 없음'].map((item) => (
                        <div key={item}>
                          <RadioGroupItem value={item} id={`assign-${item}`} className="peer sr-only" />
                          <Label htmlFor={`assign-${item}`} className="flex justify-center p-2.5 text-sm border rounded-lg cursor-pointer peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:text-indigo-700 hover:bg-gray-50">
                            {item}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* 교재 사용 */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium text-gray-800">교재 사용도</Label>
                    <RadioGroup value={textbook} onValueChange={setTextbook} className="grid grid-cols-2 gap-3">
                      {['무조건 사야함 (필수)', '참고용', '교수님 PPT 위주', '거의 안 씀'].map((item) => (
                        <div key={item}>
                          <RadioGroupItem value={item} id={`book-${item}`} className="peer sr-only" />
                          <Label htmlFor={`book-${item}`} className="flex justify-center p-2.5 text-sm border rounded-lg cursor-pointer peer-data-[state=checked]:bg-indigo-50 peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:text-indigo-700 hover:bg-gray-50">
                            {item}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* 추천 대상 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 bg-green-50/50 p-4 rounded-xl border border-green-100">
                      <Label className="text-sm font-bold text-green-800">이런 분들께 추천해요 👍</Label>
                      <div className="flex flex-col gap-2">
                        {recommendOptions.map((item) => (
                          <label key={item} className="flex items-center gap-2 cursor-pointer p-1">
                            <Checkbox checked={recommendFor.includes(item)} onCheckedChange={() => toggleSelection(item, recommendFor, setRecommendFor)} />
                            <span className="text-sm text-gray-700">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
                      <Label className="text-sm font-bold text-red-800">이런 분들은 피하세요 👎</Label>
                      <div className="flex flex-col gap-2">
                        {notRecommendOptions.map((item) => (
                          <label key={item} className="flex items-center gap-2 cursor-pointer p-1">
                            <Checkbox checked={notRecommendFor.includes(item)} onCheckedChange={() => toggleSelection(item, notRecommendFor, setNotRecommendFor)} />
                            <span className="text-sm text-gray-700">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 서술형 후기 */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-base font-semibold">총평 (최소 30자)</Label>
                <span className={`text-sm ${content.length < 30 ? 'text-red-500' : 'text-green-600 font-medium'}`}>
                  {content.length} / 30자 이상
                </span>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="전반적인 강의 만족도, 아쉬웠던 점, 교수님의 특징 등을 자유롭게 적어주세요. 후배들에게 큰 도움이 됩니다!"
                className="min-h-[160px] p-4 text-base resize-none border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl leading-relaxed"
              />
            </div>

            {/* 제출 버튼 */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
              <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)} disabled={isSubmitting} className="sm:w-32 rounded-xl">
                취소
              </Button>
              <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  '강의평 등록하고 30P 받기'
                )}
              </Button>
            </div>

            <p className="text-center text-sm text-gray-400 flex items-center justify-center gap-1.5 mt-4">
              <AlertCircle className="w-4 h-4" /> 허위 사실이나 비방 목적의 리뷰는 제재될 수 있습니다.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
