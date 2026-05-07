import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { createReview, getMyReviews } from '../lib/api/reviews';
import { AppNavigation } from '../navigation/AppNavigator';
import { spacing } from '../theme/spacing';
import { Review } from '../types/models';

interface Props {
  navigation: AppNavigation;
  route: {
    name: 'ReviewWrite';
    courseId: number;
  };
}

type Level = 'easy' | 'medium' | 'hard';
type CriterionKey = 'teaching' | 'difficulty' | 'workload' | 'attendance' | 'grading' | 'exam';
type Stage = 'select' | 'rating' | CriterionKey | 'note' | 'preview';

const theme = {
  bg: '#f7f9fd',
  surface: '#ffffff',
  surfaceRaised: '#edf3fb',
  line: 'rgba(22,73,154,0.12)',
  gold: '#d7ad4d',
  goldSoft: 'rgba(215,173,77,0.18)',
  text: '#121826',
  muted: '#65738a',
  faint: '#9aa6b8',
  blue: '#16499a',
  red: '#d84f41',
  green: '#226d68',
} as const;

const criterionCatalog: Array<{
  key: CriterionKey;
  label: string;
  shortLabel: string;
  question: string;
  description: string;
  weightLabel: string;
}> = [
  {
    key: 'teaching',
    label: '수업 전달력',
    shortLabel: '전달력',
    question: '교수님의 설명은 얼마나 잘 들어왔나요?',
    description: '선택하면 요약에서 수업 이해도와 전달력이 더 크게 반영됩니다.',
    weightLabel: '높은 가중치',
  },
  {
    key: 'difficulty',
    label: '체감 난이도',
    shortLabel: '난이도',
    question: '이 강의의 체감 난이도는 어땠나요?',
    description: '수강 전 가장 많이 보는 기준이라 선택 시 강하게 반영합니다.',
    weightLabel: '높은 가중치',
  },
  {
    key: 'workload',
    label: '과제와 준비량',
    shortLabel: '과제량',
    question: '과제와 준비량은 어느 정도였나요?',
    description: '과제 부담, 복습량, 시간 투자 감각을 중심으로 기록합니다.',
    weightLabel: '높은 가중치',
  },
  {
    key: 'attendance',
    label: '출결 운영',
    shortLabel: '출결',
    question: '출결 운영은 얼마나 엄격했나요?',
    description: '출석 체크, 지각, 결석 감각을 큐레이션에 반영합니다.',
    weightLabel: '높은 가중치',
  },
  {
    key: 'grading',
    label: '학점 체감',
    shortLabel: '학점',
    question: '학점은 어느 정도로 잘 나오는 편인가요?',
    description: '학점 전략을 보는 학생에게 중요한 정보로 강조됩니다.',
    weightLabel: '높은 가중치',
  },
  {
    key: 'exam',
    label: '시험과 족보',
    shortLabel: '시험',
    question: '시험 대비와 족보 도움은 어땠나요?',
    description: '시험 방식과 대비 감각을 한 장의 노트처럼 남깁니다.',
    weightLabel: '높은 가중치',
  },
];

const criterionMap = criterionCatalog.reduce(
  (acc, item) => ({ ...acc, [item.key]: item }),
  {} as Record<CriterionKey, (typeof criterionCatalog)[number]>,
);

const lowWeightScore = 2;
const burstPositions = [
  { x: -72, y: -44, rotate: '-18deg' },
  { x: -20, y: -72, rotate: '8deg' },
  { x: 42, y: -46, rotate: '22deg' },
  { x: -48, y: 30, rotate: '14deg' },
  { x: 54, y: 28, rotate: '-12deg' },
] as const;
const constellationPatterns = [
  {
    nodes: [
      { left: '14%', top: '64%' },
      { left: '31%', top: '36%' },
      { left: '54%', top: '52%' },
      { left: '70%', top: '28%' },
      { left: '83%', top: '58%' },
    ],
    lines: [
      { left: '19%', top: '69%', width: 120, rotate: '-58deg' },
      { left: '36%', top: '41%', width: 116, rotate: '28deg' },
      { left: '59%', top: '57%', width: 104, rotate: '-50deg' },
      { left: '75%', top: '33%', width: 105, rotate: '52deg' },
    ],
  },
  {
    nodes: [
      { left: '18%', top: '34%' },
      { left: '34%', top: '57%' },
      { left: '53%', top: '30%' },
      { left: '68%', top: '60%' },
      { left: '82%', top: '39%' },
    ],
    lines: [
      { left: '23%', top: '39%', width: 99, rotate: '55deg' },
      { left: '39%', top: '62%', width: 125, rotate: '-50deg' },
      { left: '58%', top: '35%', width: 122, rotate: '58deg' },
      { left: '73%', top: '65%', width: 88, rotate: '-50deg' },
    ],
  },
  {
    nodes: [
      { left: '13%', top: '48%' },
      { left: '31%', top: '27%' },
      { left: '47%', top: '55%' },
      { left: '65%', top: '43%' },
      { left: '82%', top: '25%' },
    ],
    lines: [
      { left: '18%', top: '53%', width: 106, rotate: '-44deg' },
      { left: '36%', top: '32%', width: 115, rotate: '57deg' },
      { left: '52%', top: '60%', width: 96, rotate: '-28deg' },
      { left: '70%', top: '48%', width: 96, rotate: '-42deg' },
    ],
  },
  {
    nodes: [
      { left: '18%', top: '61%' },
      { left: '28%', top: '34%' },
      { left: '50%', top: '38%' },
      { left: '62%', top: '63%' },
      { left: '80%', top: '48%' },
    ],
    lines: [
      { left: '23%', top: '66%', width: 102, rotate: '-70deg' },
      { left: '33%', top: '39%', width: 104, rotate: '7deg' },
      { left: '55%', top: '43%', width: 97, rotate: '63deg' },
      { left: '67%', top: '68%', width: 101, rotate: '-34deg' },
    ],
  },
] as const;

const criterionArtifacts: Record<CriterionKey, {
  objectLabel: string;
  actionLabel: string;
  accent: string;
}> = {
  teaching: {
    objectLabel: '오디오 가이드',
    actionLabel: '설명 흐름을 맞춰보세요',
    accent: '#16499a',
  },
  difficulty: {
    objectLabel: '난이도 게이지',
    actionLabel: '체감 높이를 조절해요',
    accent: '#d84f41',
  },
  workload: {
    objectLabel: '준비 티켓',
    actionLabel: '부담량을 펀칭해요',
    accent: '#d7ad4d',
  },
  attendance: {
    objectLabel: '입장 체크',
    actionLabel: '출결 감각을 체크해요',
    accent: '#226d68',
  },
  grading: {
    objectLabel: '성취 리본',
    actionLabel: '학점 체감을 묶어둬요',
    accent: '#20345f',
  },
  exam: {
    objectLabel: '시험 파일',
    actionLabel: '대비 단서를 분류해요',
    accent: '#7b5c35',
  },
};

function getCurrentSemesterLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const term = month >= 1 && month <= 6 ? 1 : 2;
  return `${year}-${term}학기`;
}

function getMetricOptions(key: CriterionKey) {
  switch (key) {
    case 'teaching':
      return [
        { label: '아쉬움', value: 'easy' as Level, copy: '설명이 자주 끊겼어요' },
        { label: '무난', value: 'medium' as Level, copy: '따라갈 수 있었어요' },
        { label: '좋음', value: 'hard' as Level, copy: '이해가 잘 됐어요' },
      ];
    case 'difficulty':
      return [
        { label: '쉬움', value: 'easy' as Level, copy: '부담이 낮았어요' },
        { label: '보통', value: 'medium' as Level, copy: '적당히 챙기면 돼요' },
        { label: '어려움', value: 'hard' as Level, copy: '각오가 필요해요' },
      ];
    case 'workload':
      return [
        { label: '적음', value: 'easy' as Level, copy: '과제 부담이 적어요' },
        { label: '보통', value: 'medium' as Level, copy: '평균적인 편이에요' },
        { label: '많음', value: 'hard' as Level, copy: '시간을 많이 써요' },
      ];
    case 'attendance':
      return [
        { label: '널널', value: 'easy' as Level, copy: '출결 부담이 낮아요' },
        { label: '보통', value: 'medium' as Level, copy: '일반적인 수준이에요' },
        { label: '엄격', value: 'hard' as Level, copy: '출석 관리가 중요해요' },
      ];
    case 'grading':
      return [
        { label: '후함', value: 'easy' as Level, copy: '학점이 잘 나와요' },
        { label: '보통', value: 'medium' as Level, copy: '평균적인 편이에요' },
        { label: '까다로움', value: 'hard' as Level, copy: '평가가 빡빡해요' },
      ];
    case 'exam':
      return [
        { label: '예측 가능', value: 'easy' as Level, copy: '대비 방향이 보여요' },
        { label: '보통', value: 'medium' as Level, copy: '평범한 시험이에요' },
        { label: '변수 많음', value: 'hard' as Level, copy: '넓게 봐야 해요' },
      ];
    default:
      return [];
  }
}

function getScoreFromLevel(level: Level) {
  if (level === 'easy') {
    return 4;
  }
  if (level === 'hard') {
    return 5;
  }
  return 3;
}

function getApiLevel(key: CriterionKey, level: Level) {
  if (key === 'teaching') {
    return level === 'hard' ? '좋음' : level === 'easy' ? '아쉬움' : '보통';
  }
  return level === 'easy' ? 'easy' : level === 'hard' ? 'hard' : 'medium';
}

function getSelectedLabel(key: CriterionKey, level: Level) {
  return getMetricOptions(key).find((option) => option.value === level)?.label ?? '보통';
}

function buildCuratorSummary({
  rating,
  selectedCriteria,
  values,
}: {
  rating: number;
  selectedCriteria: CriterionKey[];
  values: Record<CriterionKey, Level>;
}) {
  const ratingLead =
    rating >= 5
      ? '전반 만족도가 높은 강의입니다.'
      : rating >= 4
        ? '추천할 만한 지점이 분명한 강의입니다.'
        : rating >= 3
          ? '장단점을 보고 선택하면 좋은 강의입니다.'
          : '수강 전 조건을 꼼꼼히 확인하는 편이 좋은 강의입니다.';

  const chosen = selectedCriteria
    .slice(0, 3)
    .map((key) => `${criterionMap[key].shortLabel} ${getSelectedLabel(key, values[key])}`)
    .join(', ');

  return chosen ? `${ratingLead} 큐레이터가 강조한 항목은 ${chosen}입니다.` : ratingLead;
}

function makePayloadValues(selectedCriteria: CriterionKey[], values: Record<CriterionKey, Level>) {
  const selected = new Set(selectedCriteria);
  const weightedScore = (key: CriterionKey) => (selected.has(key) ? getScoreFromLevel(values[key]) : lowWeightScore);

  return {
    difficulty: selected.has('difficulty') ? getApiLevel('difficulty', values.difficulty) : 'medium',
    workload: selected.has('workload') ? getApiLevel('workload', values.workload) : 'medium',
    attendance: selected.has('attendance') ? getApiLevel('attendance', values.attendance) : 'medium',
    grading: selected.has('grading') ? getApiLevel('grading', values.grading) : 'medium',
    diffScore: weightedScore('difficulty'),
    teachingScore: weightedScore('teaching'),
    gradScore: weightedScore('grading'),
    workScore: weightedScore('workload'),
    prerequisiteScore: lowWeightScore,
    depthScore: selected.has('difficulty') ? getScoreFromLevel(values.difficulty) : lowWeightScore,
    timeInvestScore: selected.has('workload') ? getScoreFromLevel(values.workload) : lowWeightScore,
    attScore: weightedScore('attendance'),
    pastExamScore: weightedScore('exam'),
  };
}

export function ReviewWriteScreen({ navigation, route }: Props) {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const semester = useMemo(() => getCurrentSemesterLabel(), []);
  const [selectedCriteria, setSelectedCriteria] = useState<CriterionKey[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [values, setValues] = useState<Record<CriterionKey, Level>>({
    teaching: 'medium',
    difficulty: 'medium',
    workload: 'medium',
    attendance: 'medium',
    grading: 'medium',
    exam: 'medium',
  });
  const [content, setContent] = useState('');
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [duplicateReview, setDuplicateReview] = useState<Review | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const pulseDriver = useRef(new Animated.Value(0)).current;
  const stageOpacity = useRef(new Animated.Value(1)).current;
  const stageTranslateY = useRef(new Animated.Value(0)).current;

  const flow = useMemo<Stage[]>(
    () => ['rating', 'select', ...selectedCriteria, 'note', 'preview'],
    [selectedCriteria],
  );
  const stage = flow[Math.min(stepIndex, flow.length - 1)];
  const progress = `${Math.min(stepIndex + 1, flow.length)} / ${flow.length}`;
  const summary = buildCuratorSummary({ rating, selectedCriteria, values });

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseDriver, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseDriver, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [pulseDriver]);

  useEffect(() => {
    setStepIndex((current) => Math.min(current, flow.length - 1));
  }, [flow.length]);

  useEffect(() => {
    let isActive = true;

    const checkDuplicate = async () => {
      if (!isAuthenticated) {
        setDuplicateReview(null);
        setMyReviews([]);
        return;
      }

      setIsCheckingDuplicate(true);
      try {
        const reviews = await getMyReviews();
        if (!isActive) {
          return;
        }
        setMyReviews(reviews);
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

  const animateToStep = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(stageOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(stageTranslateY, {
        toValue: 18,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStepIndex(nextStep);
      stageTranslateY.setValue(-18);
      Animated.parallel([
        Animated.timing(stageOpacity, {
          toValue: 1,
          duration: 210,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(stageTranslateY, {
          toValue: 0,
          damping: 18,
          stiffness: 180,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const toggleCriterion = (key: CriterionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCriteria((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
    setErrorMessage('');
  };

  const updateCriterionValue = (key: CriterionKey, value: Level) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrorMessage('');
  };

  const validateStage = () => {
    if (stage === 'select' && selectedCriteria.length === 0) {
      return '큐레이팅할 평가 항목을 하나 이상 골라주세요.';
    }
    if (stage === 'rating' && rating === 0) {
      return '별점을 먼저 골라주세요.';
    }
    if (stage === 'note' && content.trim().length < 15) {
      return '최종 코멘트는 15자 이상 남겨주세요.';
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
    setErrorMessage('');
    animateToStep(Math.min(stepIndex + 1, flow.length - 1));
  };

  const goPrev = () => {
    setErrorMessage('');
    animateToStep(Math.max(stepIndex - 1, 0));
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
      const weighted = makePayloadValues(selectedCriteria, values);
      await createReview({
        courseId: route.courseId,
        semester,
        rating,
        difficulty: weighted.difficulty,
        workload: weighted.workload,
        attendance: weighted.attendance,
        grading: weighted.grading,
        content: content.trim(),
        isAnonymous: true,
        oneLineTip: summary,
        examInfo: selectedCriteria.includes('exam') ? getSelectedLabel('exam', values.exam) : undefined,
        examKeywords: selectedCriteria.map((key) => criterionMap[key].label),
        recommendFor: selectedCriteria.map((key) => `${criterionMap[key].shortLabel}: ${getSelectedLabel(key, values[key])}`),
        diffScore: weighted.diffScore,
        teachingScore: weighted.teachingScore,
        gradScore: weighted.gradScore,
        workScore: weighted.workScore,
        prerequisiteScore: weighted.prerequisiteScore,
        depthScore: weighted.depthScore,
        timeInvestScore: weighted.timeInvestScore,
        attScore: weighted.attScore,
        pastExamScore: weighted.pastExamScore,
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
      <FullScreenState
        title="이미 남긴 강의평이 있어요"
        body={`${duplicateReview.semester}에 작성한 리뷰가 있어서 중복 작성은 막아두었습니다. 기존 리뷰는 강의 상세에서 확인할 수 있어요.`}
        actionLabel="돌아가기"
        onAction={() => navigation.goBack()}
      />
    );
  }

  if (hasSubmitted) {
    return (
      <FullScreenState
        title="강의평 전시가 완성됐어요"
        body="선택한 항목은 더 크게 반영하고, 나머지는 기본값으로 정리해 저장했습니다."
        actionLabel="강의로 돌아가기"
        onAction={() => navigation.goBack()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.screen,
            stage === 'rating' ? styles.ratingScreen : null,
            stage === 'preview' ? styles.previewScreen : null,
            {
              paddingTop: stage === 'preview' ? insets.top + 4 : insets.top + spacing.related,
              paddingBottom: stage === 'preview' ? insets.bottom + 8 : insets.bottom + spacing.related,
            },
          ]}
        >
          {stage === 'rating' ? (
            <RatingBackdrop pulseDriver={pulseDriver} />
          ) : stage === 'preview' ? null : (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.ambientGlow,
                  {
                    opacity: pulseDriver.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.48] }),
                    transform: [
                      {
                        scale: pulseDriver.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                      },
                    ],
                  },
                ]}
              />
              <View pointerEvents="none" style={styles.galleryWash} />
            </>
          )}
          {stage !== 'preview' ? (
            <>
              <View style={styles.topBar}>
                <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
                  <Text style={[styles.closeButtonText, stage === 'rating' ? styles.closeButtonTextLight : null]}>×</Text>
                </Pressable>
                <View style={[styles.progressChip, stage === 'rating' ? styles.progressChipDark : null]}>
                  <Text style={[styles.progressText, stage === 'rating' ? styles.progressTextDark : null]}>{progress}</Text>
                </View>
              </View>

              <View style={styles.promptArea}>
                <Text style={[styles.eyebrow, stage === 'rating' ? styles.eyebrowDark : null]}>Review studio</Text>
                <Text style={[styles.title, stage === 'rating' ? styles.titleDark : null]}>{getStageTitle(stage)}</Text>
                {getStageSubtitle(stage, selectedCriteria) ? (
                  <Text style={[styles.subtitle, stage === 'rating' ? styles.subtitleDark : null]}>{getStageSubtitle(stage, selectedCriteria)}</Text>
                ) : null}
              </View>
            </>
          ) : null}

          <Animated.View
            style={[
              styles.stageArea,
              {
                opacity: stageOpacity,
                transform: [{ translateY: stageTranslateY }],
              },
            ]}
          >
            <View style={[styles.stageViewport, stage === 'preview' ? styles.previewStageViewport : null]}>
              {stage === 'select' ? (
                <SelectStage selectedCriteria={selectedCriteria} onToggle={toggleCriterion} />
              ) : null}

              {stage === 'rating' ? (
                <RatingStage rating={rating} onSelect={(nextRating) => {
                  setRating(nextRating);
                  setErrorMessage('');
                }} pulseDriver={pulseDriver} />
              ) : null}

              {isCriterionStage(stage) ? (
                <CriterionStage
                  criterion={stage}
                  value={values[stage]}
                  order={selectedCriteria.indexOf(stage) + 1}
                  total={selectedCriteria.length}
                  onChange={(nextValue) => updateCriterionValue(stage, nextValue)}
                />
              ) : null}

              {stage === 'note' ? (
                <NoteStage content={content} summary={summary} onChangeText={setContent} />
              ) : null}

              {stage === 'preview' ? (
                <PreviewStage
                  rating={rating}
                  selectedCriteria={selectedCriteria}
                  values={values}
                  content={content}
                  summary={summary}
                  semester={semester}
                />
              ) : null}
            </View>
          </Animated.View>

          <View style={[styles.footer, stage === 'preview' ? styles.previewFooter : null]}>
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : getStageHint(stage) ? (
              <Text style={[styles.hintText, stage === 'rating' ? styles.hintTextDark : null]}>{getStageHint(stage)}</Text>
            ) : stage === 'preview' ? null : (
              <View style={styles.hintGhost} />
            )}
            <View style={styles.footerActions}>
              {stepIndex > 0 ? (
                <Pressable
                  style={[styles.secondaryButton, stage === 'preview' ? styles.previewSecondaryButton : null]}
                  onPress={goPrev}
                >
                  <Text style={styles.secondaryButtonText}>이전</Text>
                </Pressable>
              ) : (
                <View style={styles.secondaryGhost} />
              )}
              <Pressable
                style={[
                  styles.primaryButton,
                  stage === 'preview' ? styles.previewPrimaryButton : null,
                  isSubmitting ? styles.primaryButtonDisabled : null,
                ]}
                onPress={stage === 'preview' ? handleSubmit : goNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {stage === 'preview' ? (isAuthenticated ? '강의평 작성완료' : '로그인하고 완료') : '계속'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SelectStage({
  selectedCriteria,
  onToggle,
}: {
  selectedCriteria: CriterionKey[];
  onToggle: (key: CriterionKey) => void;
}) {
  const pinDriver = useRef(new Animated.Value(0)).current;
  const [lastPinned, setLastPinned] = useState<CriterionKey | null>(null);

  const handleToggle = (key: CriterionKey) => {
    setLastPinned(key);
    pinDriver.setValue(0);
    onToggle(key);
    Animated.spring(pinDriver, {
      toValue: 1,
      damping: 14,
      stiffness: 128,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.focusDeck}>
      <View style={styles.focusDeckHeader}>
        <View>
          <Text style={styles.focusDeckKicker}>REPORT MATERIAL</Text>
          <Text style={styles.focusDeckTitle}>강의의 핵심 장면을 고르세요</Text>
        </View>
        <View style={styles.focusDeckCounter}>
          <Text style={styles.focusDeckCounterValue}>{selectedCriteria.length}</Text>
          <Text style={styles.focusDeckCounterLabel}>FOCUS</Text>
        </View>
      </View>
      <View style={styles.focusDeckRule} />
      {criterionCatalog.map((criterion) => {
        const active = selectedCriteria.includes(criterion.key);
        const justPinned = lastPinned === criterion.key;
        return (
          <Animated.View
            key={criterion.key}
            style={[
              {
                transform: [
                  {
                    scale:
                      active && justPinned
                        ? pinDriver.interpolate({
                            inputRange: [0, 0.42, 1],
                            outputRange: [0.86, 1.1, 1],
                          })
                        : 1,
                  },
                ],
              },
            ]}
          >
            <Pressable
              style={[styles.focusDeckRow, active ? styles.focusDeckRowActive : null]}
              onPress={() => handleToggle(criterion.key)}
            >
              <View style={[styles.focusDeckIndex, active ? styles.focusDeckIndexActive : null]}>
                <Text style={[styles.focusDeckIndexText, active ? styles.focusDeckIndexTextActive : null]}>
                  {active ? String(selectedCriteria.indexOf(criterion.key) + 1).padStart(2, '0') : '--'}
                </Text>
              </View>
              <View style={styles.focusDeckCopy}>
                <Text style={[styles.focusDeckRowTitle, active ? styles.focusDeckRowTitleActive : null]}>
                  {criterion.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.focusDeckRowBody, active ? styles.focusDeckRowBodyActive : null]}
                >
                  {criterion.description}
                </Text>
              </View>
              <Text style={[styles.focusDeckCheck, active ? styles.focusDeckCheckActive : null]}>
                {active ? 'SELECTED' : 'PICK'}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

function RatingStage({
  rating,
  onSelect,
  pulseDriver,
}: {
  rating: number;
  onSelect: (value: number) => void;
  pulseDriver: Animated.Value;
}) {
  const burstDriver = useRef(new Animated.Value(0)).current;
  const impactDriver = useRef(new Animated.Value(0)).current;
  const stampDriver = useRef(new Animated.Value(0)).current;
  const [constellationIndex, setConstellationIndex] = useState(0);
  const constellation = constellationPatterns[constellationIndex];

  const handleSelect = (value: number) => {
    burstDriver.setValue(0);
    impactDriver.setValue(0);
    stampDriver.setValue(0);
    setConstellationIndex((current) => {
      if (constellationPatterns.length <= 1) {
        return current;
      }
      const next = Math.floor(Math.random() * (constellationPatterns.length - 1));
      return next >= current ? next + 1 : next;
    });
    onSelect(value);
    Animated.parallel([
      Animated.spring(stampDriver, {
        toValue: 1,
        damping: 18,
        stiffness: 68,
        mass: 1.34,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(burstDriver, {
          toValue: 1,
          damping: 8,
          stiffness: 170,
          mass: 0.6,
          useNativeDriver: true,
        }),
        Animated.timing(burstDriver, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(impactDriver, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.ratingStage}>
      <View style={styles.starField}>
        {Array.from({ length: 14 }).map((_, index) => (
          <Animated.Text
            key={`spark-${index}`}
            style={[
              styles.spark,
              {
                left: `${8 + ((index * 23) % 84)}%`,
                top: `${10 + ((index * 17) % 76)}%`,
                opacity: pulseDriver.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.28, index % 2 === 0 ? 0.82 : 0.48],
                }),
                transform: [
                  {
                    scale: pulseDriver.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.72, index % 2 === 0 ? 1.28 : 1.08],
                    }),
                  },
                  {
                    translateY: pulseDriver.interpolate({
                      inputRange: [0, 1],
                      outputRange: [index % 2 === 0 ? -5 : 5, index % 2 === 0 ? 6 : -6],
                    }),
                  },
                  {
                    translateX: pulseDriver.interpolate({
                      inputRange: [0, 1],
                      outputRange: [index % 3 === 0 ? -4 : 3, index % 3 === 0 ? 5 : -3],
                    }),
                  },
                  {
                    rotate: pulseDriver.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', index % 2 === 0 ? '16deg' : '-12deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            ✦
          </Animated.Text>
        ))}
        {rating ? (
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.stampBackStar,
              {
                opacity: impactDriver.interpolate({
                  inputRange: [0, 0.28, 1],
                  outputRange: [0, 0.2, 0],
                }),
                transform: [
                  {
                    scale: impactDriver.interpolate({
                      inputRange: [0, 0.35, 1],
                      outputRange: [0.72, 1.18, 1.34],
                    }),
                  },
                  {
                    rotate: impactDriver.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-12deg', '8deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            ★
          </Animated.Text>
        ) : null}
        {rating ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ratingStampPlate,
              {
                opacity: stampDriver.interpolate({
                  inputRange: [0, 0.38, 1],
                  outputRange: [0, 0.48, 0.28],
                }),
                transform: [
                  {
                    scale: stampDriver.interpolate({
                      inputRange: [0, 0.42, 1],
                      outputRange: [1.42, 0.96, 1],
                    }),
                  },
                  {
                    rotate: stampDriver.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-18deg', '-8deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.ratingStampRule} />
            <Text style={styles.ratingStampScore}>{rating}.0</Text>
            <Text style={styles.ratingStampCopy}>INHA REVIEW</Text>
            <View style={styles.ratingStampRule} />
          </Animated.View>
        ) : null}
        {constellation.lines.map((line, index) =>
          index < rating - 1 ? (
            <Animated.View
              key={`constellation-line-${constellationIndex}-${index}`}
              style={[
                styles.constellationLineSegment,
                {
                  left: line.left,
                  top: line.top,
                  width: line.width,
                  opacity: burstDriver.interpolate({
                    inputRange: [0, 0.32, 1],
                    outputRange: [0.36, 0.82, 0.56],
                  }),
                  transform: [
                    { rotate: line.rotate },
                    {
                      scaleX: burstDriver.interpolate({
                        inputRange: [0, 0.4, 1],
                        outputRange: [0.86, 1.03, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : null,
        )}
        {constellation.nodes.map((node, index) => {
          const active = index < rating;
          return (
            <View
              key={`constellation-${constellationIndex}-${index}`}
              style={[
                styles.constellationNodeWrap,
                { left: node.left, top: node.top },
              ]}
            >
              <Animated.Text
                style={[
                  styles.constellationStar,
                  active ? styles.constellationStarActive : null,
                  {
                    opacity: active
                      ? 1
                      : 0.18,
                    transform: [
                      {
                        scale: active
                          ? burstDriver.interpolate({
                              inputRange: [0, 0.35, 1],
                              outputRange: [1, 1.34, 1],
                            })
                          : 1,
                      },
                    ],
                  },
                ]}
              >
                ★
              </Animated.Text>
            </View>
          );
        })}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.impactRing,
            {
              opacity: impactDriver.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0, 0.18, 0],
              }),
              transform: [
                {
                  scale: impactDriver.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.75, 1.55],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      <View style={styles.ratingButtons}>
        {[1, 2, 3, 4, 5].map((value) => {
          const active = value <= rating;
          return (
            <Pressable
              key={`rating-${value}`}
              style={[styles.ratingButton, active ? styles.ratingButtonActive : null]}
              onPress={() => handleSelect(value)}
            >
              <Text style={[styles.ratingButtonText, active ? styles.ratingButtonTextActive : null]}>
                {active ? '★' : '☆'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function RatingBackdrop({ pulseDriver }: { pulseDriver: Animated.Value }) {
  const driftDriver = useRef(new Animated.Value(0)).current;
  const twinkleDriver = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.timing(driftDriver, {
        toValue: 1,
        duration: 9200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const twinkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkleDriver, {
          toValue: 1,
          duration: 1650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(twinkleDriver, {
          toValue: 0,
          duration: 1650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    driftLoop.start();
    twinkleLoop.start();

    return () => {
      driftLoop.stop();
      twinkleLoop.stop();
    };
  }, [driftDriver, twinkleDriver]);

  return (
    <View pointerEvents="none" style={styles.ratingBackdrop}>
      <Animated.View
        style={[
          styles.ratingBackdropBeam,
          {
            opacity: pulseDriver.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.44] }),
            transform: [
              {
                translateX: driftDriver.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-34, 34],
                }),
              },
              {
                rotate: driftDriver.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-14deg', '-4deg'],
                }),
              },
            ],
          },
        ]}
      />
      {Array.from({ length: 38 }).map((_, index) => (
        <Animated.View
          key={`rating-particle-${index}`}
          style={[
            index % 6 === 0 ? styles.ratingSparkParticle : styles.ratingParticle,
            {
              left: `${2 + ((index * 29) % 96)}%`,
              top: `${4 + ((index * 17) % 90)}%`,
              opacity: twinkleDriver.interpolate({
                inputRange: [0, 1],
                outputRange: [index % 2 === 0 ? 0.18 : 0.52, index % 2 === 0 ? 0.78 : 0.26],
              }),
              transform: [
                {
                  translateY: driftDriver.interpolate({
                    inputRange: [0, 1],
                    outputRange: [index % 2 === 0 ? 54 : -48, index % 2 === 0 ? -54 : 48],
                  }),
                },
                {
                  translateX: driftDriver.interpolate({
                    inputRange: [0, 1],
                    outputRange: [index % 3 === 0 ? -26 : 18, index % 3 === 0 ? 28 : -20],
                  }),
                },
                {
                  scale: twinkleDriver.interpolate({
                    inputRange: [0, 1],
                    outputRange: [index % 2 === 0 ? 0.56 : 1.1, index % 2 === 0 ? 1.42 : 0.76],
                  }),
                },
                {
                  rotate: driftDriver.interpolate({
                    inputRange: [0, 1],
                    outputRange: [index % 2 === 0 ? '0deg' : '18deg', index % 2 === 0 ? '180deg' : '-160deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

function CriterionStage({
  criterion,
  value,
  order,
  total,
  onChange,
}: {
  criterion: CriterionKey;
  value: Level;
  order: number;
  total: number;
  onChange: (value: Level) => void;
}) {
  const meta = criterionMap[criterion];
  const artifact = criterionArtifacts[criterion];
  const options = getMetricOptions(criterion);
  const motionDriver = useRef(new Animated.Value(0.78)).current;

  const handleChange = (nextValue: Level) => {
    motionDriver.setValue(0);
    onChange(nextValue);
    Animated.spring(motionDriver, {
      toValue: 1,
      damping: 13,
      stiffness: 126,
      mass: 0.92,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.focusAnswerStage}>
      <View style={styles.focusAnswerSheet}>
        <View style={styles.focusAnswerTop}>
          <Text style={styles.focusAnswerKicker}>
            FOCUS {String(Math.max(order, 1)).padStart(2, '0')} / {String(Math.max(total, 1)).padStart(2, '0')}
          </Text>
          <Text style={styles.focusAnswerMode}>{artifact.objectLabel}</Text>
        </View>
        <Text style={styles.focusAnswerTitle}>{meta.label}</Text>
        <Text style={styles.focusAnswerBody}>{meta.description}</Text>
        <Animated.View
          style={[
            styles.focusAnswerArtifact,
            {
              opacity: motionDriver.interpolate({
                inputRange: [0, 0.25, 1],
                outputRange: [0.42, 1, 0.92],
              }),
              transform: [
                {
                  scale: motionDriver.interpolate({
                    inputRange: [0, 0.38, 1],
                    outputRange: [0.82, 1.08, 1],
                  }),
                },
                {
                  translateY: motionDriver.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <CriterionArtifactVisual criterion={criterion} value={value} />
        </Animated.View>
        <View style={styles.focusAnswerStamp}>
          <Text style={styles.focusAnswerStampValue}>{getSelectedLabel(criterion, value)}</Text>
          <Text style={styles.focusAnswerStampLabel}>{artifact.actionLabel}</Text>
        </View>
      </View>

      <View style={styles.metricOptions}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={`${criterion}-${option.value}`}
              style={[styles.metricOption, active ? styles.metricOptionActive : null]}
              onPress={() => handleChange(option.value)}
            >
              <Text style={[styles.metricOptionLabel, active ? styles.metricOptionLabelActive : null]}>
                {option.label}
              </Text>
              <Text style={[styles.metricOptionCopy, active ? styles.metricOptionCopyActive : null]}>
                {option.copy}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CriterionArtifactVisual({ criterion, value }: { criterion: CriterionKey; value: Level }) {
  const activeCount = value === 'easy' ? 1 : value === 'medium' ? 2 : 3;

  if (criterion === 'teaching') {
    return (
      <View style={styles.artifactBars}>
        {[0, 1, 2].map((index) => (
          <View
            key={`teaching-bar-${index}`}
            style={[
              styles.artifactSoundBar,
              { height: 20 + index * 13 },
              index < activeCount ? styles.artifactSoundBarActive : null,
            ]}
          />
        ))}
      </View>
    );
  }

  if (criterion === 'difficulty') {
    return (
      <View style={styles.artifactGauge}>
        {[0, 1, 2].map((index) => (
          <View
            key={`difficulty-step-${index}`}
            style={[
              styles.artifactGaugeStep,
              { height: 16 + index * 15 },
              index < activeCount ? styles.artifactGaugeStepActive : null,
            ]}
          />
        ))}
      </View>
    );
  }

  if (criterion === 'workload') {
    return (
      <View style={styles.artifactTicket}>
        <View style={styles.artifactTicketStub} />
        {[0, 1, 2].map((index) => (
          <View
            key={`workload-punch-${index}`}
            style={[styles.artifactPunch, index < activeCount ? styles.artifactPunchActive : null]}
          />
        ))}
      </View>
    );
  }

  if (criterion === 'attendance') {
    return (
      <View style={styles.artifactChecklist}>
        {[0, 1, 2].map((index) => (
          <View
            key={`attendance-check-${index}`}
            style={[styles.artifactCheckRow, index < activeCount ? styles.artifactCheckRowActive : null]}
          >
            <View style={styles.artifactCheckBox} />
            <View style={styles.artifactCheckLine} />
          </View>
        ))}
      </View>
    );
  }

  if (criterion === 'grading') {
    return (
      <View style={styles.artifactRibbon}>
        {[0, 1, 2].map((index) => (
          <View
            key={`grading-ribbon-${index}`}
            style={[styles.artifactRibbonBand, index < activeCount ? styles.artifactRibbonBandActive : null]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.artifactFile}>
      <View style={styles.artifactFileTab} />
      {[0, 1, 2].map((index) => (
        <View
          key={`exam-file-${index}`}
          style={[
            styles.artifactFileLine,
            { width: `${76 - index * 13}%` },
            index < activeCount ? styles.artifactFileLineActive : null,
          ]}
        />
      ))}
    </View>
  );
}

function NoteStage({
  content,
  summary,
  onChangeText,
}: {
  content: string;
  summary: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.noteStage}>
      <View style={styles.summaryPanel}>
        <Text style={styles.summaryLabel}>큐레이터 초안</Text>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>
      <TextInput
        multiline
        value={content}
        onChangeText={onChangeText}
        placeholder="예: 설명은 깔끔하지만 과제 마감이 빠르게 돌아와서 일정 관리를 같이 해야 했어요."
        placeholderTextColor={theme.faint}
        style={styles.noteInput}
        textAlignVertical="top"
      />
      <View style={styles.inputMeta}>
        <Text style={styles.inputMetaText}>최소 15자</Text>
        <Text style={styles.inputMetaText}>{content.trim().length}자</Text>
      </View>
    </View>
  );
}

function PreviewStage({
  rating,
  selectedCriteria,
  values,
  content,
  summary,
  semester,
}: {
  rating: number;
  selectedCriteria: CriterionKey[];
  values: Record<CriterionKey, Level>;
  content: string;
  summary: string;
  semester: string;
}) {
  const finishDriver = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const finalConstellation = constellationPatterns[Math.max(0, rating - 1) % constellationPatterns.length];
  const receiptBars = Array.from({ length: 34 }, (_, index) => 18 + ((index * 17 + rating * 9) % 58));

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(finishDriver, {
        toValue: 1,
        damping: 14,
        stiffness: 96,
        mass: 1.18,
        useNativeDriver: true,
      }),
    ]).start();
  }, [finishDriver]);

  return (
    <View style={styles.receiptStage}>
      <Animated.View
        style={[
          styles.receiptRoller,
          {
            transform: [
              {
                scaleX: scrollY.interpolate({
                  inputRange: [0, 120],
                  outputRange: [1, 0.965],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.receiptRollerHighlight} />
        <View style={styles.receiptRollerTop} />
        <View style={styles.receiptRollerLeftCap} />
        <View style={styles.receiptRollerRightCap} />
      </Animated.View>
      <Animated.View
        style={[
          styles.receiptPaper,
          {
            opacity: finishDriver.interpolate({
              inputRange: [0, 1],
              outputRange: [0.72, 1],
            }),
            transform: [
              {
                translateY: finishDriver.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-118, 0],
                }),
              },
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 120],
                  outputRange: [0, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <Animated.ScrollView
          style={styles.receiptScroll}
          contentContainerStyle={styles.receiptScrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
        >
          <Animated.View
            style={[
              styles.receiptHeader,
              {
                opacity: finishDriver,
                transform: [
                  {
                    translateY: finishDriver.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.receiptOverline}>INHA REVIEW REPORT</Text>
            <Text style={styles.receiptTitle}>강의평 리포트</Text>
            <View style={styles.receiptMetaRow}>
              <Text style={styles.receiptMetaText}>{semester}</Text>
              <Text style={styles.receiptMetaText}>{selectedCriteria.length} FOCUS</Text>
            </View>
          </Animated.View>

          <View style={styles.receiptDash} />

          <Animated.View
            style={[
              styles.receiptConstellationBlock,
              {
                opacity: finishDriver.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [0, 0.72, 1],
                }),
                transform: [
                  {
                    scale: finishDriver.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {finalConstellation.lines.map((line, index) =>
              index < rating - 1 ? (
                <View
                  key={`receipt-line-${index}`}
                  style={[
                    styles.receiptConstellationLine,
                    { left: line.left, top: line.top, width: line.width, transform: [{ rotate: line.rotate }] },
                  ]}
                />
              ) : null,
            )}
            {finalConstellation.nodes.map((node, index) => (
              <Text
                key={`receipt-star-${index}`}
                style={[
                  styles.receiptConstellationStar,
                  { left: node.left, top: node.top, opacity: index < rating ? 0.88 : 0.14 },
                ]}
              >
                ★
              </Text>
            ))}
            <View style={styles.receiptStamp}>
              <Text style={styles.receiptStampScore}>{rating}.0</Text>
              <Text style={styles.receiptStampCopy}>CURATED</Text>
            </View>
          </Animated.View>

          <View style={styles.receiptDash} />

          <View style={styles.receiptTotalRow}>
            <Text style={styles.receiptTotalLabel}>TOTAL</Text>
            <Text style={styles.receiptTotalValue}>{rating}.0 STAR</Text>
          </View>
          <View style={styles.receiptInfoList}>
            <View style={styles.receiptInfoRow}>
              <Text style={styles.receiptInfoLabel}>FOCUS COUNT</Text>
              <Text style={styles.receiptInfoValue}>{selectedCriteria.length}</Text>
            </View>
            <View style={styles.receiptInfoRow}>
              <Text style={styles.receiptInfoLabel}>WEIGHT MODE</Text>
              <Text style={styles.receiptInfoValue}>SELECTED HIGH</Text>
            </View>
            <View style={styles.receiptInfoRow}>
              <Text style={styles.receiptInfoLabel}>STATUS</Text>
              <Text style={styles.receiptInfoValue}>READY</Text>
            </View>
          </View>

          <View style={styles.receiptDash} />

          <Text style={styles.receiptSectionTitle}>FOCUS DETAIL</Text>
          {selectedCriteria.map((criterion) => (
            <View key={`receipt-row-${criterion}`} style={styles.receiptFocusRow}>
              <Text style={styles.receiptFocusLabel}>{criterionMap[criterion].label}</Text>
              <Text style={styles.receiptFocusValue}>{getSelectedLabel(criterion, values[criterion])}</Text>
            </View>
          ))}

          <View style={styles.receiptDash} />

          <Text style={styles.receiptSectionTitle}>CURATOR SUMMARY</Text>
          <Text style={styles.receiptParagraph}>{summary}</Text>
          <Text style={styles.receiptParagraph}>{content.trim()}</Text>

          <View style={styles.receiptDash} />

          <Text style={styles.receiptSectionTitle}>REVIEW SIGNAL</Text>
          <View style={styles.receiptBars}>
            {receiptBars.map((height, index) => (
              <View key={`receipt-bar-wrap-${index}`} style={[styles.receiptBarWrap, { height }]}>
                <Animated.View
                  style={[
                    styles.receiptBar,
                    {
                      transform: [
                        {
                          scaleY: finishDriver.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.08, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.receiptAxis}>
            <Text style={styles.receiptAxisText}>START</Text>
            <Text style={styles.receiptAxisText}>ARCHIVE</Text>
          </View>

          <View style={styles.receiptFinishPanel}>
            <Text style={styles.receiptFinishTitle}>작성 완료 준비</Text>
            <Text style={styles.receiptFinishText}>
              아래 버튼을 누르면 이 리포트가 강의 상세에 저장됩니다.
            </Text>
          </View>
        </Animated.ScrollView>
        <View pointerEvents="none" style={styles.receiptPaperTexture}>
          {Array.from({ length: 9 }).map((_, index) => (
            <View
              key={`paper-fiber-${index}`}
              style={[
                styles.receiptPaperFiber,
                {
                  top: 38 + index * 58,
                  left: index % 2 === 0 ? 18 : 48,
                  right: index % 2 === 0 ? 42 : 22,
                  opacity: index % 3 === 0 ? 0.18 : 0.11,
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
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
        <View style={styles.fullStateOrb}>
          {loading ? <ActivityIndicator color={theme.gold} /> : <Text style={styles.fullStateOrbText}>완</Text>}
        </View>
        <Text style={styles.fullStateTitle}>{title}</Text>
        <Text style={styles.fullStateBody}>{body}</Text>
        {actionLabel && onAction ? (
          <Pressable style={styles.fullStateButton} onPress={onAction}>
            <Text style={styles.fullStateButtonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function getStageTitle(stage: Stage) {
  if (stage === 'select') {
    return '무엇을 자세히 남길까요?';
  }
  if (stage === 'rating') {
    return '별점부터 고르세요';
  }
  if (stage === 'note') {
    return '한 줄을 남겨주세요';
  }
  if (stage === 'preview') {
    return '마지막 확인';
  }
  return criterionMap[stage].question;
}

function getStageSubtitle(stage: Stage, selectedCriteria: CriterionKey[]) {
  if (stage === 'select') {
    return '';
  }
  if (stage === 'rating') {
    return '';
  }
  if (stage === 'note') {
    return '';
  }
  if (stage === 'preview') {
    return `${selectedCriteria.length}개 항목`;
  }
  return '';
}

function getStageHint(stage: Stage) {
  if (stage === 'select') {
    return '';
  }
  if (stage === 'rating') {
    return '';
  }
  if (stage === 'preview') {
    return '';
  }
  return '';
}

function isCriterionStage(stage: Stage): stage is CriterionKey {
  return criterionCatalog.some((criterion) => criterion.key === stage);
}

const selectionMarkerStyles: Record<CriterionKey, object> = {
  teaching: { left: 10, top: 20, transform: [{ rotate: '-8deg' }] },
  difficulty: { right: 12, top: 28, transform: [{ rotate: '7deg' }] },
  workload: { left: 0, top: 154, transform: [{ rotate: '5deg' }] },
  attendance: { right: 0, top: 158, transform: [{ rotate: '-5deg' }] },
  grading: { left: 38, bottom: 14, transform: [{ rotate: '-4deg' }] },
  exam: { right: 40, bottom: 16, transform: [{ rotate: '5deg' }] },
};

const selectionPinPositions: Record<CriterionKey, {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  transform: Array<{ rotate: string }>;
}> = {
  teaching: { left: 22, top: 58, transform: [{ rotate: '-7deg' }] },
  difficulty: { right: 22, top: 62, transform: [{ rotate: '6deg' }] },
  workload: { left: 26, top: 135, transform: [{ rotate: '4deg' }] },
  attendance: { right: 24, top: 138, transform: [{ rotate: '-5deg' }] },
  grading: { left: 54, bottom: 30, transform: [{ rotate: '-3deg' }] },
  exam: { right: 48, bottom: 28, transform: [{ rotate: '4deg' }] },
};

const metricArtifactContainerStyles: Record<CriterionKey, object> = {
  teaching: { borderColor: 'rgba(22,73,154,0.46)', backgroundColor: 'rgba(22,73,154,0.06)' },
  difficulty: { borderColor: 'rgba(216,79,65,0.46)', backgroundColor: 'rgba(216,79,65,0.06)' },
  workload: { borderColor: 'rgba(215,173,77,0.56)', backgroundColor: 'rgba(215,173,77,0.10)' },
  attendance: { borderColor: 'rgba(34,109,104,0.48)', backgroundColor: 'rgba(34,109,104,0.07)' },
  grading: { borderColor: 'rgba(32,52,95,0.50)', backgroundColor: 'rgba(32,52,95,0.06)' },
  exam: { borderColor: 'rgba(123,92,53,0.46)', backgroundColor: 'rgba(123,92,53,0.07)' },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  keyboardWrap: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: spacing.page,
    gap: 10,
    overflow: 'hidden',
  },
  previewScreen: {
    paddingHorizontal: 0,
    gap: 0,
  },
  ratingScreen: {
    backgroundColor: '#f7f9fd',
  },
  ratingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f7f9fd',
  },
  ratingBackdropBeam: {
    position: 'absolute',
    width: 140,
    height: 980,
    left: '45%',
    top: -160,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  ratingParticle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(215,173,77,0.86)',
  },
  ratingSparkParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: 'rgba(215,173,77,0.72)',
    transform: [{ rotate: '45deg' }],
  },
  galleryWash: {
    position: 'absolute',
    left: -70,
    right: -70,
    top: 110,
    height: 380,
    backgroundColor: 'rgba(255,255,255,0.52)',
    transform: [{ rotate: '-10deg' }],
  },
  ambientGlow: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 999,
    top: 172,
    left: 24,
    backgroundColor: 'rgba(22,73,154,0.10)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  closeButtonText: {
    color: theme.text,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '300',
  },
  closeButtonTextLight: {
    color: theme.text,
  },
  progressChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  progressChipDark: {
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderColor: 'rgba(255,255,255,0.78)',
  },
  progressText: {
    color: theme.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  progressTextDark: {
    color: theme.blue,
  },
  promptArea: {
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.tight,
  },
  eyebrow: {
    color: theme.blue,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  eyebrowDark: {
    color: theme.blue,
  },
  title: {
    color: theme.text,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -1.2,
    textAlign: 'left',
  },
  titleDark: {
    color: theme.text,
  },
  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'left',
  },
  subtitleDark: {
    color: theme.muted,
  },
  stageArea: {
    flex: 1,
  },
  stageViewport: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.tight,
  },
  previewStageViewport: {
    justifyContent: 'flex-start',
    paddingVertical: 0,
  },
  selectionGallery: {
    height: 382,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusDeck: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(32,52,95,0.12)',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 12,
    gap: 7,
    shadowColor: '#20345f',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  focusDeckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  focusDeckKicker: {
    color: theme.gold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  focusDeckTitle: {
    marginTop: 4,
    color: theme.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  focusDeckCounter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,52,95,0.94)',
  },
  focusDeckCounterValue: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  focusDeckCounterLabel: {
    color: 'rgba(215,173,77,0.92)',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  focusDeckRule: {
    height: 1,
    backgroundColor: 'rgba(32,52,95,0.10)',
    marginBottom: 2,
  },
  focusDeckRow: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(32,52,95,0.09)',
    backgroundColor: 'rgba(247,249,253,0.74)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  focusDeckRowActive: {
    backgroundColor: 'rgba(32,52,95,0.94)',
    borderColor: 'rgba(215,173,77,0.56)',
    shadowColor: '#20345f',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  focusDeckIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32,52,95,0.07)',
  },
  focusDeckIndexActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  focusDeckIndexText: {
    color: 'rgba(32,52,95,0.40)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  focusDeckIndexTextActive: {
    color: theme.gold,
  },
  focusDeckCopy: {
    flex: 1,
    gap: 2,
  },
  focusDeckRowTitle: {
    color: theme.text,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  focusDeckRowTitleActive: {
    color: '#ffffff',
  },
  focusDeckRowBody: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  focusDeckRowBodyActive: {
    color: 'rgba(255,255,255,0.64)',
  },
  focusDeckCheck: {
    color: 'rgba(32,52,95,0.36)',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  focusDeckCheckActive: {
    color: theme.gold,
  },
  selectionOrbit: {
    position: 'absolute',
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: 1,
    borderColor: 'rgba(32,52,95,0.08)',
    transform: [{ rotate: '-9deg' }],
  },
  selectionFocus: {
    width: 154,
    height: 154,
    borderRadius: 77,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(32,52,95,0.10)',
    shadowColor: '#20345f',
    shadowOpacity: 0.07,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 15 },
  },
  selectionFocusCount: {
    color: theme.gold,
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '900',
    letterSpacing: -2,
  },
  selectionFocusLabel: {
    color: 'rgba(32,52,95,0.44)',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  selectionTagCloud: {
    position: 'absolute',
    left: -20,
    right: -20,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  selectionTagText: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(22,73,154,0.08)',
    color: '#20345f',
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  selectionBoard: {
    width: 260,
    height: 310,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(32,52,95,0.12)',
    paddingHorizontal: 20,
    paddingTop: 20,
    shadowColor: '#20345f',
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    transform: [{ rotate: '-2deg' }],
  },
  selectionBoardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionBoardKicker: {
    color: 'rgba(32,52,95,0.48)',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  selectionBoardCount: {
    color: theme.gold,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  selectionBoardDivider: {
    height: 1,
    marginTop: 14,
    backgroundColor: 'rgba(32,52,95,0.12)',
  },
  selectionEmptyText: {
    position: 'absolute',
    left: 42,
    right: 42,
    top: 136,
    color: 'rgba(32,52,95,0.28)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  selectionPin: {
    position: 'absolute',
    minWidth: 86,
    height: 45,
    borderRadius: 14,
    backgroundColor: 'rgba(247,249,253,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(32,52,95,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  selectionPinActive: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(32,52,95,0.28)',
    shadowColor: '#20345f',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  selectionPinDot: {
    position: 'absolute',
    top: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(32,52,95,0.18)',
  },
  selectionPinDotActive: {
    backgroundColor: theme.gold,
  },
  selectionPinText: {
    color: 'rgba(32,52,95,0.42)',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  selectionPinTextActive: {
    color: '#20345f',
  },
  passportPage: {
    width: 252,
    height: 306,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(32,52,95,0.12)',
    paddingHorizontal: 20,
    paddingTop: 20,
    shadowColor: '#20345f',
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    transform: [{ rotate: '-2deg' }],
  },
  passportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passportKicker: {
    color: 'rgba(32,52,95,0.48)',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  passportCount: {
    color: theme.gold,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  passportDivider: {
    height: 1,
    marginTop: 14,
    backgroundColor: 'rgba(32,52,95,0.12)',
  },
  passportEmptyText: {
    position: 'absolute',
    left: 42,
    right: 42,
    top: 136,
    color: 'rgba(32,52,95,0.28)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  passportStamp: {
    position: 'absolute',
    width: 82,
    height: 52,
    borderRadius: 18,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: 'rgba(32,52,95,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportStampActive: {
    borderColor: '#20345f',
    backgroundColor: 'rgba(215,173,77,0.10)',
  },
  passportStampText: {
    color: 'rgba(32,52,95,0.38)',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  passportStampTextActive: {
    color: '#20345f',
  },
  galleryTrackLine: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderColor: 'rgba(18,24,38,0.08)',
    transform: [{ rotate: '-8deg' }],
  },
  curatorCenterpiece: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 7,
    borderColor: '#f0f4fb',
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },
  curatorCenterCount: {
    color: '#d7ad4d',
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: -2,
  },
  curatorCenterText: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    fontWeight: '900',
  },
  criterionMarker: {
    position: 'absolute',
    minWidth: 88,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: 'rgba(32,52,95,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    gap: 2,
  },
  criterionMarkerActive: {
    backgroundColor: 'rgba(32,52,95,0.94)',
    borderColor: 'rgba(215,173,77,0.64)',
    shadowColor: '#20345f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 3,
  },
  criterionMarkerText: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  criterionMarkerTextActive: {
    color: '#ffffff',
  },
  criterionMarkerWeight: {
    color: '#9aa2af',
    fontSize: 9.5,
    fontWeight: '900',
  },
  criterionMarkerWeightActive: {
    color: '#d7ad4d',
  },
  ratingStage: {
    gap: 18,
  },
  starField: {
    minHeight: 346,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spark: {
    position: 'absolute',
    color: 'rgba(215,196,119,0.82)',
    fontSize: 13,
    fontWeight: '900',
  },
  ratingStampPlate: {
    position: 'absolute',
    width: 236,
    height: 150,
    borderRadius: 34,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#20345f',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    zIndex: 1,
  },
  ratingStampRule: {
    width: 116,
    height: 1,
    backgroundColor: '#20345f',
  },
  ratingStampScore: {
    color: '#111827',
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '900',
    letterSpacing: -2,
  },
  ratingStampCopy: {
    color: '#20345f',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  stampBackStar: {
    position: 'absolute',
    color: '#d7ad4d',
    fontSize: 210,
    lineHeight: 226,
    fontWeight: '900',
    textShadowColor: 'rgba(215,173,77,0.16)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 28,
    zIndex: 0,
  },
  constellationNodeWrap: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  constellationLineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(215,173,77,0.58)',
    transformOrigin: 'left center',
    zIndex: 4,
  },
  constellationStar: {
    color: 'rgba(22,73,154,0.14)',
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
  },
  constellationStarActive: {
    color: '#d7ad4d',
    textShadowColor: 'rgba(215,173,77,0.34)',
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 12,
  },
  burstLayer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 1,
    height: 1,
    zIndex: 6,
  },
  burstStar: {
    position: 'absolute',
    color: theme.gold,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
  },
  impactStar: {
    position: 'absolute',
    color: 'rgba(246,216,120,0.48)',
    fontSize: 176,
    lineHeight: 188,
    fontWeight: '900',
    textShadowColor: 'rgba(215,173,77,0.26)',
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 30,
    zIndex: 3,
  },
  impactRing: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1.4,
    borderColor: 'rgba(215,173,77,0.30)',
    zIndex: 2,
  },
  impactRingSoft: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(22,73,154,0.18)',
  },
  ratingCaption: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.62)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    color: '#d7ad4d',
    fontSize: 14,
    fontWeight: '900',
    zIndex: 6,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 8,
  },
  ratingButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ratingButtonActive: {
    backgroundColor: '#183374',
    borderColor: '#183374',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  ratingButtonText: {
    color: theme.blue,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '900',
  },
  ratingButtonTextActive: {
    color: '#ffffff',
  },
  interactionStage: {
    gap: 18,
    justifyContent: 'center',
  },
  focusAnswerStage: {
    gap: 16,
    justifyContent: 'center',
  },
  focusAnswerSheet: {
    minHeight: 330,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(32,52,95,0.12)',
    paddingHorizontal: 22,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#20345f',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  focusAnswerTop: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  focusAnswerKicker: {
    color: theme.gold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  focusAnswerMode: {
    color: 'rgba(32,52,95,0.42)',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  focusAnswerTitle: {
    color: theme.text,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  focusAnswerBody: {
    marginTop: 8,
    color: theme.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  focusAnswerArtifact: {
    minWidth: 210,
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  focusAnswerStamp: {
    minWidth: 160,
    borderRadius: 22,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: 'rgba(32,52,95,0.40)',
    backgroundColor: 'rgba(215,173,77,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    transform: [{ rotate: '-2deg' }],
  },
  focusAnswerStampValue: {
    color: theme.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  focusAnswerStampLabel: {
    marginTop: 3,
    color: 'rgba(32,52,95,0.50)',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  interactionCanvas: {
    minHeight: 292,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interactionObjectLabel: {
    position: 'absolute',
    top: 18,
    color: theme.blue,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  interactionObject: {
    minWidth: 220,
    minHeight: 146,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interactionValue: {
    marginTop: 12,
    color: theme.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1.8,
  },
  interactionAction: {
    marginTop: 5,
    color: 'rgba(32,52,95,0.44)',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  metricStage: {
    gap: 20,
    justifyContent: 'center',
  },
  metricPoster: {
    minHeight: 292,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricPaper: {
    width: 278,
    height: 270,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(32,52,95,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#20345f',
    shadowOpacity: 0.08,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
  },
  metricArtifactObject: {
    width: 218,
    height: 146,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  metricArtifactKicker: {
    color: '#20345f',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  metricArtifactValue: {
    color: '#111827',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  metricArtifactAction: {
    position: 'absolute',
    bottom: 46,
    color: 'rgba(32,52,95,0.46)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  artifactBars: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  artifactSoundBar: {
    width: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(32,52,95,0.12)',
  },
  artifactSoundBarActive: {
    backgroundColor: '#16499a',
  },
  artifactGauge: {
    height: 56,
    width: 96,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 9,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(216,79,65,0.22)',
  },
  artifactGaugeStep: {
    width: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(216,79,65,0.13)',
  },
  artifactGaugeStepActive: {
    backgroundColor: '#d84f41',
  },
  artifactTicket: {
    width: 112,
    height: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(123,92,53,0.28)',
    backgroundColor: 'rgba(255,255,255,0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'hidden',
  },
  artifactTicketStub: {
    position: 'absolute',
    left: 30,
    top: 0,
    bottom: 0,
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(123,92,53,0.18)',
  },
  artifactPunch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(215,173,77,0.18)',
  },
  artifactPunchActive: {
    backgroundColor: '#d7ad4d',
  },
  artifactChecklist: {
    width: 112,
    gap: 7,
  },
  artifactCheckRow: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    opacity: 0.42,
  },
  artifactCheckRowActive: {
    opacity: 1,
  },
  artifactCheckBox: {
    width: 13,
    height: 13,
    borderRadius: 4,
    backgroundColor: '#226d68',
  },
  artifactCheckLine: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(34,109,104,0.36)',
  },
  artifactRibbon: {
    width: 106,
    height: 58,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 8,
  },
  artifactRibbonBand: {
    width: 22,
    borderRadius: 12,
    backgroundColor: 'rgba(32,52,95,0.14)',
  },
  artifactRibbonBandActive: {
    backgroundColor: '#20345f',
  },
  artifactFile: {
    width: 112,
    height: 66,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(123,92,53,0.24)',
    paddingTop: 18,
    paddingHorizontal: 14,
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.54)',
  },
  artifactFileTab: {
    position: 'absolute',
    left: 14,
    top: 8,
    width: 36,
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(123,92,53,0.22)',
  },
  artifactFileLine: {
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(123,92,53,0.16)',
  },
  artifactFileLineActive: {
    backgroundColor: '#7b5c35',
  },
  metricStampSeal: {
    width: 218,
    height: 146,
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#20345f',
    backgroundColor: 'rgba(215,173,77,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metricStampSealSoft: {
    opacity: 0.52,
  },
  metricStampSealStrong: {
    backgroundColor: 'rgba(215,173,77,0.18)',
    borderWidth: 2.6,
  },
  metricStampKicker: {
    color: '#20345f',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  metricStampValue: {
    color: '#111827',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
    letterSpacing: -1.8,
  },
  metricStampCopy: {
    color: '#20345f',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  metricPaperLine: {
    position: 'absolute',
    left: 34,
    right: 34,
    bottom: 34,
    height: 1,
    backgroundColor: 'rgba(32,52,95,0.12)',
  },
  metricOptions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 2,
  },
  metricOption: {
    flex: 1,
    minHeight: 74,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: 'rgba(32,52,95,0.16)',
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  metricOptionActive: {
    backgroundColor: '#20345f',
    borderColor: 'rgba(215,173,77,0.62)',
    shadowColor: '#20345f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  metricOptionLabel: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  metricOptionLabelActive: {
    color: '#d7ad4d',
  },
  metricOptionCopy: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricOptionCopyActive: {
    color: 'rgba(255,255,255,0.72)',
  },
  noteStage: {
    gap: spacing.related,
  },
  summaryPanel: {
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    padding: spacing.group,
    gap: spacing.tight,
  },
  summaryLabel: {
    color: theme.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  summaryText: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
  },
  noteInput: {
    minHeight: 148,
    borderRadius: 24,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: spacing.group,
    paddingVertical: 16,
    color: theme.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },
  inputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputMetaText: {
    color: theme.faint,
    fontSize: 12,
    fontWeight: '800',
  },
  previewStage: {
    gap: spacing.related,
  },
  receiptStage: {
    flex: 1,
    paddingTop: 0,
    alignItems: 'center',
  },
  receiptRoller: {
    position: 'absolute',
    top: 23,
    width: 344,
    height: 24,
    borderRadius: 14,
    backgroundColor: 'transparent',
    zIndex: 5,
    shadowColor: '#111827',
    shadowOpacity: 0.09,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 5 },
  },
  receiptRollerHighlight: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: 4,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    zIndex: 6,
  },
  receiptRollerTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(24,24,29,0.72)',
    zIndex: 4,
  },
  receiptRollerLeftCap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 32,
    height: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(24,24,29,0.72)',
    zIndex: 5,
  },
  receiptRollerRightCap: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(24,24,29,0.72)',
    zIndex: 5,
  },
  receiptRollerShadow: {
    position: 'absolute',
    left: 42,
    right: 42,
    bottom: -14,
    height: 18,
    backgroundColor: 'rgba(17,24,39,0.055)',
    shadowColor: '#111827',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  receiptPaper: {
    position: 'absolute',
    top: 31,
    width: 330,
    height: 568,
    backgroundColor: '#fff',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    zIndex: 8,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    overflow: 'hidden',
  },
  receiptScroll: {
    flex: 1,
  },
  receiptScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 110,
    paddingBottom: 28,
    gap: 15,
  },
  receiptPaperTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(215,173,77,0.008)',
  },
  receiptPaperFiber: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(123,92,53,0.18)',
  },
  receiptHeader: {
    gap: 7,
  },
  receiptOverline: {
    color: 'rgba(18,24,38,0.50)',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
    letterSpacing: 1.7,
  },
  receiptTitle: {
    color: theme.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  receiptMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptMetaText: {
    color: 'rgba(18,24,38,0.50)',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  receiptDash: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(18,24,38,0.18)',
  },
  receiptConstellationBlock: {
    height: 156,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptConstellationLine: {
    position: 'absolute',
    height: 1.5,
    borderRadius: 999,
    backgroundColor: 'rgba(215,173,77,0.45)',
    transformOrigin: 'left center',
  },
  receiptConstellationStar: {
    position: 'absolute',
    color: theme.gold,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  receiptStamp: {
    width: 122,
    height: 78,
    borderRadius: 20,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: 'rgba(32,52,95,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
    backgroundColor: 'rgba(255,255,255,0.36)',
  },
  receiptStampScore: {
    color: theme.text,
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '700',
    letterSpacing: -1.1,
  },
  receiptStampCopy: {
    color: '#20345f',
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  receiptTotalLabel: {
    color: theme.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  receiptTotalValue: {
    color: theme.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  receiptInfoList: {
    gap: 7,
  },
  receiptInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  receiptInfoLabel: {
    color: theme.text,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  receiptInfoValue: {
    color: 'rgba(18,24,38,0.56)',
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  receiptSectionTitle: {
    color: theme.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  receiptFocusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  receiptFocusLabel: {
    flex: 1,
    color: 'rgba(18,24,38,0.66)',
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '500',
  },
  receiptFocusValue: {
    color: theme.text,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '700',
  },
  receiptParagraph: {
    color: 'rgba(18,24,38,0.68)',
    fontSize: 10.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  receiptBars: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    paddingTop: 10,
  },
  receiptBarWrap: {
    flex: 1,
    minWidth: 2,
    justifyContent: 'flex-end',
  },
  receiptBar: {
    flex: 1,
    backgroundColor: '#1f2430',
    borderRadius: 2,
    opacity: 0.78,
  },
  receiptAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptAxisText: {
    color: 'rgba(18,24,38,0.42)',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
  },
  receiptFinishPanel: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 5,
  },
  receiptFinishTitle: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  receiptFinishText: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  completionCard: {
    minHeight: 386,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: spacing.group,
    justifyContent: 'flex-end',
    gap: 13,
    overflow: 'hidden',
    shadowColor: '#20345f',
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
  },
  completionConstellation: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  completionConstellationLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(215,173,77,0.26)',
    transformOrigin: 'left center',
  },
  completionConstellationStar: {
    position: 'absolute',
    color: theme.gold,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  completionStamp: {
    position: 'absolute',
    left: 42,
    top: 54,
    width: 232,
    height: 146,
    borderRadius: 34,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#20345f',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.46)',
  },
  completionStampScore: {
    color: '#111827',
    fontSize: 50,
    lineHeight: 54,
    fontWeight: '900',
    letterSpacing: -2.4,
  },
  completionStampCopy: {
    color: '#20345f',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  previewBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(22,73,154,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(22,73,154,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewBadgeText: {
    color: '#20345f',
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '900',
  },
  archiveStrip: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: theme.line,
    padding: spacing.related,
    gap: 6,
  },
  archiveStripTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
  },
  archiveStripText: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  previewPoster: {
    borderRadius: 28,
    backgroundColor: '#183374',
    padding: spacing.group,
    gap: spacing.related,
  },
  previewLabel: {
    color: theme.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  previewRating: {
    color: theme.gold,
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: -3,
  },
  previewSummary: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  previewContent: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  weightList: {
    borderRadius: 22,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    padding: spacing.related,
    gap: 8,
  },
  weightListTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.related,
  },
  weightRowLabel: {
    flex: 1,
    color: theme.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  weightRowValue: {
    color: theme.blue,
    fontSize: 11,
    fontWeight: '900',
  },
  weightHigh: {
    color: theme.blue,
  },
  weightLow: {
    color: theme.faint,
  },
  semesterText: {
    marginTop: 4,
    color: theme.faint,
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    gap: spacing.related,
  },
  previewFooter: {
    paddingHorizontal: spacing.page,
    paddingTop: 4,
  },
  hintText: {
    minHeight: 18,
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  hintTextDark: {
    color: 'rgba(247,240,227,0.62)',
  },
  hintGhost: {
    minHeight: 18,
  },
  errorText: {
    minHeight: 18,
    color: '#ff766d',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.related,
  },
  secondaryButton: {
    flex: 0.8,
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  previewSecondaryButton: {
    minHeight: 48,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  secondaryGhost: {
    flex: 0.8,
  },
  secondaryButtonText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1.3,
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: 'rgba(24,51,116,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  previewPrimaryButton: {
    minHeight: 48,
    backgroundColor: '#182f70',
  },
  primaryButtonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  fullState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.page,
    gap: spacing.group,
  },
  fullStateOrb: {
    width: 92,
    height: 92,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullStateOrbText: {
    color: theme.gold,
    fontSize: 28,
    fontWeight: '900',
  },
  fullStateTitle: {
    color: theme.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  fullStateBody: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  fullStateButton: {
    minWidth: 220,
    borderRadius: 999,
    backgroundColor: theme.gold,
    paddingHorizontal: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  fullStateButtonText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
  },
});
