import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Star, Lock, Plus, Loader2, BookOpen, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ReviewCard } from '../components/ReviewCard';
import { courseService, reviewService, userService } from '../api/api';
import { Course, Review, User } from '../types/types';
import { toast } from 'sonner';

const getAverageScore = (reviews: Review[], key: 'difficulty' | 'workload' | 'attendance' | 'grading', val5: string, val3: string, val1: string) => {
  if (reviews.length === 0) return 3; // 기본값 모두 중간치
  let sum = 0;
  reviews.forEach(r => {
    if (r[key] === val5) sum += 5;
    else if (r[key] === val3) sum += 3;
    else if (r[key] === val1) sum += 1;
    else sum += 3;
  });
  return sum / reviews.length;
};

// 📊 심플하고 세련된 육각형 레이더 차트 (Light Frosted Theme)
const HexagonRadarChart = ({ data, labels }: { data: number[], labels: string[] }) => {
  const center = 100;
  const maxRadius = 65; // 도형 최대 반지름 (더 넓게 펴서 시원하게)

  const getPoint = (value: number, angleIndex: number) => {
    const angle = (Math.PI / 3) * angleIndex - Math.PI / 2;
    const r = (value / 5) * maxRadius;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  };

  const polygonPoints = data.map((v, i) => getPoint(v, i)).join(" ");
  const guides = [1, 2, 3, 4, 5].map(level => (
    data.map((_, i) => getPoint(level, i)).join(" ")
  ));

  return (
    <div className="relative w-full max-w-[260px] sm:max-w-[300px] mx-auto aspect-square z-10">
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        {/* Background Grids (은은한 가이드라인) */}
        {guides.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill={i === 4 ? "rgba(255,255,255,0.4)" : "none"}
            stroke="currentColor"
            className="text-slate-200"
            strokeWidth="1"
          />
        ))}
        {/* Axes (방사형 선) */}
        {data.map((_, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + maxRadius * Math.cos((Math.PI / 3) * i - Math.PI / 2)}
            y2={center + maxRadius * Math.sin((Math.PI / 3) * i - Math.PI / 2)}
            stroke="currentColor"
            className="text-slate-200"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        ))}

        {/* Data Polygon Area */}
        <polygon
          points={polygonPoints}
          className="fill-indigo-500/10 stroke-indigo-400 transition-all duration-1000 ease-out"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data Points */}
        {data.map((v, i) => {
          const pt = getPoint(v, i).split(",");
          return (
            <circle key={i} cx={pt[0]} cy={pt[1]} r="3" className="fill-white stroke-indigo-400" strokeWidth="1.5" />
          );
        })}

        {/* Texts (작고 깔끔한 폰트) */}
        {labels.map((label, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          const r = maxRadius + 18;

          return (
            <text
              key={i}
              x={center + r * Math.cos(angle)}
              y={center + r * Math.sin(angle) + 1}
              textAnchor="middle"
              alignmentBaseline="middle"
              className="fill-slate-500 font-medium text-[10px] sm:text-[11px] tracking-tight cursor-default"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reviews' | 'exams'>('reviews');
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([]);

  const toggleWeek = (week: number) => {
    setExpandedWeeks(prev =>
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
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

  const overallRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) : course.rating;

  // 🎮 육각형 게임 평점 스탯 추출 (1~5점 분포)
  const diffScore = getAverageScore(reviews, 'difficulty', 'hard', 'medium', 'easy');     // 시험 매운맛 (어려울수록 수치 증가)
  const workScore = getAverageScore(reviews, 'workload', 'heavy', 'medium', 'light');     // 과제 폭탄 (많을수록 수치 증가)
  const attScore = getAverageScore(reviews, 'attendance', 'flexible', 'medium', 'strict');// 출석 자유 (자유로울수록 수치 증가)
  const gradScore = getAverageScore(reviews, 'grading', 'generous', 'medium', 'strict');  // 학점 천사 (너그러울수록 수치 증가)

  // 추가 2개 파라미터 유도 (가상의 유익함과 소통 능력치 -> 기존 rating과 gradScore 기반으로 산출)
  const usefulnessScore = overallRating || 3;
  const commScore = Math.min(5, Math.max(1, (overallRating + gradScore) / 2));

  // 능력치 데이터 (총 6개)
  const statsData = [usefulnessScore, gradScore, attScore, diffScore, workScore, commScore];
  const statsLabels = ["꿀강(유익함)", "학점 스펙", "출석 자유도", "시험 매운맛", "과제/팀플량", "교수님 소통"];

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

  return (
    <>
      {/* Syllabus Modal (1안: 모달 팝업) */}
      {isSyllabusOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden outline-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shadow-inner border border-indigo-100/50">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[17px] font-black text-slate-900 tracking-tight leading-tight">25학년도 1학기 강의계획서</h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{course?.name} · {course?.professor} 교수님</p>
                </div>
              </div>
              <button
                onClick={() => setIsSyllabusOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto w-full space-y-6 no-scrollbar">

              {/* 강의 기본 정보 (진행방식, 수업방법, 유의사항) */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                  <span className="text-[11px] font-extrabold text-slate-400 w-20 shrink-0">강의진행방식</span>
                  <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
                    이론 강의(70%)와 실습(30%)을 병행하며, 매주 배운 내용을 기반으로 미니 프로젝트를 수행합니다.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                  <span className="text-[11px] font-extrabold text-slate-400 w-20 shrink-0">수업방법</span>
                  <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
                    대면 강의 원칙. 필요시 일부 특강은 Zoom을 통한 비대면 화상 강의로 진행될 수 있습니다.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                  <span className="text-[11px] font-extrabold text-red-400/80 w-20 shrink-0">수강시유의사항</span>
                  <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
                    지각 3회는 결석 1회로 간주하며, 전체 수업의 1/4 이상 결석 시 성적과 무관하게 F(낙제) 처리됩니다. 기한 내 과제 미제출 시 0점 부여.
                  </p>
                </div>
              </div>

              {/* 성적 비율 (Cards) */}
              <div>
                <h3 className="text-xs border-b border-slate-100 pb-2 mb-3 font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                  평가 기준
                </h3>
                <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/50 shadow-sm">
                    <span className="block text-[10px] text-slate-500 font-extrabold tracking-wider mb-0.5">중간고사</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">40%</span>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/50 shadow-sm">
                    <span className="block text-[10px] text-slate-500 font-extrabold tracking-wider mb-0.5">기말고사</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">40%</span>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/50 shadow-sm">
                    <span className="block text-[10px] text-slate-500 font-extrabold tracking-wider mb-0.5">과제</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">10%</span>
                  </div>
                  <div className="bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200/50 shadow-sm">
                    <span className="block text-[10px] text-slate-500 font-extrabold tracking-wider mb-0.5">출석</span>
                    <span className="text-base sm:text-lg font-black text-slate-800">10%</span>
                  </div>
                </div>
              </div>

              {/* 주차별 강의 계획 (Table) */}
              <div>
                <h3 className="text-xs border-b border-slate-100 pb-2 mb-3 font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-indigo-500 rounded-full"></span>
                  주차별 학습 계획
                </h3>
                <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3 w-14 text-center font-extrabold text-[11px]">주차</th>
                        <th className="py-2.5 px-3 font-extrabold text-[11px]">학습 내용</th>
                        <th className="py-2.5 px-3 w-20 text-center font-extrabold text-[11px]">비고</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { week: 1, topic: '강의 오리엔테이션 및 교과목 개요', note: '', detail: '교과목 소개, 성적 평가 방법 안내, 수강생 목적 및 학습 수준 파악' },
                        { week: 2, topic: '제 1장: 기본 개념 및 이론 설명', note: '', detail: '핵심 개념 정의, 역사적 배경과 실무 응용 사례를 통한 기초 확립' },
                        { week: 3, topic: '제 2장: 심화 모델 설계 (1)', note: '개인과제', detail: '모델링 기초 이론, 사례 연구를 통한 실무 실습, 첫 번째 개인 평가 과제 부여' },
                        { week: 4, topic: '제 2장: 심화 모델 설계 (2)', note: '', detail: '데이터 수집 및 전처리 기법, 통계적 검증 방법론 및 Q&A 진행' },
                        { week: 5, topic: '제 3장: 아키텍처 패턴 분석', note: '', detail: '소프트웨어 아키텍처(MVC, MVVM 등) 비교 분석 및 장단점 토론' },
                        { week: 6, topic: '제 4장: 중간고사 대비 총정리', note: '', detail: '1주차~5주차 핵심 내용 요약 복습, 기출 유형 분석 및 예상 문제 풀이' },
                        { week: 7, topic: '중간고사 (Middle Exam)', note: '대면', detail: '지정된 강의실에서 오프라인 지필고사 진행 (객관식 20문항 + 단답형 5문항)' },
                        { week: 8, topic: '제 5장: 네트워크 인프라 기초', note: '', detail: 'TCP/IP 모델의 7계층 이해, HTTP 프로토콜 기초 및 웹 트래픽 분석 실습' },
                        { week: 9, topic: '제 6장: 데이터베이스 심화', note: '팀편성', detail: '정규화 이론, B-Tree 인덱싱 최적화 기법, 기말 팀 프로젝트 조 편성' },
                        { week: 10, topic: '제 7장: 종합 실습 및 방법론', note: '팀플시작', detail: '팀별 프로젝트 주제 선정 회의, MVP(최소 기능 제품) 요구사항 명세서 작성 가이드' },
                        { week: 15, topic: '기말고사 (Final Exam)', note: '대면', detail: '1학기 전체 범위 오프라인 시험 (서술형/논술형 위주) 및 최종 팀 프로젝트 결과물 발표' },
                      ].map((w, i) => {
                        const isExpanded = expandedWeeks.includes(w.week);
                        return (
                          <React.Fragment key={i}>
                            <tr
                              onClick={() => toggleWeek(w.week)}
                              className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${w.week === 7 || w.week === 15 ? 'bg-amber-50/40 hover:bg-amber-50/60' : ''}`}
                            >
                              <td className="py-2.5 px-3 text-center font-bold text-slate-700">{w.week}주</td>
                              <td className={`py-2.5 px-3 font-medium flex items-center gap-1.5 ${w.week === 7 || w.week === 15 ? 'text-amber-800 font-bold' : 'text-slate-600'}`}>
                                {w.topic}
                                <span className="ml-auto text-slate-300">
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center text-[10px] font-extrabold text-indigo-500">{w.note}</td>
                            </tr>
                            {/* Expanded Detail Row */}
                            {isExpanded && (
                              <tr className="bg-indigo-50/30 animate-in fade-in duration-200">
                                <td colSpan={3} className="px-5 py-3.5 border-t border-indigo-50/50">
                                  <div className="flex gap-2.5 items-start">
                                    <span className="text-indigo-400 mt-0.5 shrink-0 opacity-80 text-sm font-bold">↳</span>
                                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                                      {w.detail}
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
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
                        나도 강의평가 작성하기
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
                <div className="flex-1 flex flex-col justify-center items-center py-2">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest w-full text-center md:text-left mb-6 ml-4">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2"></span>
                    강의 6각형 스탯
                  </h3>

                  <HexagonRadarChart data={statsData} labels={statsLabels} />
                </div>
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
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-full inline-block"></span>
                        작성된 수강평 <span className="text-indigo-600">{reviews.length}</span>
                      </h2>
                    </div>

                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}

                    {reviews.length === 0 && (
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
                    <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-amber-500"></div>
                      <CardContent className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-2">
                            <span className="bg-amber-100 text-amber-700 font-extrabold px-3 py-1 rounded-md text-sm tracking-tight">23년 1학기 중간고사</span>
                            <span className="bg-slate-100 text-slate-600 font-extrabold px-3 py-1 rounded-md text-sm tracking-tight">객관식 + 서술형 혼합</span>
                          </div>
                          <span className="text-slate-400 text-sm font-semibold">2달 전 작성</span>
                        </div>
                        <h4 className="text-[17px] font-bold text-slate-900 mb-3 cursor-pointer">기출문제 거의 안 타고 수업 필기에서 다 나옵니다.</h4>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          교수님이 피피티에 없는 내용도 중간중간 설명하시는데 거기가 진짜 핵심입니다. 특히 3주차에 강조하셨던 프레임워크 부분이 서술형 1번으로 그대로 나왔어요. 족보 타는 강의 아니니까 무조건 앞자리에서 녹음하고 필기하세요. 기말은 팀플 비중이 높아서 중간때 점수 무조건 따놔야함!
                        </p>
                      </CardContent>
                    </Card>

                    {/* Mock Exam Card 2 */}
                    <Card className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-amber-500"></div>
                      <CardContent className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-2">
                            <span className="bg-amber-100 text-amber-700 font-extrabold px-3 py-1 rounded-md text-sm tracking-tight">22년 2학기 기말고사</span>
                            <span className="bg-slate-100 text-slate-600 font-extrabold px-3 py-1 rounded-md text-sm tracking-tight">객관식 위주 (100%)</span>
                          </div>
                          <span className="text-slate-400 text-sm font-semibold">1년 전 작성</span>
                        </div>
                        <h4 className="text-[17px] font-bold text-slate-900 mb-3 cursor-pointer">족보 70% 탑니다. 족보 구하면 끝.</h4>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          문제 은행 식으로 내시는 것 같아요. 선배들한테 족보 무조건 구해서 3회독 하면 A0 이상은 껌입니다. 아, 근데 가끔 숫자만 살짝 바꿔서 내시니까 풀이 과정은 꼭 자기가 외우고 들어가세요. 그냥 답만 외웠다간 피봅니다 ㅋㅋ
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
