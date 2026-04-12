import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Loader2, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { courseService, reviewService, userService } from '../api/api';
import { Course, CreateReviewInput } from '../types/types';
import { toast } from 'sonner';
import { buildSemesterOptions } from '../lib/semester';

type ScaleAnswer = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type BinaryChoice = 'yes' | 'no' | null;

type QuestionConfig = {
  id: string;
  prompt: string;
  reverse?: boolean;
  negativeHint?: string;
};

type SectionConfig = {
  id: string;
  number: string;
  emoji: string;
  title: string;
  accentClass: string;
  softClass: string;
  borderClass: string;
  questions: QuestionConfig[];
};

const scaleDescriptors: Record<ScaleAnswer, string> = {
  1: '매우 그렇다',
  2: '그렇다',
  3: '조금 그렇다',
  4: '보통이다',
  5: '조금 아니다',
  6: '아니다',
  7: '전혀 아니다',
};

const scaleScoreMap: Record<ScaleAnswer, number> = {
  1: 5,
  2: 4,
  3: 4,
  4: 3,
  5: 2,
  6: 2,
  7: 1,
};

const scaleSizes = [
  'h-12 w-12 md:h-14 md:w-14',
  'h-10 w-10 md:h-12 md:w-12',
  'h-9 w-9 md:h-10 md:w-10',
  'h-8 w-8 md:h-9 md:w-9',
  'h-9 w-9 md:h-10 md:w-10',
  'h-10 w-10 md:h-12 md:w-12',
  'h-12 w-12 md:h-14 md:w-14',
] as const;

const examTypeOptions = ['객관식', '서술형', '계산형', 'OX', '기타'] as const;
const assignmentTypeOptions = [
  '과제 없음',
  '큰 과제 여러 번',
  '큰 과제 한 번',
  '단순 과제 여러 번',
  '단순 과제 한 번',
] as const;

const difficultyQuestions: QuestionConfig[] = [
  { id: 'difficulty_1', prompt: '시험 난이도가 어려운 편이다.' },
  { id: 'difficulty_2', prompt: '수업 자료만으로도 시험 대비가 충분하다.', reverse: true },
  { id: 'difficulty_3', prompt: '시험 시간 내에 문제를 풀기에는 시간이 부족한 편이다.' },
  { id: 'difficulty_4', prompt: '중간고사와 기말고사의 난이도 차이가 큰 편이다.' },
];


const gradingQuestions: QuestionConfig[] = [
  { id: 'grading_1', prompt: '노력한 만큼 점수가 잘 반영되는 편이다.' },
  { id: 'grading_2', prompt: '플러스를 잘 채워주시는 편이다.' },
];

const assignmentQuestions: QuestionConfig[] = [
  { id: 'assignment_1', prompt: '과제 빈도가 높은 편이다.' },
  { id: 'assignment_2', prompt: '과제 난이도가 높은 편이다.' },
];

const prerequisiteQuestions: QuestionConfig[] = [
  { id: 'prerequisite_1', prompt: '수업을 듣기 위해 선수 지식이 필요한 편이다.' },
  { id: 'prerequisite_2', prompt: '선수 지식의 유무에 따라 강의 난이도가 크게 달라지는 편이다.' },
];

const depthQuestions: QuestionConfig[] = [
  { id: 'depth_1', prompt: '강의는 입문 수준에 가까운 편이다.', reverse: true },
  { id: 'depth_2', prompt: '실무/응용보다 이론 중심의 강의다.' },
  { id: 'depth_3', prompt: '개념을 얇고 넓게 다루는 편이다.', reverse: true },
  { id: 'depth_4', prompt: '상위 전공 과목으로 이어지는 성격이 강하다.' },
];

const examStyleQuestions: QuestionConfig[] = [
  { id: 'exam_style_1', prompt: '교수님이 시험에 대한 정보를 충분히 제공하는 편이다.' },
  { id: 'exam_style_2', prompt: '단순 암기보다 응용 문제가 많은 편이다.' },
  { id: 'exam_style_3', prompt: '족보나 기출 문제의 영향이 큰 편이다.' },
];

const teamQuestions: QuestionConfig[] = [
  { id: 'team_1', prompt: '팀 프로젝트 비중이 높은 편이다.' },
  { id: 'team_2', prompt: '팀 프로젝트에서 발표 비중이 높다.', negativeHint: '전혀 아니다 = 발표 없음' },
  { id: 'team_3', prompt: '팀 프로젝트에서 보고서 작성 비중이 높다.', negativeHint: '전혀 아니다 = 보고서 제출 없음' },
  { id: 'team_4', prompt: '팀 프로젝트가 성적에 미치는 영향이 큰 편이다.' },
  { id: 'team_5', prompt: '팀원 구성에 따라 체감 난이도가 크게 달라지는 편이다.' },
];

const labQuestions: QuestionConfig[] = [
  { id: 'lab_1', prompt: '실습 수업 비중이 높은 편이다.' },
  { id: 'lab_2', prompt: '실습을 수업 시간 내에 완료할 수 있는 편이다.', reverse: true },
  { id: 'lab_3', prompt: '실습이 성적에 중요한 영향을 미치는 편이다.' },
  { id: 'lab_4', prompt: '실습을 위한 사전 준비가 까다로운 편이다.' },
];

const quizQuestions: QuestionConfig[] = [
  { id: 'quiz_1', prompt: '퀴즈 난이도가 부담스러운 수준이다.' },
  { id: 'quiz_2', prompt: '퀴즈 점수가 최종 성적에 큰 영향을 미치는 편이다.' },
];

const textbookQuestions: QuestionConfig[] = [
  { id: 'textbook_1', prompt: '시험 준비 시 교재가 필요한 편이다.' },
  { id: 'textbook_2', prompt: '수업은 교재보다 강의자료 중심으로 진행된다.', reverse: true },
];

const examInfoQuestions: QuestionConfig[] = [
  { id: 'exam_info_1', prompt: '시험 범위를 구체적으로 안내해 주는 편이다.' },
  { id: 'exam_info_2', prompt: '중요한 시험 포인트에 대한 힌트를 제공하는 편이다.' },
  { id: 'exam_info_3', prompt: '시험 문제가 예상 가능한 범위에서 출제되는 편이다.' },
];

const surveySections: SectionConfig[] = [
  {
    id: 'difficulty',
    number: '1',
    emoji: '🔵',
    title: '시험 난이도',
    accentClass: 'text-[#2164c8]',
    softClass: 'bg-[#edf4ff]',
    borderClass: 'border-[#d7e6fb]',
    questions: difficultyQuestions,
  },
  {
    id: 'grading',
    number: '2',
    emoji: '🟡',
    title: '학점 비율',
    accentClass: 'text-[#b8860b]',
    softClass: 'bg-[#fff8df]',
    borderClass: 'border-[#f2e3a0]',
    questions: gradingQuestions,
  },
  {
    id: 'assignment',
    number: '3',
    emoji: '🔴',
    title: '과제량',
    accentClass: 'text-[#cb4a3e]',
    softClass: 'bg-[#fff1ef]',
    borderClass: 'border-[#f6d5d0]',
    questions: assignmentQuestions,
  },
  {
    id: 'prerequisite',
    number: '4',
    emoji: '🟠',
    title: '선수지식 필요도',
    accentClass: 'text-[#da6f1a]',
    softClass: 'bg-[#fff3e7]',
    borderClass: 'border-[#f3d8bf]',
    questions: prerequisiteQuestions,
  },
  {
    id: 'depth',
    number: '5',
    emoji: '🟤',
    title: '전공 심화도',
    accentClass: 'text-[#7c5a3f]',
    softClass: 'bg-[#f7f2ed]',
    borderClass: 'border-[#e8ddd0]',
    questions: depthQuestions,
  },
  {
    id: 'examStyle',
    number: '6',
    emoji: '🧾',
    title: '시험 방식',
    accentClass: 'text-[#465aaf]',
    softClass: 'bg-[#eef1ff]',
    borderClass: 'border-[#d7ddff]',
    questions: examStyleQuestions,
  },
  {
    id: 'team',
    number: '7',
    emoji: '⚪',
    title: '팀플 / 발표',
    accentClass: 'text-[#5d6677]',
    softClass: 'bg-[#f3f5f8]',
    borderClass: 'border-[#dde3ec]',
    questions: teamQuestions,
  },
  {
    id: 'lab',
    number: '8',
    emoji: '🟢',
    title: '실습',
    accentClass: 'text-[#1c8e58]',
    softClass: 'bg-[#edf9f2]',
    borderClass: 'border-[#d2f0de]',
    questions: labQuestions,
  },
  {
    id: 'quiz',
    number: '9',
    emoji: '🔵',
    title: '퀴즈',
    accentClass: 'text-[#0f76bc]',
    softClass: 'bg-[#eff7ff]',
    borderClass: 'border-[#d5e8f7]',
    questions: quizQuestions,
  },
  {
    id: 'textbook',
    number: '10',
    emoji: '🟣',
    title: '교재 사용도',
    accentClass: 'text-[#9455cd]',
    softClass: 'bg-[#f7efff]',
    borderClass: 'border-[#ead8fb]',
    questions: textbookQuestions,
  },
  {
    id: 'examInfo',
    number: '11',
    emoji: '🟡',
    title: '시험 정보',
    accentClass: 'text-[#ae8512]',
    softClass: 'bg-[#fff8e6]',
    borderClass: 'border-[#f3e4b0]',
    questions: examInfoQuestions,
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const average = (values: number[], fallback = 3) => {
  if (values.length === 0) {
    return fallback;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const toFivePointScore = (value: ScaleAnswer, reverse = false) => {
  const base = scaleScoreMap[value];
  return reverse ? 6 - base : base;
};

const toTrinaryLabel = (
  score: number,
  low: CreateReviewInput['difficulty'] | CreateReviewInput['workload'] | CreateReviewInput['grading'],
  mid: CreateReviewInput['difficulty'] | CreateReviewInput['workload'] | CreateReviewInput['grading'],
  high: CreateReviewInput['difficulty'] | CreateReviewInput['workload'] | CreateReviewInput['grading'],
) => {
  if (score >= 4) return high;
  if (score <= 2) return low;
  return mid;
};

const scaleAnswerToSummary = (value?: number) => {
  if (!value) {
    return null;
  }

  return scaleDescriptors[value as ScaleAnswer];
};

function LikertQuestion({
  question,
  value,
  onChange,
  selectedPulseValue,
  emphasize = false,
}: {
  question: QuestionConfig;
  value?: number;
  onChange: (nextValue: ScaleAnswer) => void;
  selectedPulseValue?: number | null;
  emphasize?: boolean;
}) {
  return (
    <div className={`rounded-[1.35rem] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-5 shadow-[0_6px_20px_rgba(15,23,42,0.035)] transition-all duration-300 ${
      emphasize ? 'review-card-focus review-rise-in' : ''
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-black tracking-tight text-slate-900">{question.prompt}</p>
          {question.negativeHint ? (
            <p className="mt-1.5 text-xs font-semibold text-slate-400">{question.negativeHint}</p>
          ) : null}
        </div>
        {value ? (
          <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-1 text-[11px] font-black text-slate-600">
            {scaleDescriptors[value as ScaleAnswer]}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between text-sm font-semibold">
          <span className="text-[#24936a]">그렇다</span>
          <span className="text-[#935db2]">그렇지 않다</span>
        </div>

        <div className="grid grid-cols-7 items-center gap-2 md:gap-3">
          {scaleSizes.map((sizeClass, index) => {
            const scaleValue = (index + 1) as ScaleAnswer;
            const isSelected = value === scaleValue;
            const isLeftSide = scaleValue < 4;
            const isCenter = scaleValue === 4;
            const toneClass = isCenter
              ? 'border-slate-300 text-slate-400'
              : isLeftSide
                ? 'border-[#2fa573] text-[#2fa573]'
                : 'border-[#9461b5] text-[#9461b5]';
            const activeClass = isCenter
              ? 'bg-slate-100 text-slate-700'
              : isLeftSide
                ? 'bg-[#2fa573] text-white shadow-[0_10px_24px_rgba(47,165,115,0.18)]'
                : 'bg-[#9461b5] text-white shadow-[0_10px_24px_rgba(148,97,181,0.18)]';

            return (
              <button
                key={scaleValue}
                type="button"
                onClick={() => onChange(scaleValue)}
                className={`flex items-center justify-center rounded-full border-[3px] font-black transition-all duration-150 hover:scale-[1.03] ${
                  isSelected ? activeClass : `${toneClass} bg-white`
                } ${selectedPulseValue === scaleValue ? 'review-choice-pop' : ''} ${sizeClass}`}
                aria-label={`${question.prompt} ${scaleDescriptors[scaleValue]}`}
              >
                <span className="text-[11px] md:text-xs">{scaleValue}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnsweredQuestionSummary({
  question,
  value,
  onClick,
  active = false,
}: {
  question: QuestionConfig;
  value?: number;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`review-fold-in w-full rounded-[1.1rem] border px-4 py-3 text-left transition-all ${
        active
          ? 'border-[#bfd5f5] bg-[#eef5ff]'
          : 'border-[rgba(15,23,42,0.06)] bg-[#f8fafc] hover:border-[rgba(15,23,42,0.1)]'
      }`}
    >
      <p className="text-sm font-semibold leading-6 text-slate-700">{question.prompt}</p>
      <div className="mt-2 flex items-center gap-2">
        {value ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#005bac]">
            {scaleDescriptors[value as ScaleAnswer]}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function BinaryToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: BinaryChoice;
  onChange: (nextValue: BinaryChoice) => void;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[rgba(15,23,42,0.08)] bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">{label}</p>
        </div>
        <div className="flex gap-2">
          {[
            { label: '있음', nextValue: 'yes' as const },
            { label: '없음', nextValue: 'no' as const },
          ].map((choice) => (
            <button
              key={choice.nextValue}
              type="button"
              onClick={() => onChange(choice.nextValue)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                value === choice.nextValue
                  ? 'border-[#005bac] bg-[#edf4ff] text-[#005bac]'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChoicePills({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (nextValue: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
              isActive
                ? 'border-[#005bac] bg-[#edf4ff] text-[#005bac]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function ReviewWritePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [assignmentType, setAssignmentType] = useState<string>('');
  const [selectedExamTypes, setSelectedExamTypes] = useState<string[]>([]);
  const [teamProject, setTeamProject] = useState<BinaryChoice>(null);
  const [labIncluded, setLabIncluded] = useState<BinaryChoice>(null);
  const [quizIncluded, setQuizIncluded] = useState<BinaryChoice>(null);
  const [prerequisiteDetails, setPrerequisiteDetails] = useState('');
  const [otherExamTypeDescription, setOtherExamTypeDescription] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [pulseQuestionId, setPulseQuestionId] = useState<string | null>(null);
  const [pulseValue, setPulseValue] = useState<number | null>(null);
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const availableSemesters = useMemo(() => buildSemesterOptions(2024, 1), []);
  const [semester, setSemester] = useState(() => {
    const requestedSemester = searchParams.get('semester');
    if (requestedSemester && availableSemesters.includes(requestedSemester)) {
      return requestedSemester;
    }

    return availableSemesters[0] ?? '2024-1학기';
  });

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await courseService.getCourseById(courseId);
        setCourse(data || null);
      } catch (error) {
        console.error('Failed to fetch course', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    if (!availableSemesters.includes(semester)) {
      setSemester(availableSemesters[0] ?? '2024-1학기');
    }
  }, [availableSemesters, semester]);

  const getQuestionScore = (question: QuestionConfig) => {
    const answer = answers[question.id];
    if (!answer) {
      return null;
    }

    return toFivePointScore(answer as ScaleAnswer, question.reverse);
  };

  const getSectionAverage = (questions: QuestionConfig[], fallback = 3) => {
    const questionScores = questions
      .map((question) => getQuestionScore(question))
      .filter((value): value is number => value !== null);

    return Math.round(average(questionScores, fallback));
  };

  const prerequisiteScore = getSectionAverage(prerequisiteQuestions);
  const prerequisiteNeedsDetails = prerequisiteScore >= 4;

  const visibleQuestions = [
    ...difficultyQuestions,
    ...gradingQuestions,
    ...assignmentQuestions,
    ...prerequisiteQuestions,
    ...depthQuestions,
    ...examStyleQuestions,
    ...textbookQuestions,
    ...examInfoQuestions,
    ...(teamProject === 'yes' ? teamQuestions : []),
    ...(labIncluded === 'yes' ? labQuestions : []),
    ...(quizIncluded === 'yes' ? quizQuestions : []),
  ];

  const getBinaryValue = (sectionId: string) => {
    if (sectionId === 'team') return teamProject;
    if (sectionId === 'lab') return labIncluded;
    if (sectionId === 'quiz') return quizIncluded;
    return null;
  };

  const getSectionCompletion = (section: SectionConfig) => {
    const answeredQuestions = section.questions.filter((question) => answers[question.id]).length;

    if (section.id === 'team' || section.id === 'lab' || section.id === 'quiz') {
      const binaryValue = getBinaryValue(section.id);
      const total = binaryValue === 'yes' ? section.questions.length + 1 : 1;
      const answered = binaryValue === null ? 0 : binaryValue === 'yes' ? answeredQuestions + 1 : 1;

      return {
        total,
        answered,
        isComplete: answered >= total,
        binaryValue,
      };
    }

    if (section.id === 'assignment') {
      const total = section.questions.length + 1;
      const answered = answeredQuestions + (assignmentType ? 1 : 0);

      return {
        total,
        answered,
        isComplete: answered >= total,
        binaryValue: null as BinaryChoice,
      };
    }

    if (section.id === 'examStyle') {
      const needsOtherType = selectedExamTypes.includes('기타');
      const total = section.questions.length + 1 + (needsOtherType ? 1 : 0);
      const answered = answeredQuestions +
        (selectedExamTypes.length > 0 ? 1 : 0) +
        (needsOtherType && otherExamTypeDescription.trim().length >= 5 ? 1 : 0);

      return {
        total,
        answered,
        isComplete: answered >= total,
        binaryValue: null as BinaryChoice,
      };
    }

    return {
      total: section.questions.length,
      answered: answeredQuestions,
      isComplete: answeredQuestions >= section.questions.length,
      binaryValue: null as BinaryChoice,
    };
  };

  const sectionCompletion = surveySections.map((section) => ({
    section,
    ...getSectionCompletion(section),
  }));

  const currentSectionIndex = sectionCompletion.findIndex((item) => !item.isComplete);
  const activeSectionIndex = currentSectionIndex === -1 ? sectionCompletion.length - 1 : currentSectionIndex;
  const activeSectionId = sectionCompletion[activeSectionIndex]?.section.id ?? surveySections[0]?.id ?? null;

  useEffect(() => {
    if (!pulseQuestionId) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setPulseQuestionId(null);
      setPulseValue(null);
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [pulseQuestionId]);

  const totalSteps = visibleQuestions.length +
    1 +
    3 +
    1 +
    1 +
    (selectedExamTypes.includes('기타') ? 1 : 0) +
    (prerequisiteNeedsDetails ? 1 : 0) +
    1;
  const completedSteps = visibleQuestions.filter((question) => answers[question.id]).length +
    (rating > 0 ? 1 : 0) +
    (teamProject !== null ? 1 : 0) +
    (labIncluded !== null ? 1 : 0) +
    (quizIncluded !== null ? 1 : 0) +
    (assignmentType ? 1 : 0) +
    (selectedExamTypes.length > 0 ? 1 : 0) +
    (selectedExamTypes.includes('기타') && otherExamTypeDescription.trim().length >= 5 ? 1 : 0) +
    (prerequisiteNeedsDetails && prerequisiteDetails.trim().length >= 5 ? 1 : !prerequisiteNeedsDetails ? 1 : 0) +
    (content.trim().length >= 30 ? 1 : 0);
  const progressPercent = Math.round((completedSteps / Math.max(totalSteps, 1)) * 100);

  const registerTargetRef = (targetId: string) => (node: HTMLDivElement | null) => {
    targetRefs.current[targetId] = node;
  };

  const getCurrentTargetId = () => {
    if (rating === 0) {
      return 'review-rating';
    }

    const activeItem = sectionCompletion[activeSectionIndex];
    if (activeItem) {
      const { section, binaryValue } = activeItem;

      if (section.id === 'assignment' && !assignmentType) {
        return 'assignment-choice';
      }

      if (section.id === 'examStyle') {
        if (selectedExamTypes.length === 0) {
          return 'examStyle-types';
        }

        if (selectedExamTypes.includes('기타') && otherExamTypeDescription.trim().length < 5) {
          return 'examStyle-other';
        }
      }

      if ((section.id === 'team' || section.id === 'lab' || section.id === 'quiz') && binaryValue === null) {
        return `${section.id}-binary`;
      }

      if (
        (section.id === 'team' && teamProject === 'no') ||
        (section.id === 'lab' && labIncluded === 'no') ||
        (section.id === 'quiz' && quizIncluded === 'no')
      ) {
        return `${section.id}-binary`;
      }

      const unansweredQuestion = section.questions.find((question) => !answers[question.id]);
      if (unansweredQuestion) {
        return unansweredQuestion.id;
      }
    }

    if (prerequisiteNeedsDetails && prerequisiteDetails.trim().length < 5) {
      return 'prerequisite-followup';
    }

    if (content.trim().length < 30) {
      return 'review-content';
    }

    return null;
  };

  const currentTargetId = getCurrentTargetId();

  useEffect(() => {
    if (!currentTargetId || typeof window === 'undefined') {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      const targetNode = targetRefs.current[currentTargetId];
      if (!targetNode) {
        return;
      }

      const rect = targetNode.getBoundingClientRect();
      const stickyOffset = 148;
      const nextTop = window.scrollY + rect.top - stickyOffset;

      window.scrollTo({
        top: Math.max(nextTop, 0),
        behavior: 'smooth',
      });
    }, 170);

    return () => window.clearTimeout(timeout);
  }, [currentTargetId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <p className="font-semibold text-slate-500">강의를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const toggleExamType = (examType: string) => {
    setSelectedExamTypes((current) =>
      current.includes(examType)
        ? current.filter((item) => item !== examType)
        : [...current, examType],
    );
  };

  const handleAnswerChange = (questionId: string, nextValue: ScaleAnswer) => {
    setAnswers((current) => ({ ...current, [questionId]: nextValue }));
    setPulseQuestionId(questionId);
    setPulseValue(nextValue);
    setFocusedQuestionId(null);
  };

  const buildTextbookSummary = () => {
    const needsBook = getQuestionScore(textbookQuestions[0]) ?? 3;
    const materialsFirst = getQuestionScore({ ...textbookQuestions[1], reverse: false }) ?? 3;

    if (needsBook >= 4 && materialsFirst <= 2) {
      return '교재 필수';
    }

    if (materialsFirst >= 4) {
      return '강의자료 중심';
    }

    return '교재와 강의자료 병행';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!courseId) {
      return;
    }

    if (rating === 0) {
      toast.error('별점을 선택해주세요.');
      return;
    }

    if (teamProject === null || labIncluded === null || quizIncluded === null) {
      toast.error('팀플, 실습, 퀴즈 여부를 먼저 선택해주세요.');
      return;
    }

    const unansweredCount = visibleQuestions.filter((question) => !answers[question.id]).length;
    if (unansweredCount > 0) {
      toast.error('모든 질문에 응답해주세요.');
      return;
    }

    if (selectedExamTypes.length === 0) {
      toast.error('시험 방식 유형을 하나 이상 선택해주세요.');
      return;
    }

    if (!assignmentType) {
      toast.error('과제 유형을 선택해주세요.');
      return;
    }

    if (selectedExamTypes.includes('기타') && otherExamTypeDescription.trim().length < 5) {
      toast.error('기타 시험 방식 설명을 조금 더 자세히 적어주세요.');
      return;
    }

    if (prerequisiteNeedsDetails && prerequisiteDetails.trim().length < 5) {
      toast.error('필요했던 선수지식을 구체적으로 적어주세요.');
      return;
    }

    if (content.trim().length < 30) {
      toast.error('총평은 30자 이상 작성해주세요.');
      return;
    }

    const diffScore = getSectionAverage(difficultyQuestions);
    const gradScore = getSectionAverage(gradingQuestions);
    const workScore = getSectionAverage(assignmentQuestions);
    const depthScore = getSectionAverage(depthQuestions);
    const examStyleScore = getSectionAverage(examStyleQuestions);
    const examInfoScore = getSectionAverage(examInfoQuestions);

    const payload: CreateReviewInput = {
      courseId,
      semester,
      rating,
      difficulty: toTrinaryLabel(diffScore, 'easy', 'medium', 'hard') as CreateReviewInput['difficulty'],
      workload: toTrinaryLabel(workScore, 'light', 'medium', 'heavy') as CreateReviewInput['workload'],
      attendance: 'medium',
      grading: toTrinaryLabel(gradScore, 'strict', 'medium', 'generous') as CreateReviewInput['grading'],
      content: content.trim(),
      isAnonymous: true,
      diffScore,
      gradScore,
      workScore,
      prerequisiteScore,
      depthScore,
      pastExamScore: clamp(Math.round(average([examStyleScore, examInfoScore])), 1, 5),
      assignmentType,
      textbook: buildTextbookSummary(),
      examTypes: selectedExamTypes
        .filter((item) => item !== '기타')
        .concat(selectedExamTypes.includes('기타') ? [`기타(${otherExamTypeDescription.trim()})`] : []),
      pastExamHelpfulness: `족보/기출 영향도: ${scaleAnswerToSummary(answers.exam_style_3) ?? '보통이다'}`,
      scopePredictability: `시험 범위 예측 가능성: ${scaleAnswerToSummary(answers.exam_info_3) ?? '보통이다'}`,
      examPrepTip: [
        `시험 정보 제공: ${scaleAnswerToSummary(answers.exam_style_1) ?? '보통이다'}`,
        `중요 포인트 힌트: ${scaleAnswerToSummary(answers.exam_info_2) ?? '보통이다'}`,
      ].join(' · '),
      structuredSurvey: {
        answers,
        teamProject: teamProject === 'yes',
        lab: labIncluded === 'yes',
        quiz: quizIncluded === 'yes',
        prerequisiteDetails: prerequisiteNeedsDetails ? prerequisiteDetails.trim() : '',
        otherExamTypeDescription: selectedExamTypes.includes('기타') ? otherExamTypeDescription.trim() : '',
      },
    };

    setIsSubmitting(true);

    try {
      await reviewService.createReview(payload);

      try {
        await userService.addPoints(content.trim().length >= 100 ? 15 : 10, '질문형 강의평 작성');
      } catch {
        // Ignore point refresh failures after a successful review submission.
      }

      toast.success('질문형 강의평이 등록되었습니다.');
      setTimeout(() => {
        navigate(`/course/${courseId}`);
      }, 700);
    } catch (error) {
      toast.error('리뷰 등록 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  const findSectionIdByQuestionId = (questionId: string) => {
    const owner = surveySections.find((section) => section.questions.some((question) => question.id === questionId));
    return owner?.id ?? null;
  };

  const inferStageSectionId = () => {
    if (!currentTargetId) {
      return activeSectionId;
    }

    if (currentTargetId === 'assignment-choice') {
      return 'assignment';
    }

    if (currentTargetId === 'examStyle-types' || currentTargetId === 'examStyle-other') {
      return 'examStyle';
    }

    if (currentTargetId === 'team-binary') return 'team';
    if (currentTargetId === 'lab-binary') return 'lab';
    if (currentTargetId === 'quiz-binary') return 'quiz';

    if (currentTargetId === 'prerequisite-followup' || currentTargetId === 'review-content') {
      return null;
    }

    return findSectionIdByQuestionId(currentTargetId) ?? activeSectionId;
  };

  const stageSectionId = inferStageSectionId();
  const availableSectionItems = sectionCompletion.filter((_, index) => index <= activeSectionIndex);
  const availableSectionIds = availableSectionItems.map((item) => item.section.id);
  const selectedSectionId =
    expandedSectionId && availableSectionIds.includes(expandedSectionId)
      ? expandedSectionId
      : stageSectionId;
  const selectedSectionItem = selectedSectionId
    ? sectionCompletion.find((item) => item.section.id === selectedSectionId) ?? null
    : null;
  const focusedQuestionBelongsToSelectedSection = Boolean(
    focusedQuestionId &&
    selectedSectionItem &&
    selectedSectionItem.section.questions.some((question) => question.id === focusedQuestionId),
  );
  const isReviewingPreviousSection = Boolean(
    expandedSectionId &&
    stageSectionId &&
    expandedSectionId !== stageSectionId,
  );
  const shouldShowFollowupStage = !expandedSectionId && currentTargetId === 'prerequisite-followup';
  const shouldShowReviewStage = !expandedSectionId && currentTargetId === 'review-content';

  const renderSectionBody = ({
    section,
    binaryValue,
    shouldHideQuestions,
    useFocusedFlow,
    answeredQuestions,
    activeQuestion,
    focusedQuestionIdForSection,
  }: {
    section: SectionConfig;
    binaryValue: BinaryChoice;
    shouldHideQuestions: boolean;
    useFocusedFlow: boolean;
    answeredQuestions: QuestionConfig[];
    activeQuestion: QuestionConfig | null;
    focusedQuestionIdForSection: string | null;
  }) => {
    const isAssignmentSelectionStage = section.id === 'assignment' && !assignmentType;
    const isExamTypeSelectionStage = section.id === 'examStyle' && selectedExamTypes.length === 0;
    const isExamOtherStage =
      section.id === 'examStyle' &&
      selectedExamTypes.includes('기타') &&
      otherExamTypeDescription.trim().length < 5;
    const isBinarySelectionStage =
      (section.id === 'team' || section.id === 'lab' || section.id === 'quiz') && binaryValue === null;
    const shouldShowQuestionStage =
      !shouldHideQuestions &&
      !isAssignmentSelectionStage &&
      !isExamTypeSelectionStage &&
      !isExamOtherStage &&
      !isBinarySelectionStage;

    return (
      <div className="space-y-4">
        {section.id === 'assignment' ? (
          <div
            ref={registerTargetRef('assignment-choice')}
            className="scroll-mt-40 rounded-[1.25rem] border border-[rgba(15,23,42,0.08)] bg-white p-4"
          >
            {!assignmentType ? (
              <>
                <Label className="text-sm font-black text-slate-900">과제 유형</Label>
                <div className="mt-4">
                  <ChoicePills
                    options={assignmentTypeOptions}
                    value={assignmentType}
                    onChange={setAssignmentType}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-900">과제 유형</span>
                  <span className="rounded-full bg-[#edf4ff] px-3 py-1 text-[11px] font-black text-[#005bac]">
                    {assignmentType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignmentType('')}
                  className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-1 text-[11px] font-black text-slate-600"
                >
                  수정
                </button>
              </div>
            )}
          </div>
        ) : null}

        {section.id === 'examStyle' ? (
          <div
            ref={registerTargetRef('examStyle-types')}
            className="scroll-mt-40 rounded-[1.25rem] border border-[rgba(15,23,42,0.08)] bg-white p-4"
          >
            {selectedExamTypes.length === 0 ? (
              <>
                <Label className="text-sm font-black text-slate-900">시험 방식</Label>
                <div className="mt-4 flex flex-wrap gap-2">
                  {examTypeOptions.map((examType) => {
                    const isActive = selectedExamTypes.includes(examType);

                    return (
                      <button
                        key={examType}
                        type="button"
                        onClick={() => toggleExamType(examType)}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                          isActive
                            ? 'border-[#005bac] bg-[#edf4ff] text-[#005bac]'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {examType}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-900">시험 방식</span>
                  {selectedExamTypes.map((examType) => (
                    <span
                      key={examType}
                      className="rounded-full bg-[#edf4ff] px-3 py-1 text-[11px] font-black text-[#005bac]"
                    >
                      {examType}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExamTypes([]);
                    setOtherExamTypeDescription('');
                  }}
                  className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-1 text-[11px] font-black text-slate-600"
                >
                  수정
                </button>
              </div>
            )}
          </div>
        ) : null}

        {isExamOtherStage ? (
          <div
            ref={registerTargetRef('examStyle-other')}
            className="scroll-mt-40 rounded-[1.25rem] border border-[rgba(15,23,42,0.08)] bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-black text-slate-900">기타 시험 방식</Label>
              <button
                type="button"
                onClick={() => setSelectedExamTypes((current) => current.filter((item) => item !== '기타'))}
                className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-1 text-[11px] font-black text-slate-600"
              >
                기타 해제
              </button>
            </div>
            <Input
              value={otherExamTypeDescription}
              onChange={(event) => setOtherExamTypeDescription(event.target.value)}
              placeholder="기타 시험 방식"
              className="mt-4 h-11 rounded-xl bg-white"
            />
          </div>
        ) : null}

        {(section.id === 'team' || section.id === 'lab' || section.id === 'quiz') ? (
          <div ref={registerTargetRef(`${section.id}-binary`)} className="scroll-mt-40">
            {binaryValue === null ? (
              <BinaryToggle
                label={section.id === 'team' ? '팀플' : section.id === 'lab' ? '실습' : '퀴즈'}
                value={binaryValue}
                onChange={(nextValue) => {
                  if (section.id === 'team') setTeamProject(nextValue);
                  if (section.id === 'lab') setLabIncluded(nextValue);
                  if (section.id === 'quiz') setQuizIncluded(nextValue);
                }}
              />
            ) : (
              <div className="rounded-[1.25rem] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      {section.id === 'team' ? '팀플' : section.id === 'lab' ? '실습' : '퀴즈'}
                    </span>
                    <span className="rounded-full bg-[#edf4ff] px-3 py-1 text-[11px] font-black text-[#005bac]">
                      {binaryValue === 'yes' ? '있음' : '없음'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (section.id === 'team') setTeamProject(null);
                      if (section.id === 'lab') setLabIncluded(null);
                      if (section.id === 'quiz') setQuizIncluded(null);
                    }}
                    className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-1 text-[11px] font-black text-slate-600"
                  >
                    수정
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {shouldShowQuestionStage && useFocusedFlow ? (
          <div className="space-y-4">
            <div className="min-h-[68px] rounded-[1.1rem] border border-[rgba(15,23,42,0.06)] bg-white/70 px-3 py-3">
              {answeredQuestions.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {answeredQuestions.map((question) => (
                    <div key={question.id} className="min-w-[180px]">
                      <AnsweredQuestionSummary
                        question={question}
                        value={answers[question.id]}
                        onClick={() => setFocusedQuestionId(question.id)}
                        active={focusedQuestionIdForSection === question.id}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="min-h-[300px] rounded-[1.4rem] border border-[rgba(15,23,42,0.08)] bg-white/55 p-2">
              {activeQuestion ? (
                <div ref={registerTargetRef(activeQuestion.id)} className="scroll-mt-40">
                  <LikertQuestion
                    key={activeQuestion.id}
                    question={activeQuestion}
                    value={answers[activeQuestion.id]}
                    onChange={(nextValue) => handleAnswerChange(activeQuestion.id, nextValue)}
                    selectedPulseValue={pulseQuestionId === activeQuestion.id ? pulseValue : null}
                    emphasize
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {shouldShowQuestionStage && !useFocusedFlow ? (
          <div className="space-y-4">
            {section.questions.map((question) => (
              <div key={question.id} ref={registerTargetRef(question.id)} className="scroll-mt-40">
                <LikertQuestion
                  question={question}
                  value={answers[question.id]}
                  onChange={(nextValue) => handleAnswerChange(question.id, nextValue)}
                  selectedPulseValue={pulseQuestionId === question.id ? pulseValue : null}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-4 pb-10">
      <style>
        {`
          @keyframes reviewChoicePop {
            0% { transform: scale(0.92); }
            55% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }

          @keyframes reviewRiseIn {
            0% { opacity: 0; transform: translateY(14px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          @keyframes reviewFoldIn {
            0% { opacity: 0; transform: translateY(8px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes reviewSoftFade {
            0% { opacity: 0.2; transform: translateY(4px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          .review-choice-pop {
            animation: reviewChoicePop 260ms cubic-bezier(0.2, 0.9, 0.2, 1);
          }

          .review-rise-in {
            animation: reviewRiseIn 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
          }

          .review-fold-in {
            animation: reviewFoldIn 260ms cubic-bezier(0.22, 1, 0.36, 1);
          }

          .review-soft-fade {
            animation: reviewSoftFade 280ms ease-out;
          }

          .review-card-focus {
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(0, 91, 172, 0.06);
          }
        `}
      </style>
      <div className="page-shell max-w-[980px]">
        <main className="min-w-0">
          <div className="page-panel overflow-hidden rounded-[2rem] p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1.5 text-xs font-black text-slate-700">
                {course.professor}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-semibold text-slate-500">{course.name}</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f8fbff] px-3 py-1.5 text-xs font-black text-[#005bac]">
                  {course.category}
                </span>
                <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                  {course.type}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <section className="sticky top-20 z-20 rounded-[1.4rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(251,253,255,0.98)_0%,rgba(247,250,252,0.98)_100%)] p-3.5 backdrop-blur-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_260px] lg:items-end">
                  <div>
                    <p className="text-sm font-black text-slate-900">진행도</p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-3xl font-black tracking-tight text-slate-950">{progressPercent}%</span>
                      <span className="text-sm font-semibold text-slate-500">{completedSteps} / {totalSteps} 완료</span>
                    </div>
                  </div>

                  <div ref={registerTargetRef('review-rating')}>
                    <Label className="text-sm font-black text-slate-700">전체 별점</Label>
                    <div className="mt-2 flex items-center gap-2" onMouseLeave={() => setHoveredRating(0)}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          onMouseEnter={() => setHoveredRating(value)}
                          className="transition-transform hover:scale-[1.04]"
                          aria-label={`전체 별점 ${value}점`}
                        >
                          <Star
                            className={`h-8 w-8 ${
                              value <= displayRating
                                ? 'fill-[#f2ba2f] text-[#f2ba2f] drop-shadow-[0_4px_10px_rgba(242,186,47,0.2)]'
                                : 'text-slate-200'
                            }`}
                          />
                        </button>
                      ))}
                      {rating > 0 ? (
                        <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f8fbff] px-2.5 py-1 text-xs font-black text-slate-700">
                          {rating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-full">
                    <Label className="text-sm font-black text-slate-700">실제로 수강한 학기</Label>
                    <Select value={semester} onValueChange={setSemester}>
                      <SelectTrigger className="mt-2 h-11 rounded-xl bg-white font-semibold text-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSemesters.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#005bac_0%,#5f87d8_100%)] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {availableSectionItems.map((item, index) => {
                    const isFuture = index > activeSectionIndex;
                    const isCurrent = item.section.id === (selectedSectionId ?? stageSectionId);

                    return (
                      <button
                        key={item.section.id}
                        type="button"
                        onClick={() => {
                          if (!isFuture) {
                            setFocusedQuestionId(null);
                            setExpandedSectionId((current) => current === item.section.id ? null : item.section.id);
                          }
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-black transition-all ${
                          isCurrent
                            ? 'border-[#005bac] bg-[#edf4ff] text-[#005bac]'
                            : item.isComplete
                              ? 'border-slate-200 bg-white text-slate-600'
                              : 'border-slate-200 bg-slate-100 text-slate-400'
                        } ${isFuture ? 'cursor-not-allowed opacity-55 grayscale' : ''}`}
                      >
                        {item.section.number}. {item.section.title}
                      </button>
                    );
                  })}
                </div>
              </section>

              {selectedSectionItem ? (() => {
                const { section, answered, total, isComplete, binaryValue } = selectedSectionItem;
                const shouldHideQuestions =
                  (section.id === 'team' && teamProject !== 'yes') ||
                  (section.id === 'lab' && labIncluded !== 'yes') ||
                  (section.id === 'quiz' && quizIncluded !== 'yes');
                const firstUnansweredIndex = section.questions.findIndex((question) => !answers[question.id]);
                const answeredQuestions = section.questions.filter((question) => answers[question.id]);
                const fallbackQuestion = firstUnansweredIndex >= 0 ? section.questions[firstUnansweredIndex] : null;
                const focusedQuestion = focusedQuestionBelongsToSelectedSection
                  ? section.questions.find((question) => question.id === focusedQuestionId) ?? null
                  : null;
                const activeQuestion = focusedQuestion ?? fallbackQuestion;
                const activeQuestionIndex = activeQuestion
                  ? section.questions.findIndex((question) => question.id === activeQuestion.id)
                  : -1;
                const useFocusedFlow = !isComplete;

                return (
                  <section className={`rounded-[1.6rem] border p-5 md:p-6 ${section.borderClass} ${section.softClass}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] ${section.accentClass}`}>
                          {section.emoji} {section.number}
                        </span>
                        <div>
                          <h2 className={`text-xl font-black tracking-tight ${section.accentClass}`}>{section.title}</h2>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {isReviewingPreviousSection
                              ? `${answered} / ${total} 응답 완료`
                              : useFocusedFlow
                                ? `질문 ${Math.max(activeQuestionIndex + 1, 1)} / ${total}`
                                : `${answered} / ${total} 응답 완료`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {focusedQuestionBelongsToSelectedSection ? (
                          <button
                            type="button"
                            onClick={() => setFocusedQuestionId(null)}
                            className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1.5 text-[11px] font-black text-slate-600"
                          >
                            진행
                          </button>
                        ) : null}
                        <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
                          isReviewingPreviousSection
                            ? 'bg-white text-slate-600'
                            : 'bg-[#005bac] text-white'
                        }`}>
                          {isReviewingPreviousSection ? '수정' : '진행 중'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      {renderSectionBody({
                        section,
                        binaryValue,
                        shouldHideQuestions,
                        useFocusedFlow: isReviewingPreviousSection ? false : useFocusedFlow,
                        answeredQuestions,
                        activeQuestion: isReviewingPreviousSection ? null : activeQuestion,
                        focusedQuestionIdForSection: focusedQuestionBelongsToSelectedSection ? focusedQuestionId : null,
                      })}
                    </div>
                  </section>
                );
              })() : null}

              {shouldShowFollowupStage ? (
                <section
                  ref={registerTargetRef('prerequisite-followup')}
                  className="scroll-mt-40 rounded-[1.6rem] border border-[#f1ddbf] bg-[#fffaf1] p-5 md:p-6"
                >
                  <h2 className="mb-3 text-lg font-black tracking-tight text-[#8c6420]">어떤 과목 또는 지식이 필요했나요?</h2>
                  <Textarea
                    value={prerequisiteDetails}
                    onChange={(event) => setPrerequisiteDetails(event.target.value)}
                    placeholder="선수지식 입력"
                    className="min-h-[110px] resize-none rounded-[1rem] border-white bg-white/90 p-4 text-sm leading-6"
                  />
                </section>
              ) : null}

              {shouldShowReviewStage ? (
                <section
                  ref={registerTargetRef('review-content')}
                  className="scroll-mt-40 rounded-[1.6rem] border border-[rgba(15,23,42,0.08)] bg-white p-5 md:p-6"
                >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black tracking-tight text-slate-950">총평</h2>
                  <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] px-3 py-1 text-[11px] font-black text-slate-500">
                    {content.trim().length}자
                  </span>
                </div>
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="총평 입력"
                  className="min-h-[180px] resize-none rounded-[1rem] border-slate-200 p-4 text-sm leading-7"
                />
                </section>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-[rgba(15,23,42,0.08)] pt-6 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="h-11 rounded-full px-5 font-semibold text-slate-700"
                  >
                    돌아가기
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 rounded-full px-6 font-semibold"
                  >
                    {isSubmitting ? '등록 중...' : '강의평 등록'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
