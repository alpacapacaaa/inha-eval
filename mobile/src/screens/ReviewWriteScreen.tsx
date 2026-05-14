import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, PressableScale, StatePanel } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { createReview, getMyReviews } from '../lib/api/reviews';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Review } from '../types/models';

interface Props {
  navigation: AppNavigation;
  route: {
    name: 'ReviewWrite';
    courseId: number;
  };
}

type CategoryKey =
  | 'classMethod'
  | 'workload'
  | 'exam'
  | 'attendance'
  | 'atmosphere'
  | 'target'
  | 'examMethod'
  | 'examInfo'
  | 'assignment'
  | 'prerequisite'
  | 'depth'
  | 'teamProject'
  | 'practice'
  | 'quiz'
  | 'textbook';
type StageKey = 'select' | 'evaluate' | 'note' | 'preview';
type QuestionKey =
  | 'examDifficultyHard'
  | 'examMaterialEnough'
  | 'examTimeShort'
  | 'examGapLarge'
  | 'lectureGood'
  | 'lectureMaterialHelpful'
  | 'recordingHelpful'
  | 'gradingFair'
  | 'gradingPlus'
  | 'assignmentFrequent'
  | 'assignmentHard'
  | 'prerequisiteNeeded'
  | 'prerequisiteImpact'
  | 'depthIntro'
  | 'depthTheory'
  | 'depthBroad'
  | 'depthAdvanced'
  | 'examInfoEnough'
  | 'examApplication'
  | 'pastExamImpact'
  | 'teamHigh'
  | 'teamPresentation'
  | 'teamReport'
  | 'teamGradeImpact'
  | 'teamMemberImpact'
  | 'practiceHigh'
  | 'practiceInClass'
  | 'practiceGradeImpact'
  | 'practicePreparationHard'
  | 'quizHard'
  | 'quizGradeImpact'
  | 'textbookNeeded'
  | 'textbookMaterialCentered';
type ToggleKey = 'teamProject' | 'practice' | 'quiz';

const theme = {
  bg: colors.background,
  text: colors.text,
  muted: colors.textMuted,
  faint: '#AAB4C0',
  blue: colors.primary,
  blueSoft: colors.primarySoft,
  sky: colors.primarySoft,
  iconBg: colors.fill,
  line: colors.cardBorder,
  navy: colors.inkBlue,
  red: '#d84f41',
  green: '#2f946f',
  orange: '#e6a640',
  pink: '#db6195',
  purple: '#9068db',
};

type IconName = keyof typeof Ionicons.glyphMap;

const miniIconSpecs: Record<CategoryKey, {
  icon: IconName;
  badge: string;
  accent: string;
  sheet: string;
}> = {
  classMethod: { icon: 'book-outline', badge: 'PPT', accent: '#2EA7FF', sheet: '#EAF7FF' },
  workload: { icon: 'star-outline', badge: '학점', accent: '#F1A72F', sheet: '#FFF7E4' },
  exam: { icon: 'document-text-outline', badge: 'TEST', accent: '#6876E8', sheet: '#EEF0FF' },
  attendance: { icon: 'calendar-outline', badge: '출석', accent: '#2E9F79', sheet: '#EAF8F2' },
  atmosphere: { icon: 'chatbubble-ellipses-outline', badge: '톤', accent: '#52A7E8', sheet: '#EAF7FF' },
  target: { icon: 'ribbon-outline', badge: '추천', accent: '#2FAF82', sheet: '#EAF8F2' },
  examMethod: { icon: 'search-outline', badge: '유형', accent: '#4C86E8', sheet: '#EDF5FF' },
  examInfo: { icon: 'reader-outline', badge: '범위', accent: '#4C86E8', sheet: '#EDF5FF' },
  assignment: { icon: 'folder-open-outline', badge: '과제', accent: '#E8A23B', sheet: '#FFF5E6' },
  prerequisite: { icon: 'library-outline', badge: '기초', accent: '#7A67D9', sheet: '#F2EEFF' },
  depth: { icon: 'layers-outline', badge: 'LV', accent: '#7A67D9', sheet: '#F2EEFF' },
  teamProject: { icon: 'people-outline', badge: 'TEAM', accent: '#3BAE95', sheet: '#EAF8F5' },
  practice: { icon: 'terminal-outline', badge: 'LAB', accent: '#3BAE95', sheet: '#EAF8F5' },
  quiz: { icon: 'help-circle-outline', badge: 'Q', accent: '#2EA7FF', sheet: '#EAF7FF' },
  textbook: { icon: 'book-outline', badge: 'BOOK', accent: '#617187', sheet: '#EEF2F6' },
};

const categories: Array<{
  key: CategoryKey;
  title: string;
  description: string;
  icon: string;
  emoji: string;
  detail: string;
  summaryKey: string;
}> = [
  {
    key: 'classMethod',
    title: '강의력 · 자료',
    description: '설명 · PPT · 녹화 강의',
    icon: 'book-outline',
    emoji: '📘',
    detail: '교수님의 전달력과 학습 자료',
    summaryKey: '수업',
  },
  {
    key: 'exam',
    title: '시험 난이도',
    description: '난이도 · 시간 압박 · 중간기말 차이',
    icon: 'document-text-outline',
    emoji: '📄',
    detail: '시험 자체의 부담과 체감 난이도',
    summaryKey: '시험',
  },
  {
    key: 'examMethod',
    title: '시험 방식 · 정보',
    description: '객관식 · 서술형 · 족보 · 범위',
    icon: 'search-outline',
    emoji: '🧾',
    detail: '시험 준비에 필요한 실제 정보',
    summaryKey: '시험정보',
  },
  {
    key: 'assignment',
    title: '과제',
    description: '과제량 · 난이도 · 과제 유형',
    icon: 'folder-open-outline',
    emoji: '📁',
    detail: '과제가 얼마나 자주, 어렵게 나왔는지',
    summaryKey: '과제',
  },
  {
    key: 'teamProject',
    title: '팀플 · 실습 · 퀴즈',
    description: '팀플 · 발표 · 실습 · 퀴즈 여부',
    icon: 'people-outline',
    emoji: '👥',
    detail: '수업 운영에서 부담이 되는 활동',
    summaryKey: '활동',
  },
  {
    key: 'prerequisite',
    title: '선수지식 · 심화도',
    description: '기초지식 · 입문/심화 · 이론 중심',
    icon: 'library-outline',
    emoji: '📚',
    detail: '수업을 듣기 전 준비가 필요한 정도',
    summaryKey: '심화',
  },
  {
    key: 'target',
    title: '학점 · 추천',
    description: '학점 체감 · 추천 대상 · 총평',
    icon: 'star-outline',
    emoji: '★',
    detail: '수강 전 마지막 판단에 필요한 내용',
    summaryKey: '판단',
  },
];

const evaluationVisuals: Record<CategoryKey, {
  icon: string;
  emoji: string;
}> = {
  classMethod: { icon: 'book-outline', emoji: '📚' },
  workload: { icon: 'document-text-outline', emoji: '📝' },
  exam: { icon: 'reader-outline', emoji: '📄' },
  attendance: { icon: 'calendar-outline', emoji: '📅' },
  atmosphere: { icon: 'chatbubble-ellipses-outline', emoji: '💬' },
  target: { icon: 'star-outline', emoji: '⭐' },
  examMethod: { icon: 'list-outline', emoji: '🧾' },
  examInfo: { icon: 'search-outline', emoji: '🔎' },
  assignment: { icon: 'folder-open-outline', emoji: '📁' },
  prerequisite: { icon: 'library-outline', emoji: '📚' },
  depth: { icon: 'layers-outline', emoji: '🧩' },
  teamProject: { icon: 'people-outline', emoji: '👥' },
  practice: { icon: 'terminal-outline', emoji: '💻' },
  quiz: { icon: 'help-circle-outline', emoji: 'Q' },
  textbook: { icon: 'book-outline', emoji: '📖' },
};

const evaluationPlan: Record<CategoryKey, CategoryKey[]> = {
  classMethod: ['classMethod', 'atmosphere'],
  workload: ['workload'],
  exam: ['exam'],
  examMethod: ['examMethod', 'examInfo', 'textbook'],
  examInfo: ['examInfo'],
  assignment: ['assignment'],
  attendance: ['attendance'],
  atmosphere: ['atmosphere'],
  target: ['workload', 'target'],
  prerequisite: ['prerequisite', 'depth'],
  depth: ['depth'],
  teamProject: ['teamProject', 'practice', 'quiz'],
  practice: ['practice'],
  quiz: ['quiz'],
  textbook: ['textbook'],
};

const detailOptions: Record<CategoryKey, string[]> = {
  classMethod: ['강의력 좋아요', 'PPT 도움돼요', '예시 좋아요', '녹화 강의 제공', '자료 중심', '설명 아쉬워요'],
  workload: ['노력 반영돼요', '플러스 잘 줘요', '학점 빡세요', '평가 공정해요', '성실형 추천'],
  exam: ['시험 어려워요', '자료로 충분해요', '시간 부족해요', '중간기말 차이 커요'],
  examMethod: ['객관식', '서술형', '계산형', 'OX', '기타'],
  examInfo: ['시험 안내 충분', '응용 많아요', '족보 영향 큼', '범위 구체적', '힌트 제공', '예상 가능'],
  assignment: ['과제 없음', '큰 과제 여러 번', '큰 과제 한 번', '단순 과제 여러 번', '단순 과제 한 번'],
  attendance: ['출석 체크해요', '지각 감점 있어요', '출결 널널해요', '대리출석 어려워요', '운영 깔끔해요', '공지 빠른 편이에요'],
  atmosphere: ['질문 편해요', '피드백 많아요', '엄격한 편이에요', '자유로운 분위기', '열정적이에요', '소통 잘돼요'],
  target: ['비전공자 추천', '성실형 추천', '학점 챙기기 좋아요', '실무형 추천', '발표 괜찮은 사람', '벼락치기 가능'],
  prerequisite: ['선수지식 필요', '기초 없어도 가능', '이전 과목 도움', '개념 복습 필요'],
  depth: ['입문 수준', '이론 중심', '얇고 넓게', '상위 전공 연결', '실무 응용 적음'],
  teamProject: ['팀플 없음', '팀플 있음', '발표 비중 큼', '보고서 비중 큼', '팀원 영향 큼'],
  practice: ['실습 없음', '실습 있음', '수업시간 내 가능', '성적 영향 큼', '사전 준비 필요'],
  quiz: ['퀴즈 없음', '퀴즈 있음', '퀴즈 부담', '성적 영향 큼'],
  textbook: ['교재 필요', '강의자료 중심', '교재 없어도 가능', '시험 때 교재 중요'],
};

const evaluationConfigs: Record<CategoryKey, {
  title: string;
  body: string;
  left: string;
  center: string;
  right: string;
  keywords: string[];
  questions?: Array<{ key: QuestionKey; label: string; left?: string; right?: string }>;
  singleChoice?: boolean;
  toggle?: ToggleKey;
  toggleQuestion?: string;
}> = {
  classMethod: {
    title: '강의력은 어땠나요?',
    body: '교수님의 설명과 자료가 실제 학습에 도움이 됐는지 알려주세요.',
    left: '아쉬움',
    center: '보통',
    right: '좋음',
    keywords: detailOptions.classMethod,
    questions: [
      { key: 'lectureGood', label: '교수님의 강의력은 전반적으로 좋은 편이다.' },
      { key: 'lectureMaterialHelpful', label: '판서/PPT/예시가 이해에 실제로 도움이 된다.' },
      { key: 'recordingHelpful', label: '녹화 강의가 제공되어 학습에 도움이 된다.' },
    ],
  },
  workload: {
    title: '학점 체감은 어땠나요?',
    body: '노력과 점수가 얼마나 잘 연결되는지 알려주세요.',
    left: '가벼움',
    center: '보통',
    right: '빡셈',
    keywords: detailOptions.workload,
    questions: [
      { key: 'gradingFair', label: '노력한 만큼 점수가 잘 반영되는 편이다.' },
      { key: 'gradingPlus', label: '플러스를 잘 채워주시는 편이다.' },
    ],
  },
  exam: {
    title: '시험 난이도는 어땠나요?',
    body: '시험 자체의 난이도와 시간 압박을 기준으로 답해주세요.',
    left: '쉬움',
    center: '보통',
    right: '어려움',
    keywords: detailOptions.exam,
    questions: [
      { key: 'examDifficultyHard', label: '시험 난이도가 어려운 편이다.' },
      { key: 'examMaterialEnough', label: '수업 자료만으로도 시험 대비가 충분하다.' },
      { key: 'examTimeShort', label: '시험 시간 내에 문제를 풀기에는 시간이 부족한 편이다.' },
      { key: 'examGapLarge', label: '중간고사와 기말고사의 난이도 차이가 큰 편이다.' },
    ],
  },
  examMethod: {
    title: '시험 방식은 무엇에 가까웠나요?',
    body: '해당하는 시험 방식을 모두 선택해주세요.',
    left: '적음',
    center: '보통',
    right: '많음',
    keywords: detailOptions.examMethod,
  },
  examInfo: {
    title: '시험 정보는 충분했나요?',
    body: '범위 안내, 힌트, 족보 영향 같은 시험 준비 정보를 알려주세요.',
    left: '부족',
    center: '보통',
    right: '충분',
    keywords: detailOptions.examInfo,
    questions: [
      { key: 'examInfoEnough', label: '교수님이 시험에 대한 정보를 충분히 제공하는 편이다.' },
      { key: 'examApplication', label: '단순 암기보다 응용 문제가 많은 편이다.' },
      { key: 'pastExamImpact', label: '족보나 기출 문제의 영향이 큰 편이다.' },
    ],
  },
  assignment: {
    title: '과제는 어떤 편이었나요?',
    body: '과제량과 과제 유형을 함께 남겨주세요.',
    left: '적음',
    center: '보통',
    right: '많음',
    keywords: detailOptions.assignment,
    singleChoice: true,
    questions: [
      { key: 'assignmentFrequent', label: '과제 빈도가 높은 편이다.' },
      { key: 'assignmentHard', label: '과제 난이도가 높은 편이다.' },
    ],
  },
  attendance: {
    title: '출결 운영은 어땠나요?',
    body: '출석 체크와 지각 감점을 기준으로 골라주세요.',
    left: '널널',
    center: '보통',
    right: '엄격',
    keywords: detailOptions.attendance,
  },
  atmosphere: {
    title: '분위기는 어땠나요?',
    body: '질문, 피드백, 소통 느낌을 기준으로 골라주세요.',
    left: '어려움',
    center: '보통',
    right: '편함',
    keywords: detailOptions.atmosphere,
  },
  target: {
    title: '추천 체감은 어느 쪽인가요?',
    body: '학점, 실무, 비전공자 적합도를 기준으로 골라주세요.',
    left: '비추천',
    center: '보통',
    right: '추천',
    keywords: ['비전공자 추천', '성실형 추천', '학점 챙기기 좋아요', '실무형 추천', '벼락치기 가능'],
  },
  prerequisite: {
    title: '선수지식이 필요했나요?',
    body: '기초 지식 유무가 체감 난이도에 영향을 줬는지 알려주세요.',
    left: '불필요',
    center: '보통',
    right: '필요',
    keywords: detailOptions.prerequisite,
    questions: [
      { key: 'prerequisiteNeeded', label: '수업을 듣기 위해 선수 지식이 필요한 편이다.' },
      { key: 'prerequisiteImpact', label: '선수 지식의 유무에 따라 강의 난이도가 크게 달라지는 편이다.' },
    ],
  },
  depth: {
    title: '전공 심화도는 어느 정도였나요?',
    body: '입문/이론/응용/상위 과목 연결성을 기준으로 답해주세요.',
    left: '입문',
    center: '보통',
    right: '심화',
    keywords: detailOptions.depth,
    questions: [
      { key: 'depthIntro', label: '강의는 입문 수준에 가까운 편이다.' },
      { key: 'depthTheory', label: '실무/응용보다 이론 중심의 강의다.' },
      { key: 'depthBroad', label: '개념을 얇고 넓게 다루는 편이다.' },
      { key: 'depthAdvanced', label: '상위 전공 과목으로 이어지는 성격이 강하다.' },
    ],
  },
  teamProject: {
    title: '팀플이나 발표가 있었나요?',
    body: '팀플이 없었다면 없음으로 선택하고 바로 넘어갈 수 있어요.',
    left: '낮음',
    center: '보통',
    right: '높음',
    keywords: detailOptions.teamProject,
    toggle: 'teamProject',
    toggleQuestion: '수업에서 팀플이 있나요?',
    questions: [
      { key: 'teamHigh', label: '팀 프로젝트 비중이 높은 편이다.' },
      { key: 'teamPresentation', label: '팀 프로젝트에서 발표 비중이 높다.', left: '발표 없음' },
      { key: 'teamReport', label: '팀 프로젝트에서 성적 보고서 작성 비중이 높다.', left: '보고서 없음' },
      { key: 'teamGradeImpact', label: '팀 프로젝트가 성적에 미치는 영향이 큰 편이다.' },
      { key: 'teamMemberImpact', label: '팀원 구성에 따라 체감 난이도가 크게 달라지는 편이다.' },
    ],
  },
  practice: {
    title: '실습 수업이 있었나요?',
    body: '실습 비중과 성적 영향도를 기준으로 답해주세요.',
    left: '낮음',
    center: '보통',
    right: '높음',
    keywords: detailOptions.practice,
    toggle: 'practice',
    toggleQuestion: '수업에서 실습이 있나요?',
    questions: [
      { key: 'practiceHigh', label: '실습 수업 비중이 높은 편이다.' },
      { key: 'practiceInClass', label: '실습을 수업 시간 내에 완료할 수 있는 편이다.' },
      { key: 'practiceGradeImpact', label: '실습이 성적에 중요한 영향을 미치는 편이다.' },
      { key: 'practicePreparationHard', label: '실습을 위한 사전 준비가 까다로운 편이다.' },
    ],
  },
  quiz: {
    title: '퀴즈가 있었나요?',
    body: '퀴즈 부담과 성적 영향도를 알려주세요.',
    left: '낮음',
    center: '보통',
    right: '높음',
    keywords: detailOptions.quiz,
    toggle: 'quiz',
    toggleQuestion: '수업에서 퀴즈가 있나요?',
    questions: [
      { key: 'quizHard', label: '퀴즈 난이도가 부담스러운 수준이다.' },
      { key: 'quizGradeImpact', label: '퀴즈 점수가 최종 성적에 큰 영향을 미치는 편이다.' },
    ],
  },
  textbook: {
    title: '교재는 얼마나 중요했나요?',
    body: '시험 준비와 수업 진행에서 교재가 차지한 비중을 알려주세요.',
    left: '낮음',
    center: '보통',
    right: '높음',
    keywords: detailOptions.textbook,
    questions: [
      { key: 'textbookNeeded', label: '시험 준비 시 교재가 필요한 편이다.' },
      { key: 'textbookMaterialCentered', label: '수업은 교재보다 강의자료 중심으로 진행된다.' },
    ],
  },
};

const categoryKeys = Object.keys(evaluationConfigs) as CategoryKey[];
const questionKeys = categoryKeys.flatMap((key) => evaluationConfigs[key].questions ?? []).map((question) => question.key);

function createChoiceState() {
  return categoryKeys.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {} as Record<CategoryKey, string[]>);
}

function createFeelState() {
  return categoryKeys.reduce((acc, key) => {
    acc[key] = 1;
    return acc;
  }, {} as Record<CategoryKey, number>);
}

function createQuestionState() {
  return questionKeys.reduce((acc, key) => {
    acc[key] = 2;
    return acc;
  }, {} as Record<QuestionKey, number>);
}

export function ReviewWriteScreen({ navigation, route }: Props) {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);
  const [choices, setChoices] = useState<Record<CategoryKey, string[]>>(createChoiceState);
  const [feels, setFeels] = useState<Record<CategoryKey, number>>(createFeelState);
  const [questionAnswers, setQuestionAnswers] = useState<Record<QuestionKey, number>>(createQuestionState);
  const [toggleAnswers, setToggleAnswers] = useState<Record<ToggleKey, boolean | null>>({
    teamProject: null,
    practice: null,
    quiz: null,
  });
  const [extraNotes, setExtraNotes] = useState({
    prerequisite: '',
    examOther: '',
  });
  const [content, setContent] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [evaluationIndex, setEvaluationIndex] = useState(0);
  const [duplicateReview, setDuplicateReview] = useState<Review | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const semester = useMemo(() => getCurrentSemesterLabel(), []);
  const flow = useMemo<StageKey[]>(
    () => ['select', 'evaluate', 'note', 'preview'],
    [],
  );
  const stage = flow[Math.min(stepIndex, flow.length - 1)];
  const semanticStep = getSemanticStep(stage);
  const evaluationQueue = useMemo(
    () => selectedCategories.flatMap((category) => evaluationPlan[category] ?? [category]),
    [selectedCategories],
  );
  const report = useMemo(
    () => buildReport({
      selectedCategories,
      choices,
      feels,
      questionAnswers,
      toggleAnswers,
      content,
    }),
    [choices, content, feels, questionAnswers, selectedCategories, toggleAnswers],
  );
  const currentSelectionCount = getCurrentSelectionCount(stage, selectedCategories, choices, content);

  useEffect(() => {
    setStepIndex((current) => Math.min(current, flow.length - 1));
  }, [flow.length]);

  useEffect(() => {
    setEvaluationIndex((current) => Math.min(current, Math.max(evaluationQueue.length - 1, 0)));
  }, [evaluationQueue.length]);

  useEffect(() => {
    let isActive = true;

    const checkDuplicate = async () => {
      if (!isAuthenticated) {
        setDuplicateReview(null);
        return;
      }

      setIsCheckingDuplicate(true);

      try {
        const reviews = await getMyReviews();
        if (!isActive) {
          return;
        }
        setDuplicateReview(reviews.find((review) => review.courseId === route.courseId) ?? null);
      } catch {
        if (isActive) {
          setDuplicateReview(null);
        }
      } finally {
        if (isActive) {
          setIsCheckingDuplicate(false);
        }
      }
    };

    checkDuplicate();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, route.courseId]);

  const transitionTo = (nextStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 90,
      useNativeDriver: true,
    }).start(() => {
      setStepIndex(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  const toggleCategory = (key: CategoryKey) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
    setErrorMessage('');
  };

  const toggleChoice = (key: CategoryKey, option: string) => {
    setChoices((prev) => {
      const current = prev[key];
      if (evaluationConfigs[key].singleChoice) {
        return {
          ...prev,
          [key]: current.includes(option) ? [] : [option],
        };
      }
      return {
        ...prev,
        [key]: current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
      };
    });
    setErrorMessage('');
  };

  const setFeelValue = (key: CategoryKey, value: number) => {
    setFeels((prev) => ({ ...prev, [key]: value }));
    setErrorMessage('');
  };

  const setQuestionValue = (key: QuestionKey, value: number) => {
    setQuestionAnswers((prev) => ({ ...prev, [key]: value }));
    setErrorMessage('');
  };

  const setToggleValue = (key: ToggleKey, value: boolean) => {
    setToggleAnswers((prev) => ({ ...prev, [key]: value }));
    setChoices((prev) => ({
      ...prev,
      [key]: value
        ? [key === 'teamProject' ? '팀플 있음' : key === 'practice' ? '실습 있음' : '퀴즈 있음']
        : [key === 'teamProject' ? '팀플 없음' : key === 'practice' ? '실습 없음' : '퀴즈 없음'],
    }));
    setErrorMessage('');
  };

  const validateStage = () => {
    if (stage === 'select' && selectedCategories.length === 0) {
      return '평가할 항목을 하나 이상 선택해주세요.';
    }
    if (stage === 'evaluate') {
      const activeCategory = evaluationQueue[evaluationIndex];
      const config = activeCategory ? evaluationConfigs[activeCategory] : undefined;
      if (!activeCategory || !config) {
        return '현재 항목을 불러오지 못했습니다.';
      }
      if (config.toggle && toggleAnswers[config.toggle] === null) {
        return '해당 항목이 있었는지 먼저 선택해주세요.';
      }
      if ((activeCategory === 'examMethod' || config.singleChoice) && choices[activeCategory].length === 0) {
        return '현재 항목의 키워드를 하나 이상 골라주세요.';
      }
    }
    if (stage === 'note' && content.trim().length < 10) {
      return '한줄 요약은 10자 이상 작성해주세요.';
    }
    if (stage === 'preview' && duplicateReview) {
      return '이미 이 강의에 남긴 강의평이 있어요. 중복 작성은 막아두었습니다.';
    }
    return '';
  };

  const goNext = () => {
    const message = validateStage();
    if (message) {
      setErrorMessage(message);
      return;
    }

    if (stage === 'evaluate' && evaluationIndex < evaluationQueue.length - 1) {
      setErrorMessage('');
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }).start(() => {
        setEvaluationIndex((current) => current + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    setErrorMessage('');
    transitionTo(Math.min(stepIndex + 1, flow.length - 1));
  };

  const goPrev = () => {
    setErrorMessage('');

    if (stage === 'evaluate' && evaluationIndex > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }).start(() => {
        setEvaluationIndex((current) => current - 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    transitionTo(Math.max(stepIndex - 1, 0));
  };

  const handleSubmit = async () => {
    const message = validateStage();
    if (message) {
      setErrorMessage(message);
      return;
    }
    if (isSubmitting || hasSubmitted) {
      return;
    }
    if (!isAuthenticated) {
      navigation.navigate({ name: 'Login' });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = buildPayloadValues(selectedCategories, choices, feels, questionAnswers, toggleAnswers);
      const extendedPayload = buildExtendedPayload(choices, questionAnswers, toggleAnswers, extraNotes);
      await createReview({
        courseId: route.courseId,
        semester,
        rating: report.rating,
        difficulty: payload.difficulty,
        workload: payload.workload,
        attendance: payload.attendance,
        grading: payload.grading,
        content: content.trim(),
        isAnonymous: true,
        oneLineTip: content.trim(),
        examTypes: extendedPayload.examTypes,
        assignmentType: extendedPayload.assignmentType,
        textbook: extendedPayload.textbook,
        examInfo: extendedPayload.examInfo,
        examKeywords: report.keywords,
        recommendFor: choices.target,
        notRecommendFor: extendedPayload.notRecommendFor,
        badges: extendedPayload.badges,
        examMidtermInfo: extendedPayload.examMidtermInfo,
        examFinalInfo: extendedPayload.examFinalInfo,
        examAssignmentInfo: extendedPayload.examAssignmentInfo,
        examQuizInfo: extendedPayload.examQuizInfo,
        pastExamHelpfulness: extendedPayload.pastExamHelpfulness,
        scopePredictability: extendedPayload.scopePredictability,
        studyResources: extendedPayload.studyResources,
        problemStyles: extendedPayload.problemStyles,
        examPrepTip: extendedPayload.examPrepTip,
        diffScore: payload.diffScore,
        gradScore: payload.gradScore,
        workScore: payload.workScore,
        prerequisiteScore: payload.prerequisiteScore,
        depthScore: payload.depthScore,
        pastExamScore: payload.pastExamScore,
      });
      setHasSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '강의평 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingDuplicate) {
    return (
      <FullScreenState
        title="작성 기록을 확인하는 중"
        body="중복 강의평을 막기 위해 작성 기록을 먼저 확인하고 있습니다."
        loading
      />
    );
  }

  if (duplicateReview) {
    return (
      <DuplicateReviewState onBack={() => navigation.goBack()} />
    );
  }

  if (hasSubmitted) {
    return (
      <SubmittedReviewScreen
        report={report}
        selectedCategories={selectedCategories}
        onClose={() => navigation.goBack()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.topHeader, { paddingTop: insets.top + 8 }]}>
          <PressableScale style={styles.headerBackButton} onPress={stepIndex === 0 ? () => navigation.goBack() : goPrev}>
            <Ionicons name="chevron-back" size={22} color="#26313F" />
          </PressableScale>
          <Text style={styles.headerTitle}>강의평 작성</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <ProgressBars current={semanticStep - 1} total={4} />

        <ScrollView
          contentContainerStyle={[styles.screen, { paddingBottom: insets.bottom + 118 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.stagePanel, { opacity: fadeAnim }]}>
            <View style={styles.promptBlock}>
              <Text style={styles.stageTitle}>{getStageTitle(stage)}</Text>
              {getStageSubtitle(stage) ? <Text style={styles.stageSubtitle}>{getStageSubtitle(stage)}</Text> : null}
            </View>

            <View style={styles.stageBody}>
              {stage === 'select' ? (
                <SelectStage
                  selectedCategories={selectedCategories}
                  onToggleCategory={toggleCategory}
                />
              ) : null}
              {stage === 'evaluate' ? (
                <EvaluateStage
                  categoryKey={evaluationQueue[evaluationIndex]}
                  evaluationIndex={evaluationIndex}
                  evaluationTotal={evaluationQueue.length}
                  choices={choices}
                  feels={feels}
                  questionAnswers={questionAnswers}
                  toggleAnswers={toggleAnswers}
                  onSetFeel={setFeelValue}
                  onSetQuestion={setQuestionValue}
                  onSetToggle={setToggleValue}
                  onToggleChoice={toggleChoice}
                />
              ) : null}
              {stage === 'note' ? (
                <NoteStage
                  content={content}
                  onChangeText={setContent}
                  report={report}
                  choices={choices}
                  extraNotes={extraNotes}
                  onChangeExtraNotes={setExtraNotes}
                />
              ) : null}
              {stage === 'preview' ? (
                <PreviewStage report={report} selectedCategories={selectedCategories} content={content} />
              ) : null}
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </Animated.View>

        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.bottomSummary}>
            <Text style={styles.bottomSummaryLabel}>작성 항목</Text>
            <Text style={styles.bottomSummaryText}>
              {stage === 'preview'
                ? '검토 완료'
                : stage === 'evaluate'
                  ? `평가 ${Math.min(evaluationIndex + 1, evaluationQueue.length)}/${evaluationQueue.length}`
                  : getBottomSummary(stage, currentSelectionCount, Object.values(choices).flat().length)}
            </Text>
          </View>
          <Button
            label={
              stage === 'preview'
                ? '작성 완료하기'
                : stage === 'evaluate' && evaluationIndex < evaluationQueue.length - 1
                  ? '다음 항목'
                  : '다음으로'
            }
            style={styles.primaryButton}
            onPress={stage === 'preview' ? handleSubmit : goNext}
            loading={isSubmitting}
            disabled={isSubmitting || (stage === 'select' && selectedCategories.length === 0)}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SelectStage({
  selectedCategories,
  onToggleCategory,
}: {
  selectedCategories: CategoryKey[];
  onToggleCategory: (key: CategoryKey) => void;
}) {
  return (
    <View style={styles.pickList}>
      <View style={styles.interviewLead}>
        <Text style={styles.interviewLeadEyebrow}>1분 강의 인터뷰</Text>
        <Text style={styles.interviewLeadTitle}>기억나는 경험부터 골라주세요</Text>
        <Text style={styles.interviewLeadBody}>
          세 항목을 전부 고르지 않아도 괜찮아요. 선택한 항목만 차례대로 물어봅니다.
        </Text>
      </View>
      {categories.map((category, index) => {
        const active = selectedCategories.includes(category.key);
        return (
          <PressableScale
            key={category.key}
            style={[
              styles.pickCard,
              active ? styles.pickCardActive : null,
            ]}
            onPress={() => onToggleCategory(category.key)}
          >
            <View style={styles.pickCardMain}>
              <EvaluationItemIcon categoryKey={category.key} icon={category.icon} index={index} active={active} />
              <View style={styles.pickCopy}>
                <View style={styles.pickTitleRow}>
                  <Text style={styles.pickTitle}>{category.title}</Text>
                  {index === 1 ? <Text style={styles.betaLabel}>중요</Text> : null}
                </View>
                <Text style={styles.pickDescription}>{category.description}</Text>
                <Text style={styles.pickDetail}>{category.detail}</Text>
              </View>
              <View style={[styles.pickCheck, active ? styles.pickCheckActive : null]}>
                <Ionicons name="checkmark" size={17} color={active ? '#FFFFFF' : '#CAD3E1'} />
              </View>
            </View>
          </PressableScale>
        );
      })}
      <View style={styles.infoNotice}>
        <Text style={styles.infoIcon}>i</Text>
        <Text style={styles.infoText}>작성한 후기는 익명으로 등록되며, 다른 학생들에게 큰 도움이 됩니다.</Text>
      </View>
    </View>
  );
}

function EvaluateStage({
  categoryKey,
  evaluationIndex,
  evaluationTotal,
  choices,
  feels,
  questionAnswers,
  toggleAnswers,
  onSetFeel,
  onSetQuestion,
  onSetToggle,
  onToggleChoice,
}: {
  categoryKey?: CategoryKey;
  evaluationIndex: number;
  evaluationTotal: number;
  choices: Record<CategoryKey, string[]>;
  feels: Record<CategoryKey, number>;
  questionAnswers: Record<QuestionKey, number>;
  toggleAnswers: Record<ToggleKey, boolean | null>;
  onSetFeel: (key: CategoryKey, value: number) => void;
  onSetQuestion: (key: QuestionKey, value: number) => void;
  onSetToggle: (key: ToggleKey, value: boolean) => void;
  onToggleChoice: (key: CategoryKey, option: string) => void;
}) {
  if (!categoryKey) {
    return null;
  }

  const visual = evaluationVisuals[categoryKey];
  const config = evaluationConfigs[categoryKey];
  const isToggleOff = config.toggle ? toggleAnswers[config.toggle] === false : false;

  return (
    <View style={styles.evaluateWrap}>
      <View style={styles.evalInterviewHeader}>
        <View style={styles.evalProgressPill}>
          <Text style={styles.evalProgressText}>{evaluationIndex + 1}/{evaluationTotal}</Text>
        </View>
        <Text style={styles.evalInterviewLabel}>이번 질문</Text>
      </View>
      <View style={styles.evalQuestionCard}>
        <View style={styles.evalQuestionHeader}>
          <EvaluationItemIcon categoryKey={categoryKey} icon={visual.icon} index={categoryKey === 'workload' ? 1 : 0} active />
          <View style={styles.evalQuestionCopy}>
            <Text style={styles.evalQuestionTitle}>{config.title}</Text>
            <Text style={styles.evalQuestionBody}>{config.body}</Text>
          </View>
        </View>
        <FeelingScale
          value={feels[categoryKey]}
          labels={[config.left, config.center, config.right]}
          onChange={(value) => onSetFeel(categoryKey, value)}
        />
        <View style={styles.evalReportNotice}>
          <Ionicons name="stats-chart-outline" size={16} color={theme.blue} />
          <Text style={styles.evalReportNoticeText}>
            이 답변은 강의 리포트에서 항목별 비율과 평균 수치로 정리돼요.
          </Text>
        </View>
        {config.toggle ? (
          <View style={styles.booleanSwitch}>
            <Text style={styles.booleanQuestion}>{config.toggleQuestion}</Text>
            <View style={styles.booleanOptions}>
              <PressableScale
                style={[styles.booleanOption, toggleAnswers[config.toggle] === false ? styles.booleanOptionActive : null]}
                onPress={() => onSetToggle(config.toggle as ToggleKey, false)}
              >
                <Text style={[styles.booleanOptionText, toggleAnswers[config.toggle] === false ? styles.booleanOptionTextActive : null]}>
                  없었어요
                </Text>
              </PressableScale>
              <PressableScale
                style={[styles.booleanOption, toggleAnswers[config.toggle] === true ? styles.booleanOptionActive : null]}
                onPress={() => onSetToggle(config.toggle as ToggleKey, true)}
              >
                <Text style={[styles.booleanOptionText, toggleAnswers[config.toggle] === true ? styles.booleanOptionTextActive : null]}>
                  있었어요
                </Text>
              </PressableScale>
            </View>
          </View>
        ) : null}
        {config.questions && !isToggleOff ? (
          <View style={styles.questionList}>
            {config.questions.map((question) => (
              <QuestionScale
                key={question.key}
                question={question.label}
                value={questionAnswers[question.key]}
                left={question.left}
                right={question.right}
                onChange={(value) => onSetQuestion(question.key, value)}
              />
            ))}
          </View>
        ) : null}
        <View style={styles.keywordWrap}>
          {config.keywords.map((option) => {
            const selected = choices[categoryKey].includes(option);
            return (
              <PressableScale
                key={option}
                style={[styles.keywordChip, selected ? styles.keywordChipActive : null]}
                onPress={() => onToggleChoice(categoryKey, option)}
              >
                <Text style={[styles.keywordChipText, selected ? styles.keywordChipTextActive : null]}>{option}</Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function QuestionScale({
  question,
  value,
  left = '전혀 아님',
  right = '매우 그럼',
  onChange,
}: {
  question: string;
  value: number;
  left?: string;
  right?: string;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.questionScaleCard}>
      <View style={styles.questionScaleTop}>
        <View style={styles.questionScaleDot} />
        <Text style={styles.questionText}>{question}</Text>
      </View>
      <View style={styles.fiveScale}>
        {[0, 1, 2, 3, 4].map((item) => (
          <PressableScale
            key={item}
            style={[styles.fiveScaleDot, value === item ? styles.fiveScaleDotActive : null]}
            onPress={() => onChange(item)}
          >
            <Text style={[styles.fiveScaleDotText, value === item ? styles.fiveScaleDotTextActive : null]}>
              {item + 1}
            </Text>
          </PressableScale>
        ))}
      </View>
      <View style={styles.fiveScaleLabels}>
        <Text style={styles.fiveScaleLabel}>{left}</Text>
        <Text style={styles.fiveScaleLabel}>{right}</Text>
      </View>
    </View>
  );
}

function FeelingScale({
  value,
  labels,
  onChange,
}: {
  value: number;
  labels: [string, string, string];
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.feelingScale}>
      <View style={styles.scaleTrack}>
        {[0, 1, 2].map((item) => (
          <PressableScale
            key={item}
            style={[styles.scaleSegment, value === item ? styles.scaleSegmentActive : null]}
            onPress={() => onChange(item)}
          >
            <Text style={[styles.scaleSegmentText, value === item ? styles.scaleSegmentTextActive : null]}>{labels[item]}</Text>
          </PressableScale>
        ))}
      </View>
      <View style={styles.scaleDots}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={[styles.scaleDot, value === item ? styles.scaleDotActive : null]} />
        ))}
      </View>
    </View>
  );
}

function EvaluationItemIcon({
  categoryKey,
  icon,
  index,
  active,
}: {
  categoryKey?: CategoryKey;
  icon: string;
  index: number;
  active: boolean;
}) {
  const spec = categoryKey ? miniIconSpecs[categoryKey] : undefined;

  return (
    <View style={[styles.itemIconBox, active ? styles.itemIconBoxActive : null]}>
      <View style={[styles.inhaIconSheet, spec ? { backgroundColor: spec.sheet } : null]}>
        <Ionicons
          name={(spec?.icon ?? icon) as never}
          size={21}
          color={active ? (spec?.accent ?? theme.blue) : '#657183'}
        />
        <View style={styles.inhaIconLines}>
          <View style={[styles.inhaIconLine, spec ? { backgroundColor: spec.accent } : null]} />
          <View style={[styles.inhaIconLineShort, spec ? { backgroundColor: spec.accent } : null]} />
        </View>
      </View>
      <View style={[styles.inhaIconBadge, active && spec ? { backgroundColor: spec.accent } : null]}>
        <Text style={[styles.inhaIconBadgeText, active ? styles.inhaIconBadgeTextActive : null]}>
          {spec?.badge ?? (index === 1 ? 'A+' : 'INFO')}
        </Text>
      </View>
    </View>
  );
}

function NoteStage({
  content,
  onChangeText,
  report,
  choices,
  extraNotes,
  onChangeExtraNotes,
}: {
  content: string;
  onChangeText: (value: string) => void;
  report: ReturnType<typeof buildReport>;
  choices: Record<CategoryKey, string[]>;
  extraNotes: { prerequisite: string; examOther: string };
  onChangeExtraNotes: (value: { prerequisite: string; examOther: string }) => void;
}) {
  const needsPrerequisiteNote = choices.prerequisite.some((item) => item.includes('필요') || item.includes('복습') || item.includes('과목'));
  const needsExamOtherNote = choices.examMethod.includes('기타');

  return (
    <View style={styles.noteWrap}>
      <View style={styles.noteGuide}>
        <Text style={styles.noteGuideTitle}>이 문장은 리포트의 마지막 인상으로 보여요</Text>
        <Text style={styles.noteGuideBody}>
          {report.keywords.length > 0
            ? `${report.keywords.slice(0, 3).join(' · ')} 같은 흐름을 살려 짧게 정리해보세요.`
            : '수업 분위기나 가장 기억에 남은 점을 한 문장으로 남겨주세요.'}
        </Text>
      </View>
      {needsPrerequisiteNote ? (
        <TextInput
          value={extraNotes.prerequisite}
          onChangeText={(value) => onChangeExtraNotes({ ...extraNotes, prerequisite: value })}
          placeholder="필요했던 과목이나 지식이 있다면 적어주세요."
          placeholderTextColor={theme.faint}
          style={styles.shortNoteInput}
        />
      ) : null}
      {needsExamOtherNote ? (
        <TextInput
          value={extraNotes.examOther}
          onChangeText={(value) => onChangeExtraNotes({ ...extraNotes, examOther: value })}
          placeholder="기타 시험 방식이 있다면 적어주세요."
          placeholderTextColor={theme.faint}
          style={styles.shortNoteInput}
        />
      ) : null}
      <TextInput
        multiline
        value={content}
        maxLength={100}
        onChangeText={onChangeText}
        placeholder="예: 실습 예제가 많아서 처음 배우기 좋았어요."
        placeholderTextColor={theme.faint}
        style={styles.noteInput}
        textAlignVertical="top"
      />
      <Text style={styles.countText}>{content.trim().length} / 100</Text>
    </View>
  );
}

function PreviewStage({
  report,
  selectedCategories,
  content,
}: {
  report: ReturnType<typeof buildReport>;
  selectedCategories: CategoryKey[];
  content: string;
}) {
  const selectedTitles = selectedCategories
    .map((key) => categories.find((category) => category.key === key)?.title)
    .filter(Boolean)
    .join(', ');
  const workloadSummary = report.examWorkload.slice(0, 3).join(' · ');
  const targetSummary = report.targets.slice(0, 3).join(' · ');
  const keywordSummary = report.keywords.slice(0, 4).join(' · ');

  return (
    <View style={styles.previewConfirm}>
      <View style={styles.previewIntro}>
        <Text style={styles.previewIntroTitle}>강의평 등록 전 확인</Text>
        <Text style={styles.previewIntroBody}>
          선택한 경험과 한줄평을 바탕으로 아래처럼 요약돼요.
        </Text>
      </View>

      <View style={styles.previewLedgerCard}>
        <View style={styles.previewLedgerHeader}>
          <View style={styles.previewLedgerIcon}>
            <Ionicons name="document-text-outline" size={22} color="#7C8797" />
          </View>
          <Text style={styles.previewLedgerTitle}>
            강의평 요약 <Text style={styles.previewLedgerTitleMuted}>(익명 등록)</Text>
          </Text>
        </View>

        <View style={styles.previewDivider} />

        <PreviewMetric icon="layers-outline" label="작성 항목" value={selectedTitles || '선택 항목'} />
        <PreviewMetric icon="sparkles-outline" label="전체 분위기" value={report.moodTitle} helper={report.moodCopy} />
        <PreviewMetric icon="school-outline" label="시험 · 과제" value={workloadSummary || '선택한 정보 없음'} />
        <PreviewMetric icon="people-outline" label="추천 대상" value={targetSummary || '선택한 정보 없음'} />
      </View>

      <View style={styles.previewFootnotes}>
        <Text style={styles.previewFootnote}>* 핵심 키워드: {keywordSummary || '강의평 요약'}</Text>
        <Text style={styles.previewFootnote}>* 작성 완료 후 강의 리포트와 추천 판단에 반영돼요.</Text>
      </View>

      <View style={styles.previewQuotePanel}>
        <View style={styles.previewQuoteHeader}>
          <Text style={styles.previewQuoteLabel}>대표 한줄평</Text>
          <View style={styles.previewQuoteBadge}>
            <Text style={styles.previewQuoteBadgeText}>검토</Text>
          </View>
        </View>
        <Text style={styles.previewQuoteText}>{content.trim()}</Text>
      </View>

      <View style={styles.previewNotice}>
        <Ionicons name="information-circle" size={18} color="#171A1F" />
        <Text style={styles.previewNoticeText}>작성한 강의평은 익명으로 등록됩니다.</Text>
      </View>
    </View>
  );
}

function PreviewMetric({
  icon,
  label,
  value,
  helper,
}: {
  icon: string;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <View style={styles.previewMetricRow}>
      <View style={styles.previewMetricIcon}>
        <Ionicons name={icon as never} size={18} color="#7A8798" />
      </View>
      <View style={styles.previewMetricCopy}>
        <Text style={styles.previewMetricLabel}>{label}</Text>
        {helper ? <Text style={styles.previewMetricHelper}>{helper}</Text> : null}
      </View>
      <Text style={styles.previewMetricValue}>{value}</Text>
    </View>
  );
}

function ProgressBars({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressBars}>
      {Array.from({ length: total }).map((_, index) => (
        <View key={`progress-${index}`} style={[styles.progressBar, index <= current ? styles.progressBarActive : null]} />
      ))}
    </View>
  );
}

function FullScreenState({
  title,
  body,
  loading = false,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.fullState}>
        <StatePanel label={title} loading={loading} />
        <Text style={styles.fullStateBody}>{body}</Text>
        {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
      </View>
    </SafeAreaView>
  );
}

function DuplicateReviewState({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.duplicateState}>
        <Text style={styles.duplicateTitle}>
          작성한 리뷰가 있어서{'\n'}중복 작성이 불가능합니다.
        </Text>
        <Button label="돌아가기" style={styles.duplicateButton} onPress={onBack} />
      </View>
    </SafeAreaView>
  );
}

function SubmittedReviewScreen({
  report,
  selectedCategories,
  onClose,
}: {
  report: ReturnType<typeof buildReport>;
  selectedCategories: CategoryKey[];
  onClose: () => void;
}) {
  const selectedTitles = selectedCategories
    .map((key) => categories.find((category) => category.key === key)?.title)
    .filter(Boolean)
    .join(', ');
  const keywordPreview = report.keywords.slice(0, 3).join(' · ');

  return (
    <SafeAreaView style={styles.submittedSafeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.submittedContent} showsVerticalScrollIndicator={false}>
        <View style={styles.submittedHero}>
          <Text style={styles.submittedTitle}>강의평 작성 완료!</Text>
          <View style={styles.submittedBanner}>
            <Text style={styles.submittedBannerText}>후배들이 수강 흐름을 빠르게 파악할 수 있게 정리됐어요</Text>
          </View>
        </View>

        <View style={styles.submittedSummary}>
          <SummaryLine label="작성 항목" value={selectedTitles || '선택 항목'} />
          <SummaryLine label="전체 분위기" value={report.moodTitle} />
          <SummaryLine label="대표 키워드" value={keywordPreview || '강의평 등록 완료'} />
          <SummaryLine label="등록 방식" value="익명 강의평" />
        </View>

        <View style={styles.submittedCallout}>
          <View style={styles.submittedCalloutIcon}>
            <Ionicons name="information-circle" size={18} color="#171A1F" />
          </View>
          <Text style={styles.submittedCalloutText}>
            작성한 정보는 강의 리포트와 추천 판단에 반영돼요.
          </Text>
        </View>

        <View style={styles.submittedTooltip}>
          <Text style={styles.submittedTooltipText}>정성껏 남긴 후기가 다른 학생의 수강 선택을 도와줘요</Text>
          <View style={styles.submittedTooltipTail} />
        </View>

        <PressableScale style={styles.submittedPrimaryButton} onPress={onClose}>
          <Text style={styles.submittedPrimaryButtonText}>강의로 돌아가기</Text>
        </PressableScale>

        <PressableScale style={styles.submittedSecondaryButton} onPress={onClose}>
          <Text style={styles.submittedSecondaryButtonText}>완료</Text>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.submittedSummaryRow}>
      <Text style={styles.submittedSummaryLabel}>{label}</Text>
      <Text style={styles.submittedSummaryValue}>{value}</Text>
    </View>
  );
}

function getCurrentSemesterLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const term = month >= 1 && month <= 6 ? 1 : 2;
  return `${year}-${term}학기`;
}

function getSemanticStep(stage: StageKey) {
  if (stage === 'select') {
    return 1;
  }
  if (stage === 'evaluate') {
    return 2;
  }
  if (stage === 'note') {
    return 3;
  }
  return 4;
}

function getCurrentSelectionCount(
  stage: StageKey,
  selectedCategories: CategoryKey[],
  choices: Record<CategoryKey, string[]>,
  content: string,
) {
  if (stage === 'select') return selectedCategories.length;
  if (stage === 'evaluate') return Object.values(choices).flat().length;
  if (stage === 'note') return content.trim().length >= 10 ? 1 : 0;
  return 1;
}

function getBottomSummary(stage: StageKey, currentSelectionCount: number, keywordCount: number) {
  if (stage === 'select') {
    return `${currentSelectionCount}개 항목 선택됨`;
  }
  if (stage === 'evaluate') {
    return `키워드 ${keywordCount}개 선택`;
  }
  if (stage === 'note') {
    return `키워드 ${keywordCount}개 ㅣ 문장 ${currentSelectionCount}/1`;
  }
  return `키워드 ${keywordCount}/10`;
}

function getStageTitle(stage: StageKey) {
  if (stage === 'select') {
    return '이 강의에서 무엇이 기억났나요?';
  }
  if (stage === 'evaluate') {
    return '한 항목씩 천천히 정리해볼게요';
  }
  if (stage === 'note') {
    return '마지막으로 한 문장만 남겨주세요';
  }
  if (stage === 'preview') {
    return '등록 전 리포트를 확인해주세요';
  }
  return '';
}

function getStageSubtitle(stage: StageKey) {
  if (stage === 'select') {
    return '먼저 큰 흐름만 고르면, 다음 화면에서 세부 경험을 이어서 묻습니다.';
  }
  if (stage === 'evaluate') {
    return '답변은 이후 강의 리포트의 판단 근거로 정리됩니다.';
  }
  if (stage === 'note') {
    return '리포트의 결론처럼 보일 한줄평을 남겨주세요.';
  }
  if (stage === 'preview') {
    return '선택한 경험과 한줄평이 아래처럼 요약되어 익명 등록됩니다.';
  }
  return '';
}

function buildReport({
  selectedCategories,
  choices,
  feels,
  questionAnswers,
  toggleAnswers,
  content,
}: {
  selectedCategories: CategoryKey[];
  choices: Record<CategoryKey, string[]>;
  feels: Record<CategoryKey, number>;
  questionAnswers: Record<QuestionKey, number>;
  toggleAnswers: Record<ToggleKey, boolean | null>;
  content: string;
}) {
  const flattened = Object.values(choices).flat();
  const high = (...keys: QuestionKey[]) => keys.some((key) => questionAnswers[key] >= 3);
  const low = (...keys: QuestionKey[]) => keys.some((key) => questionAnswers[key] <= 1);
  const positiveSignals = flattened.filter((item) => item.includes('좋') || item.includes('추천') || item.includes('깔끔') || item.includes('편')).length
    + (feels.classMethod === 2 ? 1 : 0)
    + (feels.atmosphere === 2 ? 1 : 0)
    + (feels.target === 2 ? 1 : 0)
    + (high('lectureGood', 'lectureMaterialHelpful', 'gradingFair', 'gradingPlus', 'examInfoEnough') ? 1 : 0);
  const negativeSignals = flattened.filter((item) => item.includes('많') || item.includes('엄격') || item.includes('압박') || item.includes('어렵') || item.includes('필요')).length
    + (feels.workload === 2 ? 1 : 0)
    + (feels.exam === 2 ? 1 : 0)
    + (feels.attendance === 2 ? 1 : 0)
    + (high('examDifficultyHard', 'examTimeShort', 'assignmentFrequent', 'assignmentHard', 'prerequisiteNeeded') ? 1 : 0);
  const moodTitle = flattened.some((item) => item.includes('실무') || item.includes('피드백'))
    ? '성장형 강의'
    : flattened.some((item) => item.includes('널널') || item.includes('자유')) || (feels.workload === 0 && feels.attendance === 0)
      ? '편안형 강의'
      : negativeSignals >= Math.max(positiveSignals, 2)
        ? '준비형 강의'
        : '균형형 강의';
  const moodCopy = getReportSentence(questionAnswers, choices, toggleAnswers, flattened);
  const examWorkload = [
    ...choices.exam,
    ...choices.examMethod,
    ...choices.examInfo,
    ...choices.assignment,
    ...(toggleAnswers.teamProject === true ? ['팀플 있음'] : toggleAnswers.teamProject === false ? ['팀플 없음'] : []),
    ...(toggleAnswers.quiz === true ? ['퀴즈 있음'] : toggleAnswers.quiz === false ? ['퀴즈 없음'] : []),
  ].filter(Boolean);
  const targets = choices.target.length > 0 ? [...new Set(choices.target)] : ['성실형 학생 추천'];
  const questionKeywords = [
    high('examDifficultyHard') ? '시험 어려움' : low('examDifficultyHard') ? '시험 부담 낮음' : '',
    high('assignmentFrequent', 'assignmentHard') ? '과제 부담' : '',
    high('prerequisiteNeeded', 'prerequisiteImpact') ? '선수지식 필요' : '',
    high('depthAdvanced') ? '상위 전공 연결' : '',
    high('lectureGood', 'lectureMaterialHelpful') ? '강의력 좋음' : '',
  ].filter(Boolean);
  const keywords = [...new Set([...flattened, ...questionKeywords, ...selectedCategories.map((key) => categories.find((item) => item.key === key)?.title ?? '')])]
    .filter(Boolean)
    .slice(0, 12);
  const rating = Math.max(3, Math.min(5, 4 + Math.min(positiveSignals, 2) * 0.5 - Math.min(negativeSignals, 2) * 0.5));

  return {
    moodTitle,
    moodCopy,
    examWorkload: examWorkload.length > 0 ? examWorkload : ['아직 시험/과제 데이터가 없어요'],
    targets,
    keywords,
    rating,
    summary: content.trim(),
  };
}

function buildPayloadValues(
  selectedCategories: CategoryKey[],
  choices: Record<CategoryKey, string[]>,
  feels: Record<CategoryKey, number>,
  questionAnswers: Record<QuestionKey, number>,
  toggleAnswers: Record<ToggleKey, boolean | null>,
) {
  const selected = new Set<CategoryKey>([
    ...selectedCategories,
    ...selectedCategories.flatMap((category) => evaluationPlan[category] ?? [category]),
    ...Object.entries(choices)
      .filter(([, options]) => options.length > 0)
      .map(([key]) => key as CategoryKey),
  ]);
  const has = (key: CategoryKey, word: string) => choices[key].some((item) => item.includes(word));
  const level = (easy: boolean, hard: boolean) => hard ? 'hard' : easy ? 'easy' : 'medium';
  const score = (key: CategoryKey, easy: boolean, hard: boolean, feelScore?: number) => {
    if (!selected.has(key)) {
      return null;
    }
    if (feelScore === 2) {
      return 9;
    }
    if (feelScore === 0) {
      return 3;
    }
    if (hard) {
      return 9;
    }
    if (easy) {
      return 3;
    }
    return 6;
  };

  const q = (key: QuestionKey) => questionAnswers[key] ?? 2;
  const avgScore = (...keys: QuestionKey[]) => {
    const average = keys.reduce((sum, key) => sum + q(key), 0) / Math.max(keys.length, 1);
    return Math.round(1 + (average / 4) * 9);
  };
  const difficultyHard = has('examInfo', '응용') || q('examDifficultyHard') >= 3 || q('examTimeShort') >= 3 || feels.exam === 2;
  const difficultyEasy = has('exam', '자료') || q('examDifficultyHard') <= 1 || feels.exam === 0;
  const workloadHard = q('assignmentFrequent') >= 3 || q('assignmentHard') >= 3 || toggleAnswers.teamProject === true || feels.assignment === 2;
  const workloadEasy = choices.assignment.includes('과제 없음') || q('assignmentFrequent') <= 1 || feels.assignment === 0;
  const attendanceHard = has('attendance', '엄격') || has('attendance', '지각') || has('attendance', '체크') || feels.attendance === 2;
  const attendanceEasy = has('attendance', '널널') || feels.attendance === 0;
  const gradingEasy = choices.target.some((item) => item.includes('학점')) || q('gradingFair') >= 3 || q('gradingPlus') >= 3 || feels.workload === 2;
  const prerequisiteHard = q('prerequisiteNeeded') >= 3 || q('prerequisiteImpact') >= 3 || has('prerequisite', '필요');
  const prerequisiteEasy = q('prerequisiteNeeded') <= 1 || has('prerequisite', '기초 없어도');
  const depthHigh = q('depthAdvanced') >= 3 || q('depthTheory') >= 3 || q('practiceGradeImpact') >= 3;
  const depthLow = q('depthIntro') >= 3 || q('depthBroad') >= 3;

  return {
    difficulty: level(difficultyEasy, difficultyHard),
    workload: level(workloadEasy, workloadHard),
    attendance: level(attendanceEasy, attendanceHard),
    grading: gradingEasy ? 'easy' : 'medium',
    diffScore: selected.has('exam') ? avgScore('examDifficultyHard', 'examTimeShort', 'examGapLarge') : score('exam', difficultyEasy, difficultyHard, feels.exam),
    gradScore: selected.has('target') ? avgScore('gradingFair', 'gradingPlus') : null,
    workScore: selected.has('assignment') ? avgScore('assignmentFrequent', 'assignmentHard') : score('assignment', workloadEasy, workloadHard, feels.assignment),
    prerequisiteScore: selected.has('prerequisite') ? avgScore('prerequisiteNeeded', 'prerequisiteImpact') : null,
    depthScore: selected.has('depth') ? avgScore('depthTheory', 'depthBroad', 'depthAdvanced') : null,
    pastExamScore: selected.has('examInfo') ? (q('pastExamImpact') >= 3 ? 9 : q('pastExamImpact') <= 1 ? 3 : 6) : null,
  };
}

function getReportSentence(
  questionAnswers: Record<QuestionKey, number>,
  choices: Record<CategoryKey, string[]>,
  toggleAnswers: Record<ToggleKey, boolean | null>,
  flattened: string[],
) {
  const q = (key: QuestionKey) => questionAnswers[key] ?? 2;

  if (q('examDifficultyHard') >= 3 || q('assignmentHard') >= 3) {
    return '시험이나 과제 부담이 있는 편이라 일정과 준비 시간을 미리 잡아두면 좋아요.';
  }
  if (q('lectureGood') >= 3 && q('lectureMaterialHelpful') >= 3) {
    return '강의 전달과 자료에 긍정적인 신호가 있어 수업 흐름을 따라가기 좋은 편이에요.';
  }
  if (q('gradingFair') >= 3 || q('gradingPlus') >= 3) {
    return '노력한 만큼 점수에 반영된다는 신호가 있어 성실형 학생에게 잘 맞아요.';
  }
  if (toggleAnswers.teamProject === true || toggleAnswers.practice === true) {
    return '팀플이나 실습 여부가 체감 난이도에 영향을 줄 수 있어요.';
  }
  if (choices.examMethod.length > 0 || flattened.length > 0) {
    return `${[...choices.examMethod, ...flattened].slice(0, 2).join(', ')} 같은 정보가 남아 수강 판단에 도움이 돼요.`;
  }
  return '선택한 항목을 바탕으로 강의 분위기를 정리합니다.';
}

function buildExtendedPayload(
  choices: Record<CategoryKey, string[]>,
  questionAnswers: Record<QuestionKey, number>,
  toggleAnswers: Record<ToggleKey, boolean | null>,
  extraNotes: { prerequisite: string; examOther: string },
) {
  const q = (key: QuestionKey) => questionAnswers[key] ?? 2;
  const label = (value: number) => value >= 3 ? '높음' : value <= 1 ? '낮음' : '보통';
  const examTypes = choices.examMethod.filter((item) => item !== '기타');
  const problemStyles = [
    q('examApplication') >= 3 ? '응용형' : '',
    choices.examMethod.includes('객관식') ? '객관식' : '',
    choices.examMethod.includes('서술형') ? '서술형' : '',
    choices.examMethod.includes('계산형') ? '계산형' : '',
    choices.examMethod.includes('OX') ? 'OX' : '',
  ].filter(Boolean);
  const badges = [
    q('lectureGood') >= 3 ? '강의력 좋음' : '',
    q('examDifficultyHard') >= 3 ? '시험 어려움' : '',
    q('assignmentFrequent') >= 3 ? '과제 잦음' : '',
    q('prerequisiteNeeded') >= 3 ? '선수지식 필요' : '',
    toggleAnswers.teamProject === true ? '팀플 있음' : '',
    toggleAnswers.practice === true ? '실습 있음' : '',
    toggleAnswers.quiz === true ? '퀴즈 있음' : '',
  ].filter(Boolean);

  return {
    examTypes: examTypes.length > 0 ? examTypes : undefined,
    assignmentType: choices.assignment[0],
    textbook: choices.textbook[0] ?? (q('textbookNeeded') >= 3 ? '교재 필요' : q('textbookMaterialCentered') >= 3 ? '강의자료 중심' : undefined),
    examInfo: [
      `시험 난이도 ${label(q('examDifficultyHard'))}`,
      `시험 시간 압박 ${label(q('examTimeShort'))}`,
      choices.examInfo.join(', '),
      extraNotes.examOther ? `기타 시험 방식: ${extraNotes.examOther}` : '',
    ].filter(Boolean).join(' · '),
    notRecommendFor: q('examDifficultyHard') >= 3 || q('assignmentHard') >= 3
      ? ['시험/과제 부담이 큰 학기를 피하고 싶은 사람']
      : undefined,
    badges,
    examMidtermInfo: `중간/기말 난이도 차이 ${label(q('examGapLarge'))}`,
    examFinalInfo: `시험 범위 예측 ${label(q('examInfoEnough'))}`,
    examAssignmentInfo: `과제 빈도 ${label(q('assignmentFrequent'))} · 과제 난이도 ${label(q('assignmentHard'))}`,
    examQuizInfo: toggleAnswers.quiz === null
      ? undefined
      : toggleAnswers.quiz ? `퀴즈 난이도 ${label(q('quizHard'))} · 성적 영향 ${label(q('quizGradeImpact'))}` : '퀴즈 없음',
    pastExamHelpfulness: label(q('pastExamImpact')),
    scopePredictability: label(q('examInfoEnough')),
    studyResources: [
      q('lectureMaterialHelpful') >= 3 ? 'PPT/판서/예시' : '',
      q('recordingHelpful') >= 3 ? '녹화 강의' : '',
      q('textbookNeeded') >= 3 ? '교재' : '',
      extraNotes.prerequisite ? `선수지식: ${extraNotes.prerequisite}` : '',
    ].filter(Boolean),
    problemStyles,
    examPrepTip: [
      q('pastExamImpact') >= 3 ? '족보와 기출 영향을 확인하세요.' : '',
      q('examApplication') >= 3 ? '단순 암기보다 응용 대비가 필요해요.' : '',
      q('textbookNeeded') >= 3 ? '교재 기반 정리가 도움이 돼요.' : '',
    ].filter(Boolean).join(' '),
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  keyboardWrap: {
    flex: 1,
  },
  topHeader: {
    minHeight: 56,
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackText: {
    color: '#4D5866',
    fontSize: 40,
    lineHeight: 40,
    fontWeight: '400',
    marginTop: -4,
  },
  headerTitle: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0,
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
    marginLeft: 'auto',
  },
  headerHelpButton: {
    marginLeft: 'auto',
    minWidth: 54,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerHelpText: {
    color: '#6E7A88',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  headerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCloseText: {
    color: theme.text,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '400',
    marginTop: -2,
  },
  screen: {
    paddingHorizontal: 0,
    gap: 14,
    paddingTop: 18,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.group,
  },
  titleGroup: {
    flex: 1,
    gap: 8,
  },
  pageTitle: {
    color: theme.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  workflow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  workflowItem: {
    width: 58,
    alignItems: 'center',
    gap: 5,
  },
  workflowLine: {
    position: 'absolute',
    left: -29,
    top: 18,
    width: 58,
    height: 1,
    backgroundColor: '#E5E8EF',
  },
  workflowLineActive: {
    backgroundColor: theme.blue,
  },
  workflowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E5E8EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowCircleActive: {
    backgroundColor: theme.blue,
  },
  workflowIcon: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  workflowIconActive: {
    color: '#ffffff',
  },
  workflowLabel: {
    color: '#9AA5B5',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  workflowLabelActive: {
    color: theme.blue,
  },
  stagePanel: {
    backgroundColor: theme.bg,
    gap: 18,
  },
  cardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackText: {
    color: theme.text,
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '500',
    marginTop: -4,
  },
  cardCloseText: {
    color: theme.text,
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '500',
  },
  promptBlock: {
    paddingHorizontal: spacing.page,
    paddingTop: 8,
    gap: 14,
  },
  guideTabs: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    backgroundColor: 'transparent',
    gap: 10,
    marginTop: -2,
    paddingRight: 3,
  },
  guideTab: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  guideTabActive: {
    backgroundColor: 'transparent',
  },
  guideTabText: {
    color: '#8D98A6',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  guideTabTextActive: {
    color: theme.blue,
  },
  selectionCardActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  stepBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#E0F0FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stepBadgeText: {
    color: theme.blue,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
  },
  stageTitle: {
    color: '#171A1F',
    fontSize: 25,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  stageSubtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  stageBody: {
    minHeight: 520,
    paddingHorizontal: spacing.page,
  },
  pickList: {
    gap: 12,
  },
  interviewLead: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  interviewLeadEyebrow: {
    color: theme.blue,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  interviewLeadTitle: {
    color: '#111318',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  interviewLeadBody: {
    color: '#657183',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  pickCard: {
    minHeight: 104,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF5',
    paddingHorizontal: 15,
    paddingVertical: 17,
  },
  pickCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#A9DDFF',
  },
  pickCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pickCopy: {
    flex: 1,
    gap: 5,
  },
  pickTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pickTitle: {
    color: '#111318',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pickDescription: {
    color: '#5F6C7D',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  pickDetail: {
    color: '#6E7A88',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  pickCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.4,
    borderColor: '#C9D2DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickCheckActive: {
    backgroundColor: '#23A9FF',
    borderColor: '#23A9FF',
  },
  visitCard: {
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitText: {
    flex: 1,
    color: '#5F6C7D',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  visitAction: {
    color: '#8D98A6',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  evaluateWrap: {
    gap: 14,
  },
  evalInterviewHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  evalProgressPill: {
    alignSelf: 'flex-start',
    minWidth: 48,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#E7F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalProgressText: {
    color: theme.blue,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  evalInterviewLabel: {
    color: '#657183',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  evalQuestionCard: {
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5ECF3',
    padding: 16,
    gap: 14,
  },
  evalReportNotice: {
    minHeight: 42,
    borderRadius: 9,
    backgroundColor: '#EAF7FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evalReportNoticeText: {
    flex: 1,
    color: '#4E5B6B',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  booleanSwitch: {
    borderRadius: 10,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  booleanQuestion: {
    color: '#283445',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  booleanOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  booleanOption: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E9F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  booleanOptionActive: {
    backgroundColor: theme.blue,
    borderColor: theme.blue,
  },
  booleanOptionText: {
    color: '#657183',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  booleanOptionTextActive: {
    color: '#FFFFFF',
  },
  questionList: {
    gap: 8,
  },
  questionScaleCard: {
    borderRadius: 10,
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  questionScaleTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  questionScaleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.blue,
    marginTop: 6,
  },
  questionText: {
    flex: 1,
    color: '#2D3746',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  fiveScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  fiveScaleDot: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fiveScaleDotActive: {
    backgroundColor: theme.blue,
    borderColor: theme.blue,
  },
  fiveScaleDotText: {
    color: '#8B96A5',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  fiveScaleDotTextActive: {
    color: '#FFFFFF',
  },
  fiveScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fiveScaleLabel: {
    color: '#8B96A5',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  evalQuestionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  evalQuestionCopy: {
    flex: 1,
    gap: 5,
    paddingTop: 2,
  },
  evalQuestionTitle: {
    color: '#111318',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  evalQuestionBody: {
    color: '#6E7A88',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  feelingScale: {
    gap: 9,
  },
  scaleTrack: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F1F4F7',
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  scaleSegment: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleSegmentActive: {
    backgroundColor: '#FFFFFF',
  },
  scaleSegmentText: {
    color: '#8B96A5',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  scaleSegmentTextActive: {
    color: theme.blue,
  },
  scaleDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  scaleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D7DEE8',
  },
  scaleDotActive: {
    backgroundColor: theme.blue,
  },
  memoryList: {
    gap: 14,
  },
  memoryCard: {
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 13,
  },
  memoryCardActive: {
    backgroundColor: '#FFFFFF',
  },
  memoryCardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  memoryCopy: {
    flex: 1,
    gap: 5,
    paddingTop: 2,
  },
  memoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  memoryTitle: {
    color: '#111318',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  betaLabel: {
    color: '#FF4971',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  memoryDescription: {
    color: '#5F6C7D',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  memoryCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.3,
    borderColor: '#C9D2DE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  memoryCheckActive: {
    backgroundColor: theme.blue,
    borderColor: theme.blue,
  },
  memoryExpanded: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
  },
  memoryExpandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  memoryGuide: {
    flex: 1,
    color: '#657183',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  keywordCounter: {
    color: theme.blue,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  keywordGroup: {
    gap: 8,
  },
  keywordGroupTitle: {
    color: '#3E4856',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  keywordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    minHeight: 32,
    borderRadius: 9,
    backgroundColor: '#F2F5F8',
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordChipActive: {
    backgroundColor: theme.blueSoft,
  },
  keywordChipText: {
    color: '#667386',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  keywordChipTextActive: {
    color: theme.blue,
  },
  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#C8D2E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  checkCircleActive: {
    backgroundColor: theme.blue,
    borderColor: theme.blue,
  },
  checkText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  itemIconBox: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: '#F0F5FA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  itemIconBoxActive: {
    backgroundColor: '#EEF7FF',
  },
  inhaIconSheet: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inhaIconLines: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 7,
    gap: 3,
    opacity: 0.35,
  },
  inhaIconLine: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#7C8A9B',
  },
  inhaIconLineShort: {
    width: '58%',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#7C8A9B',
  },
  inhaIconBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    minWidth: 19,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DCE5EF',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inhaIconBadgeText: {
    color: '#718092',
    fontSize: 6,
    lineHeight: 8,
    fontWeight: '900',
  },
  inhaIconBadgeTextActive: {
    color: '#FFFFFF',
  },
  evalIconMiniText: {
    position: 'absolute',
    right: 8,
    bottom: 7,
    color: theme.blue,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
  },
  categoryGrid: {
    gap: 18,
  },
  optionList: {
    gap: 10,
  },
  optionRow: {
    minHeight: 52,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E8EDF3',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  optionRowActive: {
    borderColor: '#D5E2FF',
    backgroundColor: '#FFFFFF',
  },
  optionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  optionIconActive: {
    backgroundColor: '#EFF5FF',
  },
  optionCheck: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    borderWidth: 1.4,
    borderColor: '#C8D2E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckText: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    color: '#657183',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodTile: {
    minHeight: 66,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  moodTileActive: {
    borderColor: theme.blue,
    backgroundColor: '#FFFFFF',
  },
  moodIcon: {
    color: '#8D98A6',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  moodText: {
    color: theme.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  moodTextActive: {
    color: theme.text,
  },
  noteWrap: {
    gap: 8,
  },
  noteGuide: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 5,
  },
  noteGuideTitle: {
    color: '#111318',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  noteGuideBody: {
    color: '#667386',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  noteInput: {
    minHeight: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: theme.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  shortNoteInput: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    color: theme.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  countText: {
    alignSelf: 'flex-end',
    color: theme.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  previewConfirm: {
    gap: 18,
  },
  previewIntro: {
    gap: 8,
  },
  previewIntroTitle: {
    color: '#171A1F',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  previewIntroBody: {
    color: '#4E5968',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  previewLedgerCard: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  previewLedgerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewLedgerIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF2F7',
  },
  previewLedgerTitle: {
    flex: 1,
    color: '#1A1D22',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  previewLedgerTitleMuted: {
    color: '#697585',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#E4E9EF',
  },
  previewMetricRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewMetricIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMetricCopy: {
    flex: 1,
    gap: 3,
  },
  previewMetricLabel: {
    color: '#27303C',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  previewMetricHelper: {
    color: '#7A8798',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  previewMetricValue: {
    maxWidth: '44%',
    color: '#171A1F',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  previewQuotePanel: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  previewQuoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewQuoteLabel: {
    color: '#171A1F',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  previewQuoteBadge: {
    minWidth: 42,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F6FF',
  },
  previewQuoteBadgeText: {
    color: '#27A8FF',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  previewQuoteText: {
    color: '#2D3440',
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '500',
  },
  previewFootnotes: {
    gap: 7,
    paddingHorizontal: 2,
  },
  previewFootnote: {
    color: '#4F5B6A',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '500',
  },
  previewNotice: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F5F7F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewNoticeText: {
    flex: 1,
    color: '#2A3038',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '600',
  },
  progressBars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: spacing.page,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E6EBF0',
  },
  progressBarActive: {
    backgroundColor: theme.blue,
  },
  errorText: {
    color: theme.red,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    paddingHorizontal: spacing.page,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: '#ffffff',
    borderColor: '#E5E8EF',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: theme.blue,
    borderColor: theme.blue,
  },
  infoNotice: {
    minHeight: 48,
    marginHorizontal: 0,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.page,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  bottomSummary: {
    height: 28,
    paddingHorizontal: 0,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomSummaryLabel: {
    color: '#657183',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  bottomSummaryText: {
    color: '#4A5563',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  infoIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.4,
    borderColor: theme.faint,
    color: theme.faint,
    textAlign: 'center',
    lineHeight: 16,
    fontSize: 12,
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
    color: theme.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  fullState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.group,
    paddingHorizontal: spacing.page,
  },
  fullStateBody: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
  },
  duplicateState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    paddingHorizontal: spacing.page,
  },
  duplicateTitle: {
    color: '#111318',
    fontSize: 23,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.25,
  },
  duplicateButton: {
    minWidth: 132,
    minHeight: 56,
    borderRadius: 10,
    backgroundColor: theme.blue,
    borderColor: theme.blue,
  },
  submittedSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  submittedContent: {
    flexGrow: 1,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  submittedHero: {
    minHeight: 244,
    paddingHorizontal: spacing.page,
    paddingTop: 92,
    alignItems: 'center',
    gap: 18,
    backgroundColor: '#FFFFFF',
  },
  submittedTitle: {
    color: '#101216',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  submittedBanner: {
    minHeight: 42,
    borderRadius: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F6FF',
  },
  submittedBannerText: {
    color: '#27A8FF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  submittedSummary: {
    paddingHorizontal: spacing.page,
    paddingTop: 28,
    gap: 24,
    backgroundColor: '#FFFFFF',
  },
  submittedSummaryRow: {
    gap: 8,
  },
  submittedSummaryLabel: {
    color: '#171A1F',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  submittedSummaryValue: {
    color: '#2C3440',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  submittedCallout: {
    minHeight: 82,
    marginHorizontal: spacing.page,
    marginTop: 22,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#F5F7F9',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  submittedCalloutIcon: {
    width: 20,
    height: 20,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedCalloutText: {
    flex: 1,
    color: '#2A3038',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '600',
  },
  submittedTooltip: {
    minHeight: 58,
    marginHorizontal: spacing.page,
    marginTop: 18,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4C5563',
    position: 'relative',
  },
  submittedTooltipText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  submittedTooltipTail: {
    position: 'absolute',
    left: 34,
    bottom: -10,
    width: 18,
    height: 18,
    backgroundColor: '#4C5563',
    transform: [{ rotate: '45deg' }],
  },
  submittedPrimaryButton: {
    minHeight: 58,
    marginHorizontal: spacing.page,
    marginTop: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#24AAFF',
  },
  submittedPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  submittedSecondaryButton: {
    minHeight: 58,
    marginHorizontal: spacing.page,
    marginTop: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7EBF0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  submittedSecondaryButtonText: {
    color: '#697585',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
});
