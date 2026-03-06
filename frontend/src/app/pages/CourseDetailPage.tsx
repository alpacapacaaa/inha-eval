import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Star, Lock, Plus, BookOpen, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ReviewCard } from '../components/ReviewCard';
import { courseService, reviewService, userService } from '../api/api';
import { Course, Review, User } from '../types/types';
import { toast } from 'sonner';
import { useCourseStats } from '../hooks/useCourseStats';
import { CourseRadarChart } from '../components/course/CourseRadarChart';
import { SyllabusModal } from '../components/course/SyllabusModal';
import { CourseDetailSkeleton } from '../components/course/CourseSkeleton';

export function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reviews' | 'exams'>('reviews');
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [expandedExams, setExpandedExams] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'highest' | 'lowest' | 'likes'>('latest');

  const { overallRating, statsData, statsLabels, isMajor } = useCourseStats(
    course || ({} as Course),
    reviews
  );

  const toggleExam = (index: number) => {
    setExpandedExams(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

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
      <div className="min-h-screen bg-gray-50/50 py-8">
        <div className="container mx-auto px-4">
          <CourseDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-8 leading-relaxed font-medium">
            인하대 재학생만 강의평가를 열람할 수 있습니다.<br />
            로그인하고 입체적인 프리미엄 리뷰를 확인해보세요!
          </p>
          <div className="space-y-3">
            <Link to="/auth?mode=login" className="block w-full">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-14 rounded-2xl text-lg transition-all shadow-md hover:shadow-lg">
                로그인 하러가기
              </Button>
            </Link>
            <Link to="/" className="block w-full">
              <Button variant="ghost" className="w-full text-gray-500 hover:text-gray-800 h-12 rounded-xl font-semibold">
                메인으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-bold">강의를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const handlePurchaseAccess = async () => {
    try {
      const updatedUser = await userService.purchasePass();
      setUser(updatedUser);
      toast.success('열람권을 획득했습니다!');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('열람권 획득에 실패했습니다.');
      }
    }
  };

  // 리뷰 정렬 로직 적용
  const finalReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'latest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
    return 0;
  });

  return (
    <React.Fragment>
      {isSyllabusOpen && course && (
        <SyllabusModal course={course} onClose={() => setIsSyllabusOpen(false)} />
      )}

      <div className="min-h-screen bg-gray-50/50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* 💎 은은한 투명 글래스(Glassmorphism) 대시보드 - 라이트 톤 */}
            <div className="relative overflow-hidden bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-6 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">

              {/* 배경 은은한 광원 효과 */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-200/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-200/30 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-14">

                {/* 왼쪽: 총점 및 과목 정보 */}
                <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-200/50 pb-8 md:pb-0 md:pr-8 flex flex-col justify-center">
                  <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight drop-shadow-none">
                      {course.name}
                    </h1>
                    <p className="text-sm text-slate-500 font-medium flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1.5 rounded-md text-xs font-extrabold shadow-sm border ${isMajor ? 'bg-indigo-50 text-indigo-500 border-indigo-100/50' : 'bg-emerald-50 text-emerald-500 border-emerald-100/50'}`}>
                        {course.category}
                      </span>
                      <span className="bg-white/90 px-3 py-1.5 rounded-lg text-slate-700 font-semibold border border-slate-100 shadow-sm">
                        {course.professor} 교수님
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500 font-medium">{course.department}</span>
                    </p>
                  </div>

                  <div className="flex flex-col mt-auto">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Overall Rating</span>
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-black text-slate-900 leading-none tracking-tighter">{overallRating.toFixed(1)}</span>
                      <span className="text-xl text-slate-400 font-semibold mb-1.5">/ 5.0</span>
                    </div>
                    <div className="flex items-center mt-3">
                      {Array.from({ length: 5 }, (_, i) => i < Math.round(overallRating)).map((filled, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 fill-slate-100'}`}
                        />
                      ))}
                      <span className="ml-3 text-xs font-semibold text-slate-500 bg-white/80 px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">
                        {reviews.length} 리뷰
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-3">
                    <Link to={`/review/write/${course.id}`} className="block w-full">
                      <Button className="font-semibold bg-slate-900 hover:bg-slate-800 text-white h-12 px-6 rounded-xl w-full transition-all shadow-md text-sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        강의평가 작성하기
                      </Button>
                    </Link>
                    <Button
                      onClick={() => setIsSyllabusOpen(true)}
                      variant="outline"
                      className="font-bold bg-white hover:bg-slate-50 text-slate-700 h-12 px-6 rounded-xl w-full transition-all text-sm border-slate-200/80 shadow-sm"
                    >
                      <FileText className="w-4 h-4 mr-1.5 text-indigo-500" />
                      강의계획서 보기
                    </Button>
                  </div>
                </div>

                {/* 오른쪽: 육각형 레이더 차트 */}
                <CourseRadarChart data={statsData} labels={statsLabels} />
              </div>

            </div>
            {/* Access Gate (Logged In, No Pass) */}
            {!user.hasPass && (
              <Card className="mb-6 border-indigo-200 bg-indigo-50/50 shadow-md rounded-[2rem] overflow-hidden">
                <CardContent className="p-8 md:p-10">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-indigo-100">
                      <Lock className="w-10 h-10 text-indigo-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-extrabold text-2xl mb-3 text-gray-900">
                        상세 강의평가를 보려면 열람권이 필요합니다
                      </h3>
                      <p className="text-base text-gray-600 mb-6 font-medium leading-relaxed">
                        강의평 하나를 작성하면 한 달간 모든 강의를 <strong className="text-indigo-600 decoration-indigo-300 underline underline-offset-4">무료로 무제한 패스</strong> 하실 수 있어요!<br className="hidden md:block" />
                        (현재 내 포인트: <strong className="text-indigo-600 text-lg bg-indigo-100 px-2 py-0.5 rounded-md">{user.points}P</strong>)
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                        <Button
                          onClick={handlePurchaseAccess}
                          disabled={user.points < 50}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold h-14 px-8 rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 text-base"
                        >
                          열람권 구매 (-50P)
                        </Button>
                        <Link to={`/review/write/${course.id}`}>
                          <Button variant="outline" className="border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 font-extrabold h-14 px-8 rounded-full w-full sm:w-auto text-base">
                            강의평 남기고 포인트 받기
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 🔘 Reviews & Exam Info Tabs */}
            {user.hasPass && (
              <div className="space-y-8 pt-6">

                {/* Pill-shaped Tab Navigation */}
                <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-full max-w-md mx-auto shadow-inner border border-slate-200/80">
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex-1 py-3.5 px-4 rounded-xl text-[15px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'reviews'
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                  >
                    <BookOpen className={`w-4 h-4 ${activeTab === 'reviews' ? 'text-indigo-500' : 'text-slate-400'}`} />
                    강의평가 <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-md font-extrabold">{reviews.length}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('exams')}
                    className={`flex-1 py-3.5 px-4 rounded-xl text-[15px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'exams'
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                  >
                    <Lock className={`w-4 h-4 ${activeTab === 'exams' ? 'text-indigo-500' : 'text-slate-400'}`} />
                    시험·족보 <span className="bg-amber-100 text-amber-600 text-xs px-2 py-0.5 rounded-md font-extrabold">2</span>
                  </button>
                </div>

                {/* 탭 내용 1: 🎉 REVIEWS */}
                {activeTab === 'reviews' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="flex flex-col md:flex-row items-center justify-between px-2 gap-4">
                      <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-full inline-block"></span>
                        작성된 수강평 <span className="text-indigo-600">{finalReviews.length}</span>
                      </h2>

                      {/* 정렬 컨트롤러 */}
                      <div className="flex items-center w-full md:w-auto">
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                          <SelectTrigger className="w-[130px] bg-white border-slate-200">
                            <SelectValue placeholder="정렬 방식" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="latest">최신 등록순</SelectItem>
                            <SelectItem value="likes">추천 많은순</SelectItem>
                            <SelectItem value="highest">별점 높은순</SelectItem>
                            <SelectItem value="lowest">별점 낮은순</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {finalReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>

                    {finalReviews.length === 0 && (
                      <Card className="rounded-3xl border-dashed border-2 border-slate-200 bg-transparent">
                        <CardContent className="p-16 text-center">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <BookOpen className="w-8 h-8 text-slate-300" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-700 mb-2">아직 등록된 강의평가가 없습니다</h3>
                          <p className="text-slate-500 mb-6 font-medium">이 강의의 첫 번째 리뷰어가 되어 후배들을 도와주세요!</p>
                          <Link to={`/review/write/${course.id}`}>
                            <Button className="font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl h-12 px-8">첫 번째 강의평 작성하기</Button>
                          </Link>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* 탭 내용 2: 💯 EXAM INFO (Mock Data) + BLUR LOCK */}
                {activeTab === 'exams' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-amber-500 rounded-full inline-block"></span>
                        핵심 시험 정보 <span className="text-amber-600">2</span>
                      </h2>
                    </div>

                    {/* Mock Exam Card 1 */}
                    <Card
                      className={`rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group ${expandedExams.includes(1) ? 'ring-2 ring-amber-400' : ''}`}
                      onClick={() => toggleExam(1)}
                    >
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-amber-500"></div>
                      <CardContent className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-2">
                            <span className="bg-amber-100 text-amber-700 font-extrabold px-3 py-1 rounded-md text-sm tracking-tight">23년 1학기 중간고사</span>
                            <span className="bg-slate-100 text-slate-600 font-extrabold px-3 py-1 rounded-md text-sm tracking-tight">객관식 + 서술형 혼합</span>
                          </div>
                          <span className="text-slate-400 text-sm font-semibold flex items-center gap-1.5">
                            2달 전 작성
                            {expandedExams.includes(1) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>
                        <h4 className="text-[17px] font-bold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors">기출문제 거의 안 타고 수업 필기에서 다 나옵니다.</h4>

                        {expandedExams.includes(1) && (
                          <div className="mt-5 pt-5 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            <p className="text-slate-600 leading-relaxed font-medium mb-4">
                              교수님이 피피티에 없는 내용도 중간중간 설명하시는데 거기가 진짜 핵심입니다. 특히 3주차에 강조하셨던 프레임워크 부분이 서술형 1번으로 그대로 나왔어요. 족보 타는 강의 아니니까 무조건 앞자리에서 녹음하고 필기하세요. 기말은 팀플 비중이 높아서 중간때 점수 무조건 따놔야함!
                            </p>
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100/50">
                              <h5 className="font-extrabold text-amber-800 mb-2 flex items-center text-sm">
                                <Star className="w-4 h-4 mr-1.5 fill-amber-500 text-amber-500" />
                                많이 나온 키워드
                              </h5>
                              <div className="flex gap-2 flex-wrap">
                                <span className="bg-white px-2.5 py-1 rounded-md text-xs font-bold text-slate-600 shadow-sm">프레임워크의 개념</span>
                                <span className="bg-white px-2.5 py-1 rounded-md text-xs font-bold text-slate-600 shadow-sm">객체지향 방법론 비교</span>
                                <span className="bg-white px-2.5 py-1 rounded-md text-xs font-bold text-slate-600 shadow-sm">UML 다이어그램 종류</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Mock Exam Card 2 */}
                    <Card
                      className={`rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group ${expandedExams.includes(2) ? 'ring-2 ring-amber-400' : ''}`}
                      onClick={() => toggleExam(2)}
                    >
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-amber-500"></div>
                      <CardContent className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-2">
                            <span className="bg-amber-100 text-amber-700 font-extrabold px-3 py-1 rounded-md text-sm tracking-tight">22년 2학기 기말고사</span>
                            <span className="bg-slate-100 text-slate-600 font-extrabold px-3 py-1 rounded-md text-sm tracking-tight">객관식 위주 (100%)</span>
                          </div>
                          <span className="text-slate-400 text-sm font-semibold flex items-center gap-1.5">
                            1년 전 작성
                            {expandedExams.includes(2) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>
                        <h4 className="text-[17px] font-bold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors">족보 70% 탑니다. 족보 구하면 끝.</h4>

                        {expandedExams.includes(2) && (
                          <div className="mt-5 pt-5 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            <p className="text-slate-600 leading-relaxed font-medium mb-4">
                              문제 은행 식으로 내시는 것 같아요. 선배들한테 족보 무조건 구해서 3회독 하면 A0 이상은 껌입니다. 아, 근데 가끔 숫자만 살짝 바꿔서 내시니까 풀이 과정은 꼭 자기가 외우고 들어가세요. 그냥 답만 외웠다간 피봅니다 ㅋㅋ
                            </p>
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100/50">
                              <h5 className="font-extrabold text-amber-800 mb-2 flex items-center text-sm">
                                <Star className="w-4 h-4 mr-1.5 fill-amber-500 text-amber-500" />
                                꿀팁 & 체감 난이도
                              </h5>
                              <p className="text-sm text-amber-900/80 font-medium">
                                기말고사는 중간고사 범위 누적 없이 딱 기말 부분만 나옵니다. 계산 문제가 은근 많아서 시간 관리가 핵심이에요. (체감 난이도: 하)
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
