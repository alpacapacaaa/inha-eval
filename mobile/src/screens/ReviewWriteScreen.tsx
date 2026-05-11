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
import { spacing } from '../theme/spacing';
import { Review } from '../types/models';

interface Props {
  navigation: AppNavigation;
  route: {
    name: 'ReviewWrite';
    courseId: number;
  };
}

type CategoryKey = 'classMethod' | 'workload' | 'exam' | 'attendance' | 'atmosphere' | 'target';
type StageKey = 'select' | CategoryKey | 'mood' | 'recommend' | 'note' | 'preview';

const theme = {
  bg: '#f6f9fe',
  text: '#101827',
  muted: '#6f7d94',
  faint: '#a5afbf',
  blue: '#2f6edb',
  blueSoft: '#edf4ff',
  line: '#e4ebf6',
  navy: '#101827',
  red: '#d84f41',
  green: '#2f946f',
  orange: '#e6a640',
  pink: '#db6195',
  purple: '#9068db',
} as const;

const categories: Array<{
  key: CategoryKey;
  title: string;
  description: string;
  accent: string;
  iconTone: string;
}> = [
  {
    key: 'classMethod',
    title: '수업 방식',
    description: '설명력, 실습, 자료 등',
    accent: theme.blue,
    iconTone: '#8bb6ff',
  },
  {
    key: 'workload',
    title: '과제 & 공부량',
    description: '과제량, 공부시간 등',
    accent: theme.orange,
    iconTone: '#f2c16d',
  },
  {
    key: 'exam',
    title: '시험',
    description: '난이도, 족보 영향 등',
    accent: theme.green,
    iconTone: '#8ad0b5',
  },
  {
    key: 'attendance',
    title: '출결',
    description: '출석 체크, 자유도 등',
    accent: '#5e9bea',
    iconTone: '#9dc5ff',
  },
  {
    key: 'atmosphere',
    title: '분위기',
    description: '교수 스타일, 수업 분위기 등',
    accent: theme.purple,
    iconTone: '#b8a5ef',
  },
  {
    key: 'target',
    title: '추천 대상',
    description: '누구에게 맞는 강의인지',
    accent: theme.pink,
    iconTone: '#f0a8c7',
  },
];

const detailOptions: Record<CategoryKey, string[]> = {
  classMethod: ['설명력 좋음', '실습 위주', '수업 자료 좋음', '교수님 PPT', '피드백 많음', '이론 중심'],
  workload: ['적당함', '많음', '실무형', '단순 제출형', '팀플 비중 큼', '시간 오래 걸림'],
  exam: ['족보 많이 탐', '응용 많음', '암기 위주', '실습 위주', '예상 가능', '변수 많음'],
  attendance: ['출석 체크', '지각 감점', '자유도 높음', '대리출석 불가', '출결 엄격', '출결 널널'],
  atmosphere: ['설명 자세함', '피드백 많음', '엄격함', '자유로운 분위기', '열정적', '소통 잘함'],
  target: ['비전공자 추천', '성실형 학생 추천', '벼락치기 가능', '학점 챙기기형', '실무형', '발표 선호형'],
};

const moodOptions = ['성장', '편안함', '빡셈', '실무적', '든든함', '자유로움', '몰입감', '체계적', '감성적', '압박감'];

const recommendOptions = [
  '비전공자',
  '성실형',
  '벼락치기형',
  '학점 챙기기형',
  '실무형',
  '발표 선호형',
  '공강 중요형',
  '과제 적은 강의 선호형',
];

export function ReviewWriteScreen({ navigation, route }: Props) {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);
  const [choices, setChoices] = useState<Record<CategoryKey, string[]>>({
    classMethod: [],
    workload: [],
    exam: [],
    attendance: [],
    atmosphere: [],
    target: [],
  });
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [recommendFor, setRecommendFor] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [duplicateReview, setDuplicateReview] = useState<Review | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const semester = useMemo(() => getCurrentSemesterLabel(), []);
  const flow = useMemo<StageKey[]>(
    () => ['select', ...selectedCategories, 'mood', 'recommend', 'note', 'preview'],
    [selectedCategories],
  );
  const stage = flow[Math.min(stepIndex, flow.length - 1)];
  const semanticStep = getSemanticStep(stage);
  const report = useMemo(
    () => buildReport({
      selectedCategories,
      choices,
      selectedMoods,
      recommendFor,
      content,
    }),
    [choices, content, recommendFor, selectedCategories, selectedMoods],
  );

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
      return {
        ...prev,
        [key]: current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
      };
    });
    setErrorMessage('');
  };

  const toggleMood = (option: string) => {
    setSelectedMoods((prev) => (prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]));
    setErrorMessage('');
  };

  const toggleRecommend = (option: string) => {
    setRecommendFor((prev) => (prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]));
    setErrorMessage('');
  };

  const validateStage = () => {
    if (stage === 'select' && selectedCategories.length === 0) {
      return '평가할 영역을 하나 이상 선택해주세요.';
    }
    if (isCategoryStage(stage) && choices[stage].length === 0) {
      return '해당하는 항목을 하나 이상 선택해주세요.';
    }
    if (stage === 'mood' && selectedMoods.length === 0) {
      return '강의를 표현할 단어를 하나 이상 선택해주세요.';
    }
    if (stage === 'recommend' && recommendFor.length === 0) {
      return '추천 대상을 하나 이상 선택해주세요.';
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
    setErrorMessage('');
    transitionTo(Math.min(stepIndex + 1, flow.length - 1));
  };

  const goPrev = () => {
    setErrorMessage('');
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
      const payload = buildPayloadValues(selectedCategories, choices, selectedMoods);
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
        examInfo: choices.exam.join(', ') || undefined,
        examKeywords: report.keywords,
        recommendFor,
        diffScore: payload.diffScore,
        teachingScore: payload.teachingScore,
        gradScore: payload.gradScore,
        workScore: payload.workScore,
        prerequisiteScore: null,
        depthScore: payload.depthScore,
        timeInvestScore: payload.timeInvestScore,
        attScore: payload.attScore,
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
      <FullScreenState
        title="이미 남긴 강의평이 있어요"
        body={`${duplicateReview.semester}에 작성한 리뷰가 있어서 중복 작성은 막아두었습니다.`}
        actionLabel="돌아가기"
        onAction={() => navigation.goBack()}
      />
    );
  }

  if (hasSubmitted) {
    return (
      <FullScreenState
        title="강의 리포트가 완성됐어요"
        body="선택한 경험이 카드뉴스 리포트로 저장되었습니다."
        actionLabel="강의로 돌아가기"
        onAction={() => navigation.goBack()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <View style={styles.titleGroup}>
              <Text style={styles.pageTitle}>강의평 작성</Text>
              <Text style={styles.pageSubtitle}>나의 경험이 카드뉴스 리포트가 돼요.</Text>
            </View>
            <WorkflowStepper stage={stage} />
          </View>

          <Animated.View style={[styles.stageCard, { opacity: fadeAnim }]}>
            <View style={styles.cardTopBar}>
              <PressableScale style={styles.cardIconButton} onPress={stepIndex === 0 ? () => navigation.goBack() : goPrev}>
                <Text style={styles.cardBackText}>‹</Text>
              </PressableScale>
              <PressableScale style={styles.cardIconButton} onPress={() => navigation.goBack()}>
                <Text style={styles.cardCloseText}>×</Text>
              </PressableScale>
            </View>

            <View style={styles.promptBlock}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>STEP {semanticStep} / 6</Text>
              </View>
              <Text style={styles.stageTitle}>{getStageTitle(stage)}</Text>
              <Text style={styles.stageSubtitle}>{getStageSubtitle(stage)}</Text>
            </View>

            <View style={styles.stageBody}>
              {stage === 'select' ? (
                <SelectStage selectedCategories={selectedCategories} onToggle={toggleCategory} />
              ) : null}
              {isCategoryStage(stage) ? (
                <DetailStage category={stage} selected={choices[stage]} onToggle={(option) => toggleChoice(stage, option)} />
              ) : null}
              {stage === 'mood' ? (
                <TileStage options={moodOptions} selected={selectedMoods} onToggle={toggleMood} columns={3} />
              ) : null}
              {stage === 'recommend' ? (
                <OptionStage options={recommendOptions} selected={recommendFor} onToggle={toggleRecommend} accent={theme.pink} />
              ) : null}
              {stage === 'note' ? (
                <NoteStage content={content} onChangeText={setContent} />
              ) : null}
              {stage === 'preview' ? (
                <PreviewStage report={report} selectedCategories={selectedCategories} choices={choices} content={content} />
              ) : null}
            </View>

            <ProgressBars current={semanticStep - 1} total={6} />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.footerActions}>
              <Button
                label="이전"
                variant="secondary"
                style={styles.secondaryButton}
                onPress={goPrev}
                disabled={stepIndex === 0}
              />
              <Button
                label={stage === 'preview' ? '작성 완료하기' : stage === 'select' ? `선택 완료 (${selectedCategories.length}개)` : '다음'}
                style={styles.primaryButton}
                onPress={stage === 'preview' ? handleSubmit : goNext}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
            </View>
          </Animated.View>

          <View style={styles.infoNotice}>
            <Text style={styles.infoIcon}>i</Text>
            <Text style={styles.infoText}>작성한 후기는 익명으로 등록되며, 다른 학생들에게 큰 도움이 됩니다.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WorkflowStepper({ stage }: { stage: StageKey }) {
  const active = stage === 'preview' ? 1 : 0;
  const items = [
    { label: '작성하기', icon: '1' },
    { label: '미리보기', icon: '2' },
    { label: '완료', icon: '3' },
  ];

  return (
    <View style={styles.workflow}>
      {items.map((item, index) => (
        <View key={item.label} style={styles.workflowItem}>
          {index > 0 ? <View style={[styles.workflowLine, index <= active ? styles.workflowLineActive : null]} /> : null}
          <View style={[styles.workflowCircle, index <= active ? styles.workflowCircleActive : null]}>
            <Text style={[styles.workflowIcon, index <= active ? styles.workflowIconActive : null]}>{item.icon}</Text>
          </View>
          <Text style={[styles.workflowLabel, index <= active ? styles.workflowLabelActive : null]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function SelectStage({
  selectedCategories,
  onToggle,
}: {
  selectedCategories: CategoryKey[];
  onToggle: (key: CategoryKey) => void;
}) {
  return (
    <View style={styles.categoryGrid}>
      {categories.map((category) => {
        const active = selectedCategories.includes(category.key);
        return (
          <PressableScale
            key={category.key}
            style={[
              styles.categoryCard,
              active ? { borderColor: category.accent, backgroundColor: `${category.accent}0c` } : null,
            ]}
            onPress={() => onToggle(category.key)}
          >
            <View style={[styles.checkCircle, active ? { backgroundColor: category.accent, borderColor: category.accent } : null]}>
              {active ? <Text style={styles.checkText}>✓</Text> : null}
            </View>
            <MiniCategoryIcon tone={category.iconTone} />
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryDesc}>{category.description}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function DetailStage({
  category,
  selected,
  onToggle,
}: {
  category: CategoryKey;
  selected: string[];
  onToggle: (option: string) => void;
}) {
  const categoryInfo = categories.find((item) => item.key === category);
  const accent = categoryInfo?.accent ?? theme.blue;

  return (
    <OptionStage
      options={detailOptions[category]}
      selected={selected}
      onToggle={onToggle}
      accent={accent}
    />
  );
}

function OptionStage({
  options,
  selected,
  onToggle,
  accent,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  accent: string;
}) {
  return (
    <View style={styles.optionGrid}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <PressableScale
            key={option}
            style={[
              styles.optionPill,
              active ? { borderColor: accent, backgroundColor: `${accent}10` } : null,
            ]}
            onPress={() => onToggle(option)}
          >
            <View style={[styles.optionCheck, active ? { backgroundColor: accent, borderColor: accent } : null]}>
              {active ? <Text style={styles.optionCheckText}>✓</Text> : null}
            </View>
            <Text style={[styles.optionText, active ? { color: theme.text } : null]}>{option}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function TileStage({
  options,
  selected,
  onToggle,
  columns,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  columns: number;
}) {
  return (
    <View style={styles.tileGrid}>
      {options.map((option, index) => {
        const active = selected.includes(option);
        return (
          <PressableScale
            key={option}
            style={[
              styles.moodTile,
              { width: columns === 3 ? '30.8%' : '47%' },
              active ? styles.moodTileActive : null,
            ]}
            onPress={() => onToggle(option)}
          >
            <Text style={styles.moodIcon}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={[styles.moodText, active ? styles.moodTextActive : null]}>{option}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function NoteStage({
  content,
  onChangeText,
}: {
  content: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.noteWrap}>
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
  choices,
  content,
}: {
  report: ReturnType<typeof buildReport>;
  selectedCategories: CategoryKey[];
  choices: Record<CategoryKey, string[]>;
  content: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRail}>
      <ReportCard index="01" title="전체 분위기" accent={theme.blue}>
        <Text style={styles.reportBigText}>{report.moodTitle}</Text>
        <Text style={styles.reportBodyText}>{report.moodCopy}</Text>
        <View style={styles.mountainArt}>
          <View style={styles.mountainBase} />
          <View style={styles.mountainPeak} />
        </View>
      </ReportCard>

      <ReportCard index="02" title="시험 & 과제 리포트" accent={theme.orange}>
        {report.examWorkload.slice(0, 4).map((item) => (
          <View key={item} style={styles.reportLineItem}>
            <View style={styles.reportDot} />
            <Text style={styles.reportLineText}>{item}</Text>
          </View>
        ))}
      </ReportCard>

      <ReportCard index="03" title="추천 대상" accent={theme.green}>
        {report.targets.slice(0, 3).map((item) => (
          <View key={item} style={styles.reportCheckRow}>
            <Text style={styles.reportCheck}>✓</Text>
            <Text style={styles.reportLineText}>{item}</Text>
          </View>
        ))}
      </ReportCard>

      <ReportCard index="04" title="핵심 키워드" accent={theme.purple}>
        <View style={styles.previewKeywordGrid}>
          {report.keywords.slice(0, 5).map((keyword) => (
            <Text key={keyword} style={styles.previewKeyword}>#{keyword}</Text>
          ))}
        </View>
      </ReportCard>

      <ReportCard index="05" title="대표 한줄평" accent={theme.pink}>
        <Text style={styles.previewQuote}>“{content.trim()}”</Text>
      </ReportCard>

      {selectedCategories.length === 0 && Object.values(choices).flat().length === 0 ? null : <View style={styles.previewRailEnd} />}
    </ScrollView>
  );
}

function ReportCard({
  index,
  title,
  accent,
  children,
}: {
  index: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.reportCard, { borderColor: `${accent}25`, backgroundColor: `${accent}08` }]}>
      <Text style={[styles.reportIndex, { color: accent }]}>{index}</Text>
      <Text style={[styles.reportTitle, { color: accent }]}>{title}</Text>
      <View style={styles.reportContent}>{children}</View>
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

function MiniCategoryIcon({ tone }: { tone: string }) {
  return (
    <View style={[styles.miniIcon, { backgroundColor: `${tone}24` }]}>
      <View style={[styles.miniIconMain, { backgroundColor: tone }]} />
      <View style={[styles.miniIconSmall, { backgroundColor: tone }]} />
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

function getCurrentSemesterLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const term = month >= 1 && month <= 6 ? 1 : 2;
  return `${year}-${term}학기`;
}

function isCategoryStage(stage: StageKey): stage is CategoryKey {
  return categories.some((category) => category.key === stage);
}

function getSemanticStep(stage: StageKey) {
  if (stage === 'select') {
    return 1;
  }
  if (isCategoryStage(stage)) {
    return 2;
  }
  if (stage === 'mood') {
    return 3;
  }
  if (stage === 'recommend') {
    return 4;
  }
  if (stage === 'note') {
    return 5;
  }
  return 6;
}

function getStageTitle(stage: StageKey) {
  if (stage === 'select') {
    return '어떤 부분을 평가하고 싶으신가요?';
  }
  if (stage === 'mood') {
    return '이 강의를 한 단어로 표현하면?';
  }
  if (stage === 'recommend') {
    return '이 강의는 어떤 학생에게 잘 맞을까요?';
  }
  if (stage === 'note') {
    return '후배에게 한줄로 말해준다면?';
  }
  if (stage === 'preview') {
    return '이런 리포트가 만들어져요';
  }
  return getCategoryQuestion(stage);
}

function getStageSubtitle(stage: StageKey) {
  if (stage === 'select') {
    return '기억나는 항목을 선택해주세요. 복수 선택 가능';
  }
  if (stage === 'mood') {
    return '강의의 분위기나 인상을 선택해주세요.';
  }
  if (stage === 'recommend') {
    return '해당되는 항목을 모두 선택해주세요.';
  }
  if (stage === 'note') {
    return '이 강의를 한 문장으로 요약해주세요.';
  }
  if (stage === 'preview') {
    return '다른 학생들에게 큰 도움이 될 거예요.';
  }
  return '해당되는 항목을 모두 선택해주세요.';
}

function getCategoryQuestion(stage: CategoryKey) {
  switch (stage) {
    case 'classMethod':
      return '수업 방식은 어떤 느낌이었나요?';
    case 'workload':
      return '과제는 어떤 느낌이었나요?';
    case 'exam':
      return '시험은 어떤 느낌이었나요?';
    case 'attendance':
      return '출결은 어떤 느낌이었나요?';
    case 'atmosphere':
      return '교수님 스타일은 어땠나요?';
    case 'target':
      return '누구에게 추천하고 싶나요?';
    default:
      return '';
  }
}

function buildReport({
  selectedCategories,
  choices,
  selectedMoods,
  recommendFor,
  content,
}: {
  selectedCategories: CategoryKey[];
  choices: Record<CategoryKey, string[]>;
  selectedMoods: string[];
  recommendFor: string[];
  content: string;
}) {
  const flattened = Object.values(choices).flat();
  const moodTitle = selectedMoods.includes('성장') || selectedMoods.includes('실무적') ? '성장형 강의' : selectedMoods.includes('편안함') || selectedMoods.includes('자유로움') ? '편안형 강의' : selectedMoods.includes('빡셈') || selectedMoods.includes('압박감') ? '도전형 강의' : '균형형 강의';
  const moodCopy = selectedMoods.length > 0 ? `${selectedMoods.slice(0, 2).join(', ')} 분위기가 강하게 남는 강의예요.` : '선택한 항목을 바탕으로 강의 분위기를 정리합니다.';
  const examWorkload = [...choices.exam, ...choices.workload].length > 0 ? [...choices.exam, ...choices.workload] : ['아직 시험/과제 데이터가 없어요'];
  const targets = [...recommendFor, ...choices.target].length > 0 ? [...new Set([...recommendFor, ...choices.target])] : ['성실형 학생 추천'];
  const keywords = [...new Set([...flattened, ...selectedMoods, ...selectedCategories.map((key) => categories.find((item) => item.key === key)?.title ?? '')])]
    .filter(Boolean)
    .slice(0, 8);
  const negativeSignals = flattened.filter((item) => item.includes('많') || item.includes('엄격') || item.includes('압박') || item.includes('변수')).length;
  const rating = Math.max(3, Math.min(5, selectedMoods.includes('성장') || selectedMoods.includes('든든함') ? 5 : 5 - Math.min(negativeSignals, 2)));

  return {
    moodTitle,
    moodCopy,
    examWorkload,
    targets,
    keywords,
    rating,
    summary: content.trim(),
  };
}

function buildPayloadValues(selectedCategories: CategoryKey[], choices: Record<CategoryKey, string[]>, selectedMoods: string[]) {
  const selected = new Set(selectedCategories);
  const has = (key: CategoryKey, word: string) => choices[key].some((item) => item.includes(word));
  const level = (easy: boolean, hard: boolean) => hard ? 'hard' : easy ? 'easy' : 'medium';
  const score = (key: CategoryKey, easy: boolean, hard: boolean) => {
    if (!selected.has(key)) {
      return null;
    }
    if (hard) {
      return 5;
    }
    if (easy) {
      return 4;
    }
    return 3;
  };

  const difficultyHard = has('exam', '응용') || has('exam', '변수') || selectedMoods.includes('압박감');
  const difficultyEasy = has('exam', '예상');
  const workloadHard = has('workload', '많') || has('workload', '시간') || has('workload', '팀플');
  const workloadEasy = has('workload', '적당') || has('workload', '단순');
  const attendanceHard = has('attendance', '엄격') || has('attendance', '지각') || has('attendance', '체크');
  const attendanceEasy = has('attendance', '널널') || has('attendance', '자유도');
  const gradingEasy = selectedMoods.includes('편안함') || choices.target.some((item) => item.includes('학점'));
  const teachingGood = choices.classMethod.some((item) => item.includes('설명') || item.includes('자료') || item.includes('피드백')) || choices.atmosphere.some((item) => item.includes('설명') || item.includes('소통'));

  return {
    difficulty: level(difficultyEasy, difficultyHard),
    workload: level(workloadEasy, workloadHard),
    attendance: level(attendanceEasy, attendanceHard),
    grading: gradingEasy ? 'easy' : 'medium',
    diffScore: score('exam', difficultyEasy, difficultyHard),
    teachingScore: selected.has('classMethod') || selected.has('atmosphere') ? (teachingGood ? 5 : 3) : null,
    gradScore: selected.has('target') ? (gradingEasy ? 5 : 3) : null,
    workScore: score('workload', workloadEasy, workloadHard),
    depthScore: score('exam', difficultyEasy, difficultyHard),
    timeInvestScore: score('workload', workloadEasy, workloadHard),
    attScore: score('attendance', attendanceEasy, attendanceHard),
    pastExamScore: selected.has('exam') ? (has('exam', '족보') ? 5 : 3) : null,
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
  screen: {
    paddingHorizontal: spacing.page,
    gap: 20,
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
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1.4,
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
    backgroundColor: '#d9e1ef',
  },
  workflowLineActive: {
    backgroundColor: theme.blue,
  },
  workflowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dde4f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowCircleActive: {
    backgroundColor: theme.blue,
  },
  workflowIcon: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  workflowIconActive: {
    color: '#ffffff',
  },
  workflowLabel: {
    color: '#9aa6b8',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  workflowLabelActive: {
    color: theme.blue,
  },
  stageCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8eef8',
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 17,
    shadowColor: '#16499a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
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
    gap: 9,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#eaf2ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stepBadgeText: {
    color: theme.blue,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  stageTitle: {
    color: theme.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  stageSubtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  stageBody: {
    minHeight: 286,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48%',
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#dce6f4',
    backgroundColor: '#fbfdff',
    padding: 11,
    gap: 7,
  },
  checkCircle: {
    position: 'absolute',
    top: 9,
    left: 9,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.4,
    borderColor: '#d6dfec',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  checkText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
  },
  miniIcon: {
    alignSelf: 'center',
    marginTop: 12,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniIconMain: {
    width: 17,
    height: 20,
    borderRadius: 4,
  },
  miniIconSmall: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryTitle: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  categoryDesc: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionPill: {
    width: '47.8%',
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: '#f8fafd',
    borderWidth: 1.4,
    borderColor: '#eef2f8',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  optionCheck: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    borderWidth: 1.4,
    borderColor: '#d4deeb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckText: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  optionText: {
    flex: 1,
    color: '#637084',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodTile: {
    minHeight: 74,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: '#eef2f8',
    backgroundColor: '#fbfdff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  moodTileActive: {
    borderColor: theme.orange,
    backgroundColor: '#fff8e9',
  },
  moodIcon: {
    color: theme.blue,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  moodText: {
    color: theme.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  moodTextActive: {
    color: '#ad7418',
  },
  noteWrap: {
    gap: 8,
  },
  noteInput: {
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: '#dce6f4',
    backgroundColor: '#fbfdff',
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: theme.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
  },
  countText: {
    alignSelf: 'flex-end',
    color: theme.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  previewRail: {
    gap: 12,
    paddingRight: 10,
  },
  reportCard: {
    width: 136,
    minHeight: 210,
    borderRadius: 15,
    borderWidth: 1.2,
    padding: 13,
    gap: 6,
  },
  reportIndex: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  reportTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  reportContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  reportBigText: {
    color: theme.blue,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  reportBodyText: {
    color: theme.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  reportLineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  reportDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: theme.orange,
  },
  reportLineText: {
    flex: 1,
    color: theme.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  reportCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  reportCheck: {
    color: theme.green,
    fontSize: 13,
    fontWeight: '900',
  },
  previewKeywordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  previewKeyword: {
    borderRadius: 999,
    backgroundColor: 'rgba(144,104,219,0.12)',
    color: theme.purple,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  previewQuote: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewRailEnd: {
    width: 1,
  },
  mountainArt: {
    height: 48,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  mountainBase: {
    position: 'absolute',
    bottom: 0,
    width: 72,
    height: 22,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    backgroundColor: '#dfeeff',
  },
  mountainPeak: {
    width: 0,
    height: 0,
    borderLeftWidth: 28,
    borderRightWidth: 28,
    borderBottomWidth: 42,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#a8c7ff',
  },
  progressBars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  progressBar: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#dde5f1',
  },
  progressBarActive: {
    backgroundColor: theme.blue,
  },
  errorText: {
    color: theme.red,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    backgroundColor: '#ffffff',
    borderColor: '#dce6f4',
  },
  primaryButton: {
    flex: 1.45,
    minHeight: 50,
    backgroundColor: theme.blue,
    borderColor: theme.blue,
  },
  infoNotice: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: '#e7edf7',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
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
    fontWeight: '900',
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
});
