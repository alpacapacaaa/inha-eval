import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { CourseCardSkeleton } from '../components/course/CourseSkeleton';
import { SectionSelectDialog } from '../components/course/SectionSelectDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { courseService, userService } from '../api/api';
import {
  formatPeriodRange,
  loadSelectedTimetableIds,
  loadTimetableCartIds,
  PERIODS,
  TIMETABLE_DAYS,
  saveSelectedTimetableIds,
  saveTimetableCartIds,
} from '../data/timetableData';
import { Course } from '../types/types';
import { StarRating } from '../components/StarRating';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  X,
} from 'lucide-react';
import { CURRENT_SEMESTER_SHORT_LABEL } from '../lib/semester';
import {
  CourseProfessorGroup,
  findGroupSelectionInCart,
  getSubjectGroupKey,
  groupCoursesByProfessor,
  replaceGroupSelectionInCart,
} from '../lib/courseGroups';
import { buildSlotsByCourseId, getCourseSlots } from '../lib/timetableSlots';
import { toast } from 'sonner';

type BrowseSubjectGroup = {
  key: string;
  name: string;
  department: string;
  category: Course['category'];
  type: string;
  isOpenCurrent: boolean;
  professorGroups: CourseProfessorGroup[];
};

const majorTypes = ['전공필수', '전공선택', '전공기초'];

const themes = [
  { id: 'all', label: '전체보기' },
  { id: 'top-rated', label: '명강의' },
  { id: 'easy-credit', label: '널널한 꿀강' },
  { id: 'most-reviewed', label: '검증된 강의' },
  { id: 'growth', label: '성장형 강의' },
];

const geGroups = {
  핵심교양: [
    '핵심교양-1.인간, 가치, 공존',
    '핵심교양-1.인간, 가치, 공존(공학윤리와 토론)',
    '핵심교양-2.역사, 사상, 문화',
    '핵심교양-3.문학, 예술, 상징',
    '핵심교양-4.사회, 제도, 세계',
    '핵심교양-5.자연, 생명, 환경',
    '핵심교양-6.수리, 정보, 기술',
  ],
  일반교양: [
    '일반교양-1.인문 · 예술',
    '일반교양-2. 사회 · 자연',
    '일반교양-3.소통 · 실천',
    '일반교양-4.창의 · 도전',
    '일반교양-5.실용 · 진로',
    '일반교양-6.생활 · 건강',
    '일반교양-7.SW·AI',
  ],
  기타: ['창의'],
};

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

const sortByKoreanName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

function TimetablePanel({
  open,
  cartCourses,
  onClose,
  onToggleCart,
}: {
  open: boolean;
  cartCourses: Course[];
  onClose: () => void;
  onToggleCart: (courseId: string) => void;
}) {
  const cartEntries = cartCourses.flatMap((course) =>
    getCourseSlots(course).map((slot) => ({
      ...slot,
      courseId: course.id,
      courseName: course.name,
      professor: course.professor,
      section: course.section,
    })),
  );

  const conflicts = cartEntries.flatMap((entry, index) =>
    cartEntries.slice(index + 1).flatMap((other) => {
      const overlaps =
        entry.day === other.day &&
        entry.startPeriod <= other.endPeriod &&
        other.startPeriod <= entry.endPeriod;

      if (!overlaps) {
        return [];
      }

      return [
        `${entry.day} ${entry.courseName}(${entry.professor}${entry.section ? ` ${entry.section}분반` : ''}) · ${other.courseName}(${other.professor}${other.section ? ` ${other.section}분반` : ''}) 시간이 겹칩니다.`,
      ];
    }),
  );

  const dayColumns = TIMETABLE_DAYS.map((day) => ({
    day,
    entries: cartEntries
      .filter((entry) => entry.day === day)
      .sort((a, b) => a.startPeriod - b.startPeriod),
  }));

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[2px] transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      <div
        className={`fixed bottom-6 right-6 z-50 w-[min(92vw,860px)] rounded-[2rem] border border-[#005bac]/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] transition-all duration-300 ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#005bac]/8 px-6 py-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#005bac]">시간표 장바구니</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">시간표 장바구니</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">담은 강의를 주간 시간표 형태로 먼저 확인해볼 수 있어요.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-[#cfe4f7] bg-[#f8fbff] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#005bac]">담은 강의</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{cartCourses.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#005bac] shadow-sm">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-black">시간이 겹치는 강의가 있어요</p>
                </div>
                <ul className="mt-3 space-y-2 text-sm font-medium text-rose-700">
                  {conflicts.map((conflict) => (
                    <li key={conflict}>- {conflict}</li>
                  ))}
                </ul>
              </div>
            )}

                <div className="space-y-3">
                  {cartCourses.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <p className="text-base font-bold text-slate-500">아직 담은 강의가 없습니다.</p>
                  <p className="mt-2 text-sm text-slate-400">검색 결과나 교수님 선택 목록에서 장바구니에 담아보세요.</p>
                </div>
              ) : (
                cartCourses.map((course) => (
                  <div key={course.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black text-slate-900">{course.name}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          {course.professor}{course.section ? ` · ${course.section}분반` : ''}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getCourseSlots(course).map((slot) => (
                            <span key={`${course.id}-${slot.day}-${slot.startPeriod}`} className="rounded-full bg-[#eef7ff] px-3 py-1.5 text-xs font-bold text-[#005bac]">
                              {slot.day} {formatPeriodRange(slot.startPeriod, slot.endPeriod)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onToggleCart(course.id)}
                        className="h-9 rounded-full px-4 text-xs font-bold"
                      >
                        제거
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#d7e7f6] bg-[#fbfdff] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#005bac]">주간 시간표</p>
                <p className="mt-1 text-sm font-medium text-slate-500">장바구니에 담은 강의를 시간표로 미리 볼 수 있습니다.</p>
              </div>
              <Badge className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 border border-slate-200">
                {cartEntries.length}교시
              </Badge>
            </div>

            <div className="mb-4 rounded-[1.25rem] border border-[#d7e7f6] bg-white p-3">
              <Link
                to="/timetable"
                className="flex items-center justify-between rounded-full bg-gradient-to-r from-[#005bac] to-[#1084e8] px-4 py-3 text-sm font-black text-white"
              >
                <span>시간표 조립하러 가기</span>
                <CalendarClock className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-[72px_repeat(5,minmax(0,1fr))] gap-2 text-xs">
              <div />
              {TIMETABLE_DAYS.map((day) => (
                <div key={day} className="rounded-xl bg-white px-2 py-2 text-center font-black text-slate-700 border border-slate-200">
                  {day}
                </div>
              ))}

              {PERIODS.map((period) => (
                <div key={`period-row-${period.period}`} className="contents">
                  <div className="rounded-xl bg-white px-2 py-3 text-center border border-slate-200">
                    <p className="font-black text-slate-700">{period.label}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-400">{period.time}</p>
                  </div>
                  {TIMETABLE_DAYS.map((day) => {
                    const matchingEntries = dayColumns
                      .find((column) => column.day === day)
                      ?.entries.filter((entry) => entry.startPeriod <= period.period && period.period <= entry.endPeriod) ?? [];

                    return (
                      <div key={`${day}-${period.period}`} className="min-h-[66px] rounded-xl border border-[#e3edf7] bg-white p-2">
                        <div className="space-y-1">
                          {matchingEntries.map((entry) => (
                            <div key={`${entry.courseId}-${entry.day}-${entry.startPeriod}`} className="rounded-lg bg-[#eef7ff] px-2 py-1.5">
                              <p className="line-clamp-1 font-black text-[#005bac]">
                                {entry.courseName}{entry.section ? ` · ${entry.section}분반` : ''}
                              </p>
                              <p className="line-clamp-1 text-[11px] font-medium text-slate-500">{entry.location}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SearchResultCard({
  group,
  selectedCourseId,
  onCartAction,
}: {
  group: CourseProfessorGroup;
  selectedCourseId: string | null;
  onCartAction: (group: CourseProfessorGroup) => void;
}) {
  const selectedSection = group.sections.find((section) => section.id === selectedCourseId) ?? null;
  const hasMultipleSections = group.sections.length > 1;

  return (
    <Card className="overflow-hidden rounded-[1.6rem] border border-[rgba(15,23,42,0.08)] bg-[#fcfdff] transition-all hover:border-[#005bac]/18 hover:shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
      <CardContent className="p-0">
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#005bac]">
                  {group.category === '전공' ? '전공 강의' : '교양 강의'}
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 md:text-[1.55rem]">
                  {group.name}
                </h3>
                <p className="mt-1.5 text-sm font-semibold text-slate-600 md:text-[15px]">
                  {group.professor} · {group.department}
                </p>
              </div>
              <div className="flex flex-row flex-wrap items-center gap-2 md:justify-end">
                <Badge className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                  {group.type}
                </Badge>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${
                    group.isOpenCurrent
                      ? 'border border-[rgba(0,91,172,0.08)] bg-[#edf4ff] text-[#005bac]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {group.isOpenCurrent ? `${CURRENT_SEMESTER_SHORT_LABEL} 개설 중` : '현재 미개설'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-y border-[rgba(15,23,42,0.08)] py-4 md:flex-row md:items-center md:justify-between">
              <StarRating value={group.rating} size="md" reviewCount={group.reviewCount} />
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600">
                  난이도 {difficultyLabel[group.difficulty]}
                </Badge>
                <Badge className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600">
                  학습량 {workloadLabel[group.workload]}
                </Badge>
                <Badge className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600">
                  분반 {group.sections.length}개
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {group.sections.slice(0, 3).map((section) => (
                <span
                  key={section.id}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    selectedSection?.id === section.id
                      ? 'bg-[#e8f2ff] text-[#005bac]'
                      : 'bg-[#f4f6f8] text-slate-500'
                  }`}
                >
                  {section.timeSummary ? `${section.sectionLabel} · ${section.timeSummary}` : section.sectionLabel}
                </span>
              ))}
              {group.sections.length > 3 ? (
                <span className="rounded-full bg-[#f4f6f8] px-3 py-1.5 text-xs font-bold text-slate-500">
                  +{group.sections.length - 3}개 분반
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant={selectedSection ? 'secondary' : 'outline'}
                onClick={() => onCartAction(group)}
                className="h-11 rounded-full px-5 text-sm font-bold"
              >
                <ShoppingBag className="h-4 w-4" />
                {selectedSection
                  ? hasMultipleSections
                    ? `담긴 분반 변경 (${selectedSection.sectionLabel})`
                    : '시간표 장바구니에서 제거'
                  : hasMultipleSections
                    ? '분반 고르고 시간표 장바구니 담기'
                    : '바로 시간표 장바구니 담기'}
              </Button>

              <Button asChild className="h-11 rounded-full px-6 text-sm font-bold text-white">
                <Link to={`/course/${encodeURIComponent(group.id)}`}>강의평 보러가기</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SubjectAccordionCard({
  group,
  expanded,
  onToggle,
  cartIds,
  onCartAction,
}: {
  group: BrowseSubjectGroup;
  expanded: boolean;
  onToggle: () => void;
  cartIds: string[];
  onCartAction: (group: CourseProfessorGroup) => void;
}) {
  return (
    <Card
      className={`overflow-hidden rounded-[1.6rem] border transition-all ${
        group.isOpenCurrent
          ? 'border-[rgba(15,23,42,0.08)] bg-white'
          : 'border-slate-200 bg-[#f3f5f7]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
      >
        <CardContent className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${group.isOpenCurrent ? 'text-[#005bac]' : 'text-slate-500'}`}>
                {group.category === '전공' ? '전공 강의' : '교양 강의'}
              </p>
              <h3 className={`mt-2 text-xl font-black tracking-tight md:text-[1.65rem] ${group.isOpenCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                {group.name}
              </h3>
              <p className={`mt-2 text-sm font-semibold ${group.isOpenCurrent ? 'text-slate-600' : 'text-slate-400'}`}>
                {group.department} · {group.professorGroups.length}명
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  group.isOpenCurrent
                    ? 'border border-[rgba(15,23,42,0.08)] bg-[#f6f9fc] text-slate-700'
                    : 'border border-slate-200 bg-white text-slate-500'
                }`}
              >
                {group.type}
              </Badge>

              <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${group.isOpenCurrent ? 'border-[rgba(15,23,42,0.08)] bg-[#f7fafc] text-[#005bac]' : 'border-slate-200 bg-white text-slate-400'}`}>
                {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </div>
          </div>
        </CardContent>
      </button>

      {expanded && (
        <div className="border-t border-[#005bac]/8 bg-white px-5 pb-2 md:px-6">
          <div className="divide-y divide-[rgba(15,23,42,0.08)] pt-2">
            {group.professorGroups.map((professorGroup) => {
              const selectedSection = findGroupSelectionInCart(cartIds, professorGroup);
              const hasMultipleSections = professorGroup.sections.length > 1;

              return (
                <div
                  key={professorGroup.id}
                  className="py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-black text-slate-900">
                          {professorGroup.professor}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            professorGroup.isOpenCurrent
                              ? 'bg-[#edf4ff] text-[#005bac]'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {professorGroup.isOpenCurrent ? `${CURRENT_SEMESTER_SHORT_LABEL} 개설` : '과거 개설'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        리뷰 {professorGroup.reviewCount}개 · 분반 {professorGroup.sections.length}개
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {professorGroup.sections.slice(0, 3).map((section) => (
                          <span
                            key={section.id}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              selectedSection?.id === section.id
                                ? 'bg-[#edf4ff] text-[#005bac]'
                                : 'bg-[#f4f6f8] text-slate-500'
                            }`}
                          >
                            {section.timeSummary ? `${section.sectionLabel} · ${section.timeSummary}` : section.sectionLabel}
                          </span>
                        ))}
                        {professorGroup.sections.length > 3 ? (
                          <span className="rounded-full bg-[#f4f6f8] px-2.5 py-1 text-[11px] font-bold text-slate-500">
                            +{professorGroup.sections.length - 3}개 분반
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <StarRating value={professorGroup.rating} size="sm" showValue={true} reviewCount={professorGroup.reviewCount} />

                      <Button
                        type="button"
                        variant={selectedSection ? 'secondary' : 'outline'}
                        onClick={() => onCartAction(professorGroup)}
                        className="h-10 rounded-full px-4 text-sm font-bold"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        {selectedSection
                          ? hasMultipleSections
                            ? selectedSection.sectionLabel
                            : '장바구니 제거'
                          : hasMultipleSections
                            ? '분반 선택'
                            : '바로 담기'}
                      </Button>

                      <Button asChild className="h-10 rounded-full px-5 text-sm font-bold text-white">
                        <Link to={`/course/${encodeURIComponent(professorGroup.id)}`}>강의평 보기</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [selectedCategory, setSelectedCategory] = useState<'전체' | '전공' | '교양'>('전체');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMajorType, setSelectedMajorType] = useState<string>('전체');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState('전체');
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(['전체']);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [isCartPanelOpen, setIsCartPanelOpen] = useState(false);
  const [sectionPickerGroup, setSectionPickerGroup] = useState<CourseProfessorGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  };

  const toggleSubject = (subjectKey: string) => {
    setExpandedSubjects((prev) =>
      prev.includes(subjectKey)
        ? prev.filter((key) => key !== subjectKey)
        : [...prev, subjectKey],
    );
  };

  const openSectionPicker = (group: CourseProfessorGroup) => {
    setSectionPickerGroup(group);
  };

  const handleCartAction = (group: CourseProfessorGroup) => {
    if (group.sections.length > 1) {
      openSectionPicker(group);
      return;
    }

    const onlySection = group.sections[0];
    if (!onlySection) {
      return;
    }

    const selectedSection = findGroupSelectionInCart(cartIds, group);
    const idsInGroup = new Set(group.courses.map((course) => course.id));

    if (selectedSection) {
      const next = cartIds.filter((courseId) => !idsInGroup.has(courseId));
      setCartIds(next);
      saveTimetableCartIds(next);
      saveSelectedTimetableIds(loadSelectedTimetableIds().filter((savedId) => !idsInGroup.has(savedId)));
      toast.success('시간표 장바구니에서 제거했습니다.');
      return;
    }

    const next = replaceGroupSelectionInCart(cartIds, group, onlySection.id);
    setCartIds(next);
    saveTimetableCartIds(next);
    saveSelectedTimetableIds(loadSelectedTimetableIds().filter((savedId) => !idsInGroup.has(savedId)));
    toast.success('시간표 장바구니에 담았습니다.');
    setIsCartPanelOpen(true);
  };

  const handleConfirmSection = (courseId: string) => {
    if (!sectionPickerGroup) {
      return;
    }

    setCartIds((prev) => {
      const next = replaceGroupSelectionInCart(prev, sectionPickerGroup, courseId);
      saveTimetableCartIds(next);
      return next;
    });
    const idsInGroup = new Set(sectionPickerGroup.courses.map((course) => course.id));
    saveSelectedTimetableIds(loadSelectedTimetableIds().filter((savedId) => !idsInGroup.has(savedId)));

    const selectedSection = sectionPickerGroup.sections.find((section) => section.id === courseId);
    toast.success(
      `${selectedSection?.sectionLabel ?? '선택한 분반'}을 시간표 장바구니에 담았습니다.`,
    );
    setSectionPickerGroup(null);
    setIsCartPanelOpen(true);
  };

  const handleRemoveGroupSelection = () => {
    if (!sectionPickerGroup) {
      return;
    }

    const idsInGroup = new Set(sectionPickerGroup.courses.map((course) => course.id));
    setCartIds((prev) => {
      const next = prev.filter((courseId) => !idsInGroup.has(courseId));
      saveTimetableCartIds(next);
      return next;
    });
    saveSelectedTimetableIds(loadSelectedTimetableIds().filter((savedId) => !idsInGroup.has(savedId)));
    toast.success('시간표 장바구니에서 제거했습니다.');
    setSectionPickerGroup(null);
  };

  const removeFromCart = (courseId: string) => {
    setCartIds((prev) => {
      const next = prev.filter((id) => id !== courseId);
      saveTimetableCartIds(next);
      return next;
    });
    saveSelectedTimetableIds(loadSelectedTimetableIds().filter((savedId) => savedId !== courseId));
  };

  useEffect(() => {
    setCartIds(loadTimetableCartIds());
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const results = await courseService.getDepartments();
        setDepartmentOptions(['전체', ...results]);
      } catch (error) {
        console.error('Failed to fetch departments', error);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchAllCourses = async () => {
      if (cartIds.length === 0 && !isCartPanelOpen) {
        return;
      }

      try {
        const results = await courseService.getAllCourses();
        setAllCourses(results);
      } catch (error) {
        console.error('Failed to fetch all courses for timetable cart', error);
      }
    };

    fetchAllCourses();
  }, [cartIds.length, isCartPanelOpen]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await userService.getCurrentUser();
        if (user?.department) {
          setSelectedDepartment(user.department);
        }
      } catch (error) {
        console.error('Failed to fetch user', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    let isStale = false;

    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        let results: Course[] = [];

        if (query.trim()) {
          results = await courseService.searchCourses(query, selectedDepartment);
        } else {
          if (selectedCategory === '전체') {
            if (selectedTheme === 'top-rated') {
              results = await courseService.getFamousCourses();
            } else if (selectedTheme === 'easy-credit') {
              results = await courseService.getHoneyGE();
            } else if (selectedTheme === 'most-reviewed') {
              results = await courseService.getVerifiedCourses();
            } else if (selectedTheme === 'growth') {
              results = await courseService.getGrowthCourses();
            } else {
              results = await courseService.getAllCourses();
            }
          } else {
            results = await courseService.getAllCourses();
          }

          if (selectedDepartment !== '전체') {
            results = results.filter((course) => course.department === selectedDepartment);
          }
        }

        if (selectedCategory !== '전체') {
          results = results.filter((course) => course.category === selectedCategory);
        }

        if (selectedMajorType !== '전체' && selectedCategory === '전공') {
          results = results.filter((course) => course.type === selectedMajorType);
        }

        if (selectedTypes.length > 0 && selectedCategory === '교양') {
          results = results.filter((course) => selectedTypes.includes(course.type));
        }

        if (selectedCategory === '전체' && query.trim()) {
          if (selectedTheme === 'top-rated') {
            results = results.filter((course) => course.rating >= 4.3);
          } else if (selectedTheme === 'easy-credit') {
            results = results.filter((course) => course.difficulty === 'easy');
          } else if (selectedTheme === 'most-reviewed') {
            results = results.filter((course) => course.reviewCount >= 30);
          } else if (selectedTheme === 'growth') {
            results = results.filter((course) => course.workload === 'heavy');
          }
        }

        if (!isStale) {
          setCourses(results);
        }
      } catch (error) {
        if (!isStale) {
          console.error('Failed to search courses', error);
        }
      } finally {
        if (!isStale) {
          setIsLoading(false);
        }
      }
    };

    fetchCourses();

    return () => {
      isStale = true;
    };
  }, [query, selectedDepartment, selectedCategory, selectedTypes, selectedMajorType, selectedTheme]);

  const professorGroups = useMemo(
    () => groupCoursesByProfessor(courses, buildSlotsByCourseId(courses)),
    [courses],
  );

  const groupedSubjects = useMemo<BrowseSubjectGroup[]>(() => {
    const map = new Map<string, BrowseSubjectGroup>();

    for (const professorGroup of professorGroups) {
      const key = getSubjectGroupKey(professorGroup.primaryCourse);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          name: professorGroup.name,
          department: professorGroup.department,
          category: professorGroup.category,
          type: professorGroup.type,
          isOpenCurrent: professorGroup.isOpenCurrent,
          professorGroups: [professorGroup],
        });
        continue;
      }

      existing.professorGroups.push(professorGroup);
      existing.isOpenCurrent = existing.isOpenCurrent || professorGroup.isOpenCurrent;
    }

    return [...map.values()]
      .map((group) => ({
        ...group,
        professorGroups: [...group.professorGroups].sort((a, b) =>
          a.professor.localeCompare(b.professor, 'ko'),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [professorGroups]);

  const currentOpenSubjects = groupedSubjects.filter((group) => group.isOpenCurrent);
  const archivedSubjects = groupedSubjects.filter((group) => !group.isOpenCurrent);
  const cartCourses = useMemo(
    () =>
      allCourses
        .filter((course) => cartIds.includes(course.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [allCourses, cartIds],
  );
  const sortedSearchResults = useMemo(() => professorGroups, [professorGroups]);
  return (
    <div className="min-h-screen">
      <div className="page-shell py-8">
        <section className="mb-6 page-panel bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_100%)] px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="section-kicker">Course Browse</p>
              <h1 className="mt-2 text-[1.9rem] font-black tracking-[-0.04em] text-slate-950 md:text-[2.1rem]">
                강의를 둘러보고, 바로 시간표 후보에 담아보세요.
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                전공, 교양, 학과, 현재 개설 여부를 기준으로 강의를 정리해서 볼 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedDepartment !== '전체' ? <span className="outline-chip">{selectedDepartment}</span> : null}
              {selectedCategory !== '전체' ? <span className="outline-chip">{selectedCategory}</span> : null}
              {query ? <span className="outline-chip">"{query}"</span> : null}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside>
            <div className="page-panel sticky top-24 p-5">
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className={`rounded-[1.5rem] border px-4 py-4 ${
                    selectedDepartment === '전체'
                      ? 'border-slate-200 bg-[#fafbfd]'
                      : 'border-[#d9e6f4] bg-[#f5f9ff]'
                  }`}>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">선택 학과</p>
                    <div className="mt-2 flex flex-col gap-4">
                      <div>
                        <p className={`text-2xl font-black tracking-tight ${
                          selectedDepartment === '전체' ? 'text-slate-900' : 'text-[#005bac]'
                        }`}>
                          {selectedDepartment}
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          {selectedDepartment === '전체'
                            ? '전체 학과 기준으로 강의를 보고 있습니다.'
                            : '이 학과를 기준으로 강의 목록과 검색 결과를 먼저 보여줍니다.'}
                        </p>
                      </div>

                      <div>
                        <label className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">학과 변경</label>
                        <div className="mt-3">
                          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                            <SelectTrigger className="h-11 rounded-xl border-white/70 bg-white font-semibold text-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {departmentOptions.map((department) => (
                                <SelectItem key={department} value={department}>
                                  {department}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">이수 구분</label>
                    <div className="flex rounded-xl border border-slate-100 bg-slate-50 p-1">
                      {['전체', '전공', '교양'].map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category as typeof selectedCategory);
                            setSelectedTypes([]);
                            setSelectedMajorType('전체');
                            setSelectedTheme('all');
                          }}
                          className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
                            selectedCategory === category
                              ? 'bg-white text-[#005bac] shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedCategory === '전체' && (
                    <div className="space-y-3">
                      <label className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">추천 테마</label>
                      <div className="grid gap-2">
                        {themes.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setSelectedTheme(theme.id)}
                            className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                              selectedTheme === theme.id
                                ? 'border-[rgba(15,23,42,0.08)] bg-[#edf4ff] text-[#005bac]'
                                : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                            }`}
                          >
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCategory === '전공' && (
                    <div className="space-y-3">
                      <label className="text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">전공 분류</label>
                      <div className="grid gap-2">
                        {['전체', ...majorTypes].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setSelectedMajorType(type)}
                            className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                              selectedMajorType === type
                                ? 'border-[rgba(15,23,42,0.08)] bg-[#edf4ff] text-[#005bac]'
                                : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCategory === '교양' && (
                    <div className="max-h-[440px] space-y-6 overflow-y-auto pr-2">
                      {Object.entries(geGroups).map(([groupName, types]) => (
                        <div key={groupName} className="space-y-3">
                          <label className="pl-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {groupName}
                          </label>
                          <div className="grid gap-2">
                            {types.map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => toggleType(type)}
                                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                                  selectedTypes.includes(type)
                                    ? 'border-[rgba(15,23,42,0.08)] bg-[#edf4ff] text-[#005bac]'
                                    : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            {query && (
              <div className="mb-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                <span className="text-base font-black text-slate-950">"{query}" 검색 결과</span>
                <span className="rounded-full bg-[#edf4ff] px-3 py-1 text-xs font-black text-[#005bac]">
                  {isLoading ? '...' : sortedSearchResults.length}
                </span>
                {selectedDepartment !== '전체' && (
                  <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    {selectedDepartment}
                  </span>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((index) => (
                  <CourseCardSkeleton key={index} />
                ))}
              </div>
            ) : query ? (
              <div className="space-y-4">
                {sortedSearchResults.map((group) => (
                  <SearchResultCard
                    key={group.id}
                    group={group}
                    selectedCourseId={findGroupSelectionInCart(cartIds, group)?.id ?? null}
                    onCartAction={handleCartAction}
                  />
                ))}

                {sortedSearchResults.length === 0 && (
                  <div className="rounded-[2rem] border border-dashed border-[rgba(15,23,42,0.12)] bg-white p-12 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f8fc] text-slate-400">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-lg font-bold text-slate-700">검색 결과가 없습니다.</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      다른 강의명이나 교수님 이름으로 다시 찾아보거나 학과 필터를 풀어보세요.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-10">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-black tracking-tight text-slate-950">이번 학기 개설 과목</h3>
                      {selectedDepartment !== '전체' && (
                        <span className="rounded-full border border-[#cfe0f1] bg-[#edf4ff] px-3 py-1.5 text-xs font-black text-[#005bac]">
                          {selectedDepartment}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full bg-[#edf4ff] px-3 py-1.5 text-xs font-black text-[#005bac]">
                      {currentOpenSubjects.length}개
                    </span>
                  </div>

                  <div className="space-y-4">
                    {currentOpenSubjects.length > 0 ? (
                      sortByKoreanName(currentOpenSubjects).map((group) => (
                        <SubjectAccordionCard
                          key={group.key}
                          group={group}
                          expanded={expandedSubjects.includes(group.key)}
                          onToggle={() => toggleSubject(group.key)}
                          cartIds={cartIds}
                          onCartAction={handleCartAction}
                        />
                      ))
                    ) : (
                      <div className="rounded-[2rem] border border-dashed border-[#cfe0f1] bg-[#f8fbff] p-10 text-center">
                        <p className="text-lg font-bold text-slate-700">이번 학기 개설 과목이 없습니다.</p>
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          현재 필터 기준으로는 이번 학기 강의가 잡히지 않았습니다. 학과나 구분을 조금 넓혀보세요.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black tracking-tight text-slate-500">현재 미개설 과목</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
                      {archivedSubjects.length}개
                    </span>
                  </div>

                  <div className="space-y-4">
                    {archivedSubjects.length > 0 ? (
                      sortByKoreanName(archivedSubjects).map((group) => (
                        <SubjectAccordionCard
                          key={group.key}
                          group={group}
                          expanded={expandedSubjects.includes(group.key)}
                          onToggle={() => toggleSubject(group.key)}
                          cartIds={cartIds}
                          onCartAction={handleCartAction}
                        />
                      ))
                    ) : (
                      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                        <p className="text-lg font-bold text-slate-600">현재 미개설 과목이 없습니다.</p>
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          지금 보이는 결과는 대부분 이번 학기 개설 과목입니다.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {groupedSubjects.length === 0 && (
                  <div className="rounded-[2rem] border border-dashed border-[rgba(15,23,42,0.12)] bg-white p-12 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f8fc] text-slate-400">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-lg font-bold text-slate-700">조건에 맞는 강의가 없습니다.</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      학과, 이수 구분, 추천 테마를 조금 완화하면 더 많은 강의를 볼 수 있습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsCartPanelOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-full bg-gradient-to-r from-[#005bac] to-[#1084e8] px-5 py-3 text-sm font-black text-white shadow-[0_20px_40px_rgba(0,91,172,0.28)] transition-transform hover:-translate-y-0.5 xl:hidden"
      >
        <CalendarClock className="h-4 w-4" />
        시간표 장바구니
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{cartIds.length}</span>
      </button>

      <TimetablePanel
        open={isCartPanelOpen}
        cartCourses={cartCourses}
        onClose={() => setIsCartPanelOpen(false)}
        onToggleCart={removeFromCart}
      />

      <SectionSelectDialog
        open={sectionPickerGroup !== null}
        group={sectionPickerGroup}
        currentCourseId={sectionPickerGroup ? findGroupSelectionInCart(cartIds, sectionPickerGroup)?.id ?? null : null}
        onClose={() => setSectionPickerGroup(null)}
        onConfirm={handleConfirmSection}
        onRemove={sectionPickerGroup ? handleRemoveGroupSelection : undefined}
      />
    </div>
  );
}
