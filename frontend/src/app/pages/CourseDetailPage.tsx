import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { Lock, Plus, FileText, CalendarClock, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { SectionSelectDialog } from '../components/course/SectionSelectDialog';
import { courseService, reviewService, userService } from '../api/api';
import {
  loadSelectedTimetableIds,
  loadTimetableCartIds,
  saveSelectedTimetableIds,
  saveTimetableCartIds,
} from '../data/timetableData';
import { Course, Review, User } from '../types/types';
import { toast } from 'sonner';
import { useCourseStats } from '../hooks/useCourseStats';
import { SyllabusModal } from '../components/course/SyllabusModal';
import { CourseDetailSkeleton } from '../components/course/CourseSkeleton';
import { StarRating } from '../components/StarRating';
import {
  CourseProfessorGroup,
  findCourseProfessorGroup,
  findGroupSelectionInCart,
  replaceGroupSelectionInCart,
} from '../lib/courseGroups';
import { buildSlotsByCourseId } from '../lib/timetableSlots';

type TendencyBar = {
  id: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
  dominantLabel: string;
  dominantPercent: number;
  knobPercent: number;
  accent: string;
  responseCount: number;
};

type ReportDistributionCard = {
  id: string;
  title: string;
  responseCount: number;
  items: Array<{
    label: string;
    count: number;
    percent: number;
  }>;
};

const tendencyPalette = ['#2b9abf', '#e3a92f', '#35a66f', '#7f5aac', '#f16066'] as const;

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const average = (values: number[], fallback: number) =>
  values.length === 0 ? fallback : values.reduce((sum, value) => sum + value, 0) / values.length;

const averageTriState = (
  values: Array<'easy' | 'medium' | 'hard' | 'light' | 'heavy' | 'strict' | 'flexible' | 'generous' | undefined>,
  mapping: Record<string, number>,
  fallback: number,
) => average(values.map((value) => (value ? mapping[value] ?? fallback : fallback)), fallback);

const averageNumericField = (values: Array<number | undefined>, fallback: number) => {
  const numericValues = values.filter((value): value is number => typeof value === 'number');
  return average(numericValues, fallback);
};

const toPercentFromFive = (value: number) => clampPercent(((value - 1) / 4) * 100);

const buildDistribution = (title: string, values: string[]): ReportDistributionCard => {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    if (!value) return acc;
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  const total = values.length;
  const items = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      percent: total > 0 ? clampPercent((count / total) * 100) : 0,
    }));

  return {
    id: title,
    title,
    responseCount: total,
    items,
  };
};

const buildBinaryDistribution = (
  title: string,
  values: Array<boolean | null | undefined>,
  positiveLabel = '있음',
  negativeLabel = '없음',
): ReportDistributionCard => {
  const normalized = values
    .filter((value): value is boolean => typeof value === 'boolean')
    .map((value) => (value ? positiveLabel : negativeLabel));

  return buildDistribution(title, normalized);
};

const buildCourseTendencyBars = (reviews: Review[]): TendencyBar[] => {
  const difficultyAverage = averageNumericField(
    reviews.map((review) => review.diffScore),
    averageTriState(reviews.map((review) => review.difficulty), { easy: 1, medium: 3, hard: 5 }, 3),
  );
  const gradingAverage = averageNumericField(
    reviews.map((review) => review.gradScore),
    averageTriState(reviews.map((review) => review.grading), { strict: 1, medium: 3, generous: 5 }, 3),
  );
  const workloadAverage = averageNumericField(
    reviews.map((review) => review.workScore),
    averageTriState(reviews.map((review) => review.workload), { light: 1, medium: 3, heavy: 5 }, 3),
  );
  const prerequisiteAverage = averageNumericField(
    reviews.map((review) => review.prerequisiteScore),
    3,
  );
  const depthAverage = averageNumericField(
    reviews.map((review) => review.depthScore),
    3,
  );

  const configs = [
    { id: 'difficulty', title: '시험 체감', leftLabel: '널널함', rightLabel: '빡셈', value: difficultyAverage },
    { id: 'grading', title: '학점 분위기', leftLabel: '깐깐함', rightLabel: '후한 편', value: gradingAverage },
    { id: 'workload', title: '과제 흐름', leftLabel: '가벼움', rightLabel: '묵직함', value: workloadAverage },
    { id: 'prerequisite', title: '준비 난도', leftLabel: '입문형', rightLabel: '선수지식형', value: prerequisiteAverage },
    { id: 'depth', title: '수업 결', leftLabel: '실습형', rightLabel: '이론형', value: depthAverage },
  ] as const;

  return configs.map((config, index) => {
    const knobPercent = reviews.length === 0 ? 50 : toPercentFromFive(config.value);
    const isRightDominant = knobPercent >= 50;

    return {
      id: config.id,
      title: config.title,
      leftLabel: config.leftLabel,
      rightLabel: config.rightLabel,
      dominantLabel: reviews.length === 0 ? '응답 대기중' : isRightDominant ? config.rightLabel : config.leftLabel,
      dominantPercent: reviews.length === 0 ? 0 : isRightDominant ? knobPercent : 100 - knobPercent,
      knobPercent,
      accent: tendencyPalette[index],
      responseCount: reviews.length,
    };
  });
};

const buildCourseReportPreview = (reviews: Review[]): ReportDistributionCard[] => {
  const examTypeValues = reviews.flatMap((review) => review.examTypes ?? []);
  const assignmentValues = reviews
    .map((review) => review.assignmentType)
    .filter((value): value is string => Boolean(value));
  const structured = reviews.map((review) => review.structuredSurvey);

  return [
    buildDistribution('시험 방식', examTypeValues),
    buildDistribution('과제 유형', assignmentValues),
    buildBinaryDistribution('팀플 여부', structured.map((survey) => survey?.teamProject)),
    buildBinaryDistribution('퀴즈 여부', structured.map((survey) => survey?.quiz)),
  ];
};

export function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [courseGroup, setCourseGroup] = useState<CourseProfessorGroup | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [cartIds, setCartIds] = useState<string[]>([]);

  const filteredReviews = reviews;
  const examReviews = filteredReviews.filter(
    (review) =>
      !!review.pastExamHelpfulness ||
      !!review.scopePredictability ||
      (review.studyResources?.length ?? 0) > 0 ||
      (review.problemStyles?.length ?? 0) > 0 ||
      !!review.examPrepTip ||
      (review.examTypes?.length ?? 0) > 0,
  );

  const { overallRating, isMajor } = useCourseStats(
    course || ({} as Course),
    filteredReviews
  );
  const tendencyBars = useMemo(() => buildCourseTendencyBars(filteredReviews), [filteredReviews]);
  const reportPreviewCards = useMemo(() => buildCourseReportPreview(filteredReviews), [filteredReviews]);
  const reportNarrative = useMemo(() => {
    const rankedTendencies = [...tendencyBars]
      .filter((bar) => bar.responseCount > 0)
      .sort((a, b) => b.dominantPercent - a.dominantPercent);
    const strongest = rankedTendencies[0];
    const second = rankedTendencies[1];
    const examPattern = reportPreviewCards.find((card) => card.id === '시험 방식');
    const assignmentPattern = reportPreviewCards.find((card) => card.id === '과제 유형');
    const teamPattern = reportPreviewCards.find((card) => card.id === '팀플 여부');
    const quizPattern = reportPreviewCards.find((card) => card.id === '퀴즈 여부');

    if (filteredReviews.length === 0) {
      return {
        summary: '아직 누적된 응답이 없어 강의 성향과 운영 방식이 집계되지 않았습니다.',
        paragraphs: [
          '첫 리뷰가 등록되면 이 강의가 널널한 편인지, 응용 중심인지, 과제가 어떤 흐름으로 나오는지부터 차례대로 정리됩니다.',
          '지금은 리포트 본문 대신 집계 대기 상태로 남겨두고, 이후 응답이 모이면 주요 성향과 운영 패턴을 문장형으로 보여주도록 설계했습니다.',
        ],
      };
    }

    const summary = strongest
      ? `현재 응답에서는 ${strongest.dominantPercent}%가 ${strongest.dominantLabel} 쪽으로 기울어 있습니다.`
      : '현재 응답에서는 뚜렷한 우세 성향이 아직 보이지 않습니다.';

    const paragraphOne = strongest && second
      ? `가장 먼저 눈에 띄는 축은 ${strongest.title}입니다. 응답의 ${strongest.dominantPercent}%가 ${strongest.dominantLabel}으로 모였고, 다음으로는 ${second.title}에서 ${second.dominantPercent}%가 ${second.dominantLabel}으로 집계됐습니다. 수강 전에 이 강의의 결을 빠르게 읽으려면 두 항목을 먼저 보는 편이 가장 효율적입니다.`
      : '강의의 전반적인 성향은 아직 초반 응답이 쌓이는 단계입니다. 그래도 현재까지 들어온 응답만으로도 강의 결의 방향은 어느 정도 확인할 수 있습니다.';

    const paragraphTwo = examPattern?.items[0] && assignmentPattern?.items[0]
      ? `운영 방식에서는 ${examPattern.title} 응답이 가장 많이 모였습니다. 현재는 ${examPattern.items[0].percent}%가 ${examPattern.items[0].label}을 중심으로 답했고, 과제 쪽에서는 ${assignmentPattern.items[0].percent}%가 ${assignmentPattern.items[0].label}로 정리됐습니다. 즉 시험과 과제의 결을 함께 보면 이 수업이 어떤 방식으로 체감되는지 더 선명하게 읽힙니다.`
      : '시험 방식과 과제 유형에 대한 응답은 아직 부분적으로만 모여 있습니다. 이후 리뷰가 늘어날수록 운영 구조에 대한 설명도 더 구체적으로 바뀝니다.';

    const paragraphThree = teamPattern?.items[0] || quizPattern?.items[0]
      ? `보조 요소에서는 ${teamPattern?.items[0] ? `팀플은 ${teamPattern.items[0].percent}%가 ${teamPattern.items[0].label}으로 응답했고` : ''}${teamPattern?.items[0] && quizPattern?.items[0] ? ', ' : ''}${quizPattern?.items[0] ? `퀴즈는 ${quizPattern.items[0].percent}%가 ${quizPattern.items[0].label}으로 정리됐습니다` : ''}. 세부 분포와 응답 근거는 열람권에서 이어서 확인할 수 있습니다.`
      : '팀플이나 퀴즈처럼 강의 체감을 바꾸는 보조 요소는 아직 대표 경향을 확정하기 이릅니다. 세부 분포는 더 많은 응답이 들어오면 같이 보강됩니다.';

    return {
      summary,
      paragraphs: [paragraphOne, paragraphTwo, paragraphThree],
    };
  }, [filteredReviews.length, reportPreviewCards, tendencyBars]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [allCourses, fetchedUser] = await Promise.all([
          courseService.getAllCourses(),
          userService.getCurrentUser(),
        ]);

        const matchedGroup = findCourseProfessorGroup(allCourses, id, buildSlotsByCourseId(allCourses));

        if (!matchedGroup) {
          setCourse(null);
          setCourseGroup(null);
          setReviews([]);
          setUser(fetchedUser);
          return;
        }

        const reviewResults = await Promise.allSettled(
          matchedGroup.courses.map((groupCourse) => reviewService.getReviewsByCourseId(groupCourse.id)),
        );
        const mergedReviews = Array.from(
          new Map(
            reviewResults
              .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
              .map((review) => [review.id, review]),
          ).values(),
        );

        setCourse(matchedGroup.primaryCourse);
        setCourseGroup(matchedGroup);
        setReviews(mergedReviews);
        setUser(fetchedUser);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    setCartIds(loadTimetableCartIds());
  }, []);

  useEffect(() => {
    if (!courseGroup) {
      setSelectedSectionId(null);
      return;
    }

    const selectedInCart = findGroupSelectionInCart(cartIds, courseGroup);
    const preferredSectionId = selectedInCart?.id ?? courseGroup.sections[0]?.id ?? null;

    setSelectedSectionId((current) =>
      current && courseGroup.sections.some((section) => section.id === current)
        ? current
        : preferredSectionId,
    );
  }, [cartIds, courseGroup]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent py-8">
        <div className="mx-auto w-full max-w-[1360px] px-4 xl:px-6">
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
          <p className="mb-8 font-medium leading-relaxed text-gray-600">로그인 후 강의평을 확인할 수 있습니다.</p>
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

  const activeCartSection = courseGroup ? findGroupSelectionInCart(cartIds, courseGroup) : null;
  const activeSection = courseGroup?.sections.find((section) => section.id === selectedSectionId) ?? activeCartSection ?? courseGroup?.sections[0] ?? null;
  const hasMultipleSections = (courseGroup?.sections.length ?? 0) > 1;
  const reviewTargetCourseId = selectedSectionId ?? course.id;
  const reviewWriteLink = `/review/write/${reviewTargetCourseId}`;
  const isInTimetableCart = activeCartSection !== null;

  const handleConfirmSection = (nextCourseId: string) => {
    if (!courseGroup) {
      return;
    }

    const next = replaceGroupSelectionInCart(cartIds, courseGroup, nextCourseId);
    setCartIds(next);
    setSelectedSectionId(nextCourseId);
    saveTimetableCartIds(next);
    toast.success('선택한 분반을 시간표 장바구니에 담았습니다.');
    setIsSectionDialogOpen(false);
  };

  const handleRemoveGroupSelection = () => {
    if (!courseGroup) {
      return;
    }

    const idsInGroup = new Set(courseGroup.courses.map((groupCourse) => groupCourse.id));
    const next = cartIds.filter((savedId) => !idsInGroup.has(savedId));
    setCartIds(next);
    saveTimetableCartIds(next);
    saveSelectedTimetableIds(loadSelectedTimetableIds().filter((savedId) => !idsInGroup.has(savedId)));
    toast.success('시간표 장바구니에서 제거했습니다.');
    setIsSectionDialogOpen(false);
  };

  const handleTimetableCartAction = () => {
    if (!courseGroup) {
      return;
    }

    if (hasMultipleSections) {
      setIsSectionDialogOpen(true);
      return;
    }

    const onlySection = courseGroup.sections[0];
    if (!onlySection) {
      return;
    }

    const idsInGroup = new Set(courseGroup.courses.map((groupCourse) => groupCourse.id));

    if (activeCartSection) {
      const next = cartIds.filter((savedId) => !idsInGroup.has(savedId));
      setCartIds(next);
      saveTimetableCartIds(next);
      saveSelectedTimetableIds(loadSelectedTimetableIds().filter((savedId) => !idsInGroup.has(savedId)));
      toast.success('시간표 장바구니에서 제거했습니다.');
      return;
    }

    const next = replaceGroupSelectionInCart(cartIds, courseGroup, onlySection.id);
    setCartIds(next);
    setSelectedSectionId(onlySection.id);
    saveTimetableCartIds(next);
    saveSelectedTimetableIds(loadSelectedTimetableIds().filter((savedId) => !idsInGroup.has(savedId)));
    toast.success('시간표 장바구니에 담았습니다.');
  };

  return (
    <React.Fragment>
      {isSyllabusOpen && course && (
        <SyllabusModal course={course} onClose={() => setIsSyllabusOpen(false)} />
      )}
      <SectionSelectDialog
        open={isSectionDialogOpen}
        group={courseGroup}
        currentCourseId={activeCartSection?.id ?? null}
        preferredCourseId={activeSection?.id ?? null}
        onClose={() => setIsSectionDialogOpen(false)}
        onConfirm={handleConfirmSection}
        onRemove={isInTimetableCart ? handleRemoveGroupSelection : undefined}
      />

      <div className="min-h-screen">
        <div className="page-shell py-8">
          <div className="space-y-6">

            <div className="page-panel overflow-hidden p-5 lg:p-8">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_410px] xl:gap-8">
                <div className="flex flex-col border-b border-[rgba(15,23,42,0.08)] pb-6 xl:min-h-full xl:border-b-0 xl:border-r xl:border-[rgba(15,23,42,0.08)] xl:pr-8 xl:pb-0">
                  <div className="mb-5">
                    <p className="section-kicker">강의 정보</p>
                    <h1 className="mb-3 text-[1.95rem] font-black tracking-tight text-slate-900 md:text-[3.2rem]">
                      {course.name}
                    </h1>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${isMajor ? 'border-[rgba(15,23,42,0.08)] bg-[#edf4ff] text-[#005bac]' : 'border-[rgba(15,23,42,0.08)] bg-[#f5f8fb] text-slate-700'}`}>
                        {course.category}
                      </span>
                      <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f7fafc] px-2.5 py-1 text-[13px] text-slate-700">
                        {course.professor}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-500 font-medium">{course.department}</span>
                    </p>
                    {courseGroup ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {activeSection ? (
                          <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f7fafc] px-3 py-1.5 text-xs font-bold text-slate-700">
                            {activeSection.sectionLabel}
                          </span>
                        ) : null}
                        {activeSection?.timeSummary ? (
                          <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#edf4ff] px-3 py-1.5 text-xs font-bold text-[#005bac]">
                            {activeSection.timeSummary}
                          </span>
                        ) : null}
                        {hasMultipleSections ? (
                          <div className="min-w-[220px]">
                            <Select value={selectedSectionId ?? undefined} onValueChange={setSelectedSectionId}>
                              <SelectTrigger className="h-10 rounded-full border-[rgba(15,23,42,0.08)] bg-white font-semibold text-slate-700">
                                <SelectValue placeholder="분반 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {courseGroup.sections.map((section) => (
                                  <SelectItem key={section.id} value={section.id}>
                                    {section.timeSummary ? `${section.sectionLabel} · ${section.timeSummary}` : section.sectionLabel}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-auto flex flex-col">
                    <span className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">평균 평점</span>
                    <div className="flex items-end gap-2.5">
                      <span className="text-[3.55rem] font-black leading-none tracking-tighter text-slate-900 md:text-[4rem]">
                        {overallRating.toFixed(1)}
                      </span>
                      <span className="mb-1 text-base font-semibold text-slate-400 md:text-[1.05rem]">/ 5.0</span>
                    </div>
                    <div className="mt-3">
                      <StarRating
                        value={overallRating}
                        size="xl"
                        showValue={false}
                        reviewCount={reviews.length}
                        className="items-center"
                        reviewCountClassName="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f7fafc] px-3.5 py-1.5 text-sm font-semibold text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    <Button asChild className="h-11 w-full rounded-full px-5 text-sm font-semibold">
                      <Link to={reviewWriteLink}>
                        <Plus className="w-4 h-4 mr-1.5" />
                        강의평 남기기
                      </Link>
                    </Button>
                    <Button
                      onClick={() => setIsSyllabusOpen(true)}
                      variant="outline"
                      className="h-11 w-full rounded-full px-5 text-sm font-semibold text-slate-700"
                    >
                      <FileText className="w-4 h-4 mr-1.5 text-[#005bac]" />
                      강의계획서 보기
                    </Button>
                    <Button
                      onClick={handleTimetableCartAction}
                      variant="outline"
                      className="h-11 w-full rounded-full px-5 text-sm font-semibold text-slate-700"
                    >
                      <ShoppingBag className="mr-1.5 h-4 w-4 text-[#005bac]" />
                      {isInTimetableCart
                        ? hasMultipleSections
                          ? `${activeCartSection?.sectionLabel ?? '담긴 분반'} 변경`
                          : '시간표 장바구니에서 제거'
                        : hasMultipleSections
                          ? '분반 고르고 시간표 장바구니 담기'
                          : '바로 시간표 장바구니 담기'}
                    </Button>
                    <Link to="/timetable" className="block w-full">
                      <Button
                        variant="outline"
                        className="h-11 w-full rounded-full px-5 text-sm font-semibold text-[#005bac]"
                      >
                        <CalendarClock className="mr-1.5 h-4 w-4" />
                        시간표 짜러 가기
                      </Button>
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="outline-chip px-3.5 py-1.5 text-[13px] font-semibold">
                      리뷰 {filteredReviews.length}개
                    </span>
                    <span className="outline-chip px-3.5 py-1.5 text-[13px] font-semibold">
                      시험 정보 {examReviews.length}개
                    </span>
                  </div>
                </div>

                <div className="self-end rounded-[1.6rem] border border-[#dde5ef] bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)] md:p-5">
                  <div className="mb-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#005bac]">Signature Stat</p>
                    <p className="mt-1 text-[1.05rem] font-black text-slate-950">강의 성향 요약</p>
                  </div>

                  <div className="space-y-2.5 rounded-[1.35rem] border border-[#e3eaf3] bg-[linear-gradient(180deg,#fafcff_0%,#f5f7fb_100%)] p-4">
                    {tendencyBars.map((bar) => (
                      <div key={bar.id} className="rounded-[1rem] border border-white/70 bg-white/92 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3">
                          <div className="text-right">
                            <p className="text-[26px] font-black leading-none" style={{ color: bar.accent }}>
                              {bar.responseCount === 0 ? '--' : `${bar.dominantPercent}%`}
                            </p>
                            <p className="mt-1 text-[11px] font-black text-slate-700">{bar.dominantLabel}</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{bar.title}</p>
                              <span className="text-[11px] font-semibold text-slate-400">리뷰 {bar.responseCount}개</span>
                            </div>
                            <div className="relative mt-2">
                              <div
                                className="h-3 rounded-full"
                                style={{ backgroundColor: `${bar.accent}26` }}
                              />
                              <div
                                className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[4px] border-white shadow-[0_5px_12px_rgba(15,23,42,0.16)]"
                                style={{
                                  left: `calc(${bar.knobPercent}% - 10px)`,
                                  backgroundColor: bar.accent,
                                }}
                              />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold text-slate-500">
                              <span>{bar.leftLabel}</span>
                              <span>{bar.rightLabel}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
            <div className="page-panel overflow-hidden">
              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="p-5 lg:p-7">
                  <div className="flex items-center gap-4 border-b border-[rgba(15,23,42,0.08)] pb-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#d8e6fa] bg-[#f7fbff] text-2xl font-black text-[#005bac]">
                      1
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#005bac]">Course Report</p>
                      <h2 className="mt-1 text-[2rem] font-black tracking-tight text-slate-950">강의 리포트</h2>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[1.6rem] border border-[rgba(15,23,42,0.08)] bg-[#fbfcfe] p-5">
                      <div className="max-w-[60ch] space-y-3">
                        <p className="text-[1.05rem] font-semibold leading-8 tracking-[-0.01em] text-slate-700">
                          {reportNarrative.summary}
                        </p>
                        {reportNarrative.paragraphs.map((paragraph, index) => {
                          const isLocked = !user.hasPass && index >= 1;

                          return (
                            <div key={paragraph} className={`relative ${isLocked ? 'select-none' : ''}`}>
                              <p
                                className={`text-[0.98rem] leading-8 tracking-[-0.01em] text-slate-600 ${isLocked ? 'blur-[3px] opacity-55' : ''}`}
                              >
                                {paragraph}
                              </p>
                              {isLocked && index === 1 ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                                    <Lock className="h-3.5 w-3.5 text-[#005bac]" />
                                    상세 분석 잠금
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-6 rounded-[1.35rem] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">주요 집계</p>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          {[
                            ['평균 평점', overallRating.toFixed(1)],
                            ['누적 응답', `${filteredReviews.length}개`],
                            ['시험 정보', `${examReviews.length}개`],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-[1rem] border border-[rgba(15,23,42,0.06)] bg-[#fbfdff] px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                              <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">응답 분포</p>
                      <div className="mt-4 space-y-4">
                        {reportPreviewCards.map((card, index) => {
                          const leader = card.items[0];
                          const second = card.items[1];
                          const isLocked = !user.hasPass && index >= 2;

                          return (
                            <div key={card.id} className="rounded-[1.1rem] border border-[rgba(15,23,42,0.06)] bg-[#fbfdff] px-4 py-4">
                              <div className={`${isLocked ? 'blur-[2px] opacity-55' : ''}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black text-slate-950">{card.title}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">{card.responseCount}명 기준</p>
                                  </div>
                                  <span className="text-2xl font-black tracking-tight text-slate-900">
                                    {leader ? `${leader.percent}%` : '--'}
                                  </span>
                                </div>
                                <div className="mt-3 h-2 rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-[linear-gradient(90deg,#005bac_0%,#66a1ea_100%)]"
                                    style={{ width: `${leader?.percent ?? 0}%` }}
                                  />
                                </div>
                                <p className="mt-3 text-sm leading-6 tracking-[-0.01em] text-slate-600">
                                  {leader
                                    ? `${card.title} 응답에서는 ${leader.label}이 가장 높은 비중을 차지했습니다.${second ? ` 다음 응답은 ${second.label} ${second.percent}%입니다.` : ''}`
                                    : '집계된 응답이 아직 없습니다.'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <aside className="border-t border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f7fb_100%)] p-5 xl:border-l xl:border-t-0">
                  <div className="rounded-[1.5rem] border border-[rgba(15,23,42,0.08)] bg-white overflow-hidden shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="border-b border-[rgba(15,23,42,0.08)] px-5 py-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">이 페이지</p>
                      <h3 className="mt-2 text-xl font-black text-slate-950">{course.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{course.professor}</p>
                    </div>
                    <div className="divide-y divide-[rgba(15,23,42,0.08)]">
                      {[
                        '1. 강의 성향 요약',
                        '2. 강의 리포트',
                        user.hasPass ? '3. 상세 결과 열림' : '3. 상세 결과 잠금',
                      ].map((item, index) => (
                        <div
                          key={item}
                          className={`px-5 py-4 text-sm font-black ${index === 1 ? 'bg-[#f7fbff] text-[#005bac]' : 'text-slate-700'}`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="p-5">
                      {!user.hasPass ? (
                        <>
                          <p className="text-sm leading-7 tracking-[-0.01em] text-slate-600">
                            세부 분포와 문항별 근거를 보려면 열람권이 필요합니다.
                          </p>
                          <p className="mt-3 text-sm font-bold text-slate-700">
                            보유 포인트 <span className="text-[#005bac]">{user.points}P</span>
                          </p>
                          <div className="mt-4 space-y-2.5">
                            <Button
                              onClick={handlePurchaseAccess}
                              disabled={user.points < 50}
                              className="h-11 w-full rounded-full text-sm font-bold disabled:opacity-50"
                            >
                              열람권 구매 (-50P)
                            </Button>
                            <Button asChild variant="outline" className="h-11 w-full rounded-full text-sm font-bold text-[#005bac]">
                              <Link to={reviewWriteLink}>강의평 남기고 포인트 받기</Link>
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm leading-7 tracking-[-0.01em] text-slate-600">
                          열람권이 활성화되어 있어 세부 결과까지 바로 확인할 수 있습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
