import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatePanel } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { getAllCourses } from '../lib/api/courses';
import {
  PERIODS,
  TIMETABLE_BY_COURSE_ID,
  TIMETABLE_DAYS,
  TimetableDay,
  TimetableSlot,
} from '../lib/timetableData';
import {
  loadSelectedTimetableIds,
  loadTimetableCartIds,
  saveSelectedTimetableIds,
  saveTimetableCartIds,
} from '../lib/storage/timetableStorage';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

type TimetableCourse = Course & { slots: TimetableSlot[] };

type ComboTone = 'blue' | 'green' | 'lilac' | 'amber' | 'rose';

type TimetableCombo = {
  id: string;
  title: string;
  tags: string[];
  description: string;
  confidence: number;
  courseIds: string[];
  tone: ComboTone;
};

type AvoidancePreferences = {
  avoidMorning: boolean;
  avoidEvening: boolean;
  freeDay: TimetableDay | null;
};

const PERIOD_HEIGHT = 27;
const DEFAULT_VISIBLE_PERIOD = 19;
const BLOCK_COLORS = ['#E0EEFF', '#e2f4ea', '#efe4ff', '#fff0cf', '#EBF3FF', '#dff5f3'];
const BLOCK_TEXT_COLORS = ['#23A9FF', '#226d68', '#7655b8', '#8a5a28', '#23A9FF', '#1a6c68'];
const MAX_COMBO_CREDITS = 21;
const MORNING_LATEST_END_PERIOD = 6;
const RELAXED_EARLIEST_START_PERIOD = 5;
const AFTERNOON_EARLIEST_START_PERIOD = 7;
const EVENING_FREE_LATEST_END_PERIOD = 18;

export function TimetableScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeComboId, setActiveComboId] = useState('balanced');
  const [avoidancePreferences, setAvoidancePreferences] = useState<AvoidancePreferences>({
    avoidMorning: false,
    avoidEvening: false,
    freeDay: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);

      try {
        const [courses, storedCartIds, storedSelectedIds] = await Promise.all([
          getAllCourses(),
          loadTimetableCartIds(),
          loadSelectedTimetableIds(),
        ]);

        if (!isActive) return;

        setAllCourses(courses);
        setCartIds(storedCartIds);
        setSelectedIds(storedSelectedIds.filter((id) => storedCartIds.includes(id)));
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();
    return () => { isActive = false; };
  }, []);

  const timetableCourses = useMemo<TimetableCourse[]>(
    () =>
      allCourses.map((course) => ({
        ...course,
        slots: course.slots?.length ? course.slots : TIMETABLE_BY_COURSE_ID[String(course.id)] ?? [],
      })),
    [allCourses],
  );

  const cartCourses = useMemo(
    () =>
      timetableCourses
        .filter((c) => cartIds.includes(String(c.id)) && c.slots.length > 0)
        .sort((a, b) => b.rating - a.rating),
    [cartIds, timetableCourses],
  );

  const combos = useMemo(
    () => buildCombos(cartCourses, user?.department, avoidancePreferences),
    [avoidancePreferences, cartCourses, user?.department],
  );
  const activeCombo = combos.find((c) => c.id === activeComboId) ?? combos[0];
  useEffect(() => {
    if (activeCombo && !combos.some((c) => c.id === activeComboId)) {
      setActiveComboId(activeCombo.id);
    }
  }, [activeCombo, activeComboId, combos]);

  const placedCourses = useMemo(
    () => cartCourses.filter((c) => selectedIds.includes(String(c.id))),
    [cartCourses, selectedIds],
  );

  const placedEntries = useMemo(
    () =>
      placedCourses.flatMap((course, index) =>
        course.slots.map((slot) => ({
          ...slot,
          backgroundColor: BLOCK_COLORS[index % BLOCK_COLORS.length],
          textColor: BLOCK_TEXT_COLORS[index % BLOCK_TEXT_COLORS.length],
          courseId: String(course.id),
          courseName: course.name,
          professor: course.professor,
        })),
      ),
    [placedCourses],
  );

  const applyCombo = async (combo: TimetableCombo) => {
    if (combo.courseIds.length === 0) {
      setMessage('선택한 조건에 맞는 강의가 부족해 이 조합은 아직 만들 수 없어요.');
      return;
    }

    const nextIds = combo.courseIds.filter((id) => cartIds.includes(id));
    setActiveComboId(combo.id);
    setSelectedIds(nextIds);
    await saveSelectedTimetableIds(nextIds);
    setMessage(`${combo.title} 조합을 시간표에 반영했어요.`);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const saveCombo = async () => {
    if (!activeCombo) return;
    if (activeCombo.courseIds.length === 0) {
      setMessage('먼저 조건에 맞는 담은 강의를 더 추가해주세요.');
      return;
    }

    const existingNames = new Set(
      timetableCourses
        .filter((course) => cartIds.includes(String(course.id)))
        .map((course) => normalizeCourseName(course.name)),
    );
    const additions: string[] = [];
    let skippedDuplicateCount = 0;

    for (const courseId of activeCombo.courseIds) {
      const course = timetableCourses.find((item) => String(item.id) === courseId);
      if (!course) continue;

      const courseNameKey = normalizeCourseName(course.name);
      if (existingNames.has(courseNameKey)) {
        skippedDuplicateCount += 1;
        continue;
      }

      existingNames.add(courseNameKey);
      additions.push(courseId);
    }

    const nextCartIds = Array.from(new Set([...cartIds, ...additions]));
    setCartIds(nextCartIds);
    await saveTimetableCartIds(nextCartIds);
    setMessage(
      skippedDuplicateCount > 0
        ? `이 조합을 담았어요. 같은 강의 ${skippedDuplicateCount}개는 제외했어요.`
        : '이 조합을 보관함에 담았어요.',
    );
  };

  // 전체 시간표에서 돌아올 때 선택 상태 동기화
  const cartIdsRef = useRef(cartIds);
  cartIdsRef.current = cartIds;
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    if (navigation.currentRoute.name !== 'Timetable') return;
    loadSelectedTimetableIds().then((sIds) => setSelectedIds(sIds.filter((id) => cartIdsRef.current.includes(id))));
  }, [navigation.currentRoute.name]);

  const handleBlockPress = async (courseId: string, courseName: string) => {
    const nextIds = selectedIds.filter((id) => id !== courseId);
    setSelectedIds(nextIds);
    await saveSelectedTimetableIds(nextIds);
    setMessage(`${courseName} 제거됨`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.loadingState}>
          <StatePanel label="시간표 조합을 고르는 중입니다." loading />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.group }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => navigation.onTabScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <Text style={styles.title}>이번 학기 시간표</Text>
        </View>

        <View style={styles.boardHeader}>
          <View style={styles.boardTitleWrap}>
            <View style={styles.boardTitleDot} />
            <Text style={styles.boardTitle}>현재 내 시간표</Text>
          </View>
          <PressableScale style={styles.fullButton} onPress={() => navigation.navigate({ name: 'TimetableFull' })}>
            <Text style={styles.fullButtonText}>전체 보기</Text>
            <View style={styles.fullButtonArrow} />
          </PressableScale>
        </View>

        <TimetableBoard entries={placedEntries} onBlockPress={handleBlockPress} />

        <View style={styles.comboSectionHeader}>
          <Text style={styles.comboSectionTitle}>추천 조합</Text>
          <Text style={styles.comboSectionSub}>
            밸런스형은 시간과 학점을 고르게, 고평점 강의 위주는 만족도 높은 강의를 먼저 묶어요.
          </Text>
        </View>

        <View style={styles.preferencePanel}>
          <Text style={styles.preferenceTitle}>피하고 싶은 시간대</Text>
          <View style={styles.preferenceChipRow}>
            <PressableScale
              style={[styles.preferenceChip, avoidancePreferences.avoidMorning ? styles.preferenceChipActive : null]}
              onPress={() => setAvoidancePreferences((prev) => ({ ...prev, avoidMorning: !prev.avoidMorning }))}
            >
              <Text style={[styles.preferenceChipText, avoidancePreferences.avoidMorning ? styles.preferenceChipTextActive : null]}>
                오전 수업 피하기
              </Text>
            </PressableScale>
            <PressableScale
              style={[styles.preferenceChip, avoidancePreferences.avoidEvening ? styles.preferenceChipActive : null]}
              onPress={() => setAvoidancePreferences((prev) => ({ ...prev, avoidEvening: !prev.avoidEvening }))}
            >
              <Text style={[styles.preferenceChipText, avoidancePreferences.avoidEvening ? styles.preferenceChipTextActive : null]}>
                저녁 수업 피하기
              </Text>
            </PressableScale>
          </View>
          <View style={styles.preferenceDays}>
            {TIMETABLE_DAYS.map((day) => {
              const active = avoidancePreferences.freeDay === day;
              return (
                <PressableScale
                  key={`avoid-day-${day}`}
                  style={[styles.dayPreferenceChip, active ? styles.dayPreferenceChipActive : null]}
                  onPress={() => setAvoidancePreferences((prev) => ({ ...prev, freeDay: active ? null : day }))}
                >
                  <Text style={[styles.dayPreferenceText, active ? styles.dayPreferenceTextActive : null]}>
                    {day} 비우기
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.comboRail}
          decelerationRate="fast"
        >
          {combos.map((combo, index) => (
            <ComboCard
              key={combo.id}
              combo={combo}
              index={index}
              active={combo.id === activeCombo?.id}
              credits={getComboCredits(combo, cartCourses)}
              onPress={() => applyCombo(combo)}
            />
          ))}
        </ScrollView>

        <View style={styles.pagerDots}>
          {combos.map((combo) => (
            <View
              key={`dot-${combo.id}`}
              style={[styles.pagerDot, combo.id === activeCombo?.id ? styles.pagerDotActive : null]}
            />
          ))}
        </View>

        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <PressableScale style={styles.saveButton} onPress={saveCombo}>
          <Text style={styles.saveButtonText}>이 조합 담기</Text>
          <View style={styles.savePlus}>
            <View style={styles.plusHorizontal} />
            <View style={styles.plusVertical} />
          </View>
        </PressableScale>

      </ScrollView>

    </SafeAreaView>
  );
}

function ComboCard({
  combo, index, active, credits, onPress,
}: {
  combo: TimetableCombo; index: number; active: boolean; credits: number; onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      style={[styles.comboCard, { shadowColor: toneAccent(combo.tone) }, active ? styles.comboCardActive : null]}
      onPress={onPress}
    >
      <View style={styles.comboTop}>
        <View style={styles.comboLabelRow}>
          <Text style={[styles.comboLabel, active ? styles.comboLabelActive : null]}>추천 {index + 1}</Text>
        </View>
        {active ? (
          <View style={styles.checkCircle}>
            <View style={styles.checkMark} />
          </View>
        ) : null}
      </View>

      <Text style={styles.comboTitle}>{combo.title}</Text>
      <View style={styles.comboTags}>
        {combo.tags.map((tag) => (
          <Text key={tag} style={styles.comboTag}>{tag}</Text>
        ))}
      </View>
      <Text style={styles.comboDescription}>{combo.description}</Text>
      <View style={styles.comboDivider} />
      <View style={styles.comboFooter}>
        <Text style={styles.comboCredits}>{credits}학점</Text>
        <View style={styles.comboFooterRule} />
        <Text style={[styles.comboConfidence, { color: toneAccent(combo.tone) }]}>
          {combo.courseIds.length === 0 ? '추천 불가' : `추천도 ${combo.confidence}%`}
        </Text>
      </View>
    </PressableScale>
  );
}

function TimetableBoard({
  entries,
  onBlockPress,
}: {
  entries: Array<TimetableSlot & { backgroundColor: string; textColor: string; courseId: string; courseName: string; professor: string }>;
  onBlockPress: (courseId: string, courseName: string) => void;
}) {
  const visiblePeriods = getVisiblePeriods(entries);
  const lastVisiblePeriod = visiblePeriods[visiblePeriods.length - 1]?.period ?? DEFAULT_VISIBLE_PERIOD;
  const boardHeight = visiblePeriods.length * PERIOD_HEIGHT;

  return (
    <View style={styles.boardCard}>
      <View style={styles.dayHeaderRow}>
        <View style={styles.timeHeaderCell} />
        {TIMETABLE_DAYS.map((day) => (
          <Text key={`day-${day}`} style={styles.dayHeaderText}>{day}</Text>
        ))}
      </View>
      <View style={styles.boardBody}>
        <View style={[styles.timeColumn, { height: boardHeight }]}>
          {visiblePeriods.map((period) => (
            <View key={`period-${period.period}`} style={styles.timeCell}>
              <Text style={styles.timeText}>{period.period % 2 === 1 ? period.time : ''}</Text>
            </View>
          ))}
        </View>
        {TIMETABLE_DAYS.map((day) => (
          <View key={`column-${day}`} style={[styles.dayColumn, { height: boardHeight }]}>
            {visiblePeriods.map((period) => (
              <View
                key={`grid-${day}-${period.period}`}
                style={period.period % 2 === 1 ? styles.gridLine : styles.gridSpacer}
              />
            ))}
            {entries
              .filter((entry) => entry.day === day && entry.startPeriod <= lastVisiblePeriod)
              .map((entry) => (
                <PressableScale
                  key={`${entry.courseId}-${day}-${entry.startPeriod}`}
                  style={[
                    styles.scheduleBlock,
                    {
                      top: (entry.startPeriod - 1) * PERIOD_HEIGHT + 4,
                      height:
                        Math.min(entry.endPeriod, lastVisiblePeriod) * PERIOD_HEIGHT -
                        (entry.startPeriod - 1) * PERIOD_HEIGHT - 8,
                      backgroundColor: entry.backgroundColor,
                    },
                  ]}
                  onPress={() => onBlockPress(entry.courseId, entry.courseName)}
                >
                  <Text style={[styles.blockTitle, { color: entry.textColor }]} numberOfLines={2}>
                    {entry.courseName}
                  </Text>
                  <Text style={styles.blockMeta} numberOfLines={1}>{entry.location}</Text>
                </PressableScale>
              ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── 조합 빌더 ────────────────────────────────────────────────────────────────

function buildCombos(
  courses: TimetableCourse[],
  userDepartment?: string,
  preferences?: AvoidancePreferences,
): TimetableCombo[] {
  if (courses.length === 0) return [];

  const deptLabel = userDepartment
    ? `${userDepartment} `
    : '';

  const makePool = (filtered: TimetableCourse[]) => {
    return filtered.map((c) => String(c.id));
  };

  const comboSource = applyAvoidancePreferences(courses, preferences);

  const allPool    = makePool(comboSource);
  const byRating   = [...comboSource].sort((a, b) => b.rating - a.rating);
  const morningPool = makePool(comboSource.filter((c) => c.slots.every((s) => s.endPeriod <= MORNING_LATEST_END_PERIOD)));
  const relaxedPool = makePool(comboSource.filter((c) => c.slots.every((s) => s.startPeriod >= RELAXED_EARLIEST_START_PERIOD)));
  const afternoonPool = makePool(comboSource.filter((c) => c.slots.every((s) => s.startPeriod >= AFTERNOON_EARLIEST_START_PERIOD)));
  const ratingPool  = makePool(byRating);

  const balanced   = pickCompatibleCourses(comboSource, allPool,    7, MAX_COMBO_CREDITS);
  const morning    = pickCompatibleCourses(comboSource, morningPool, 6, MAX_COMBO_CREDITS);
  const relaxed    = pickCompatibleCourses(comboSource, relaxedPool, 6, MAX_COMBO_CREDITS, 2); // 하루 최대 2강의
  const afternoon  = pickCompatibleCourses(comboSource, afternoonPool, 6, MAX_COMBO_CREDITS);
  const highRating = pickCompatibleCourses(comboSource, ratingPool,  6, MAX_COMBO_CREDITS);

  const get = (ids: string[]) => comboSource.filter((c) => ids.includes(String(c.id)));

  const result: TimetableCombo[] = [
    {
      id: 'balanced',
      title: `${deptLabel}밸런스형`,
      tags: buildComboTags(get(balanced)),
      description: buildComboDescription(get(balanced), 'balanced'),
      confidence: calculateConfidence(get(balanced), 7, 'balanced'),
      courseIds: balanced,
      tone: 'blue',
    },
    {
      id: 'highRating',
      title: '고평점 강의 위주',
      tags: buildComboTags(get(highRating)),
      description: buildComboDescription(get(highRating), 'highRating'),
      confidence: calculateConfidence(get(highRating), 6, 'highRating'),
      courseIds: highRating,
      tone: 'rose',
    },
    {
      id: 'morning',
      title: '오전 집중형',
      tags: buildComboTags(get(morning)),
      description: buildComboDescription(get(morning), 'morning'),
      confidence: calculateConfidence(get(morning), 6, 'morning'),
      courseIds: morning,
      tone: 'green',
    },
    {
      id: 'relaxed',
      title: '공강 여유형',
      tags: buildComboTags(get(relaxed)),
      description: buildComboDescription(get(relaxed), 'relaxed'),
      confidence: calculateConfidence(get(relaxed), 6, 'relaxed'),
      courseIds: relaxed,
      tone: 'lilac',
    },
    {
      id: 'afternoonOnly',
      title: '오전 수업 없는 조합',
      tags: buildComboTags(get(afternoon)),
      description: buildComboDescription(get(afternoon), 'afternoonOnly'),
      confidence: calculateConfidence(get(afternoon), 6, 'afternoonOnly'),
      courseIds: afternoon,
      tone: 'amber',
    },
  ];

  return harmonizeDuplicateComboConfidence(result);
}

function applyAvoidancePreferences(
  courses: TimetableCourse[],
  preferences?: AvoidancePreferences,
) {
  if (!preferences) return courses;

  return courses.filter((course) =>
    course.slots.every((slot) => {
      if (preferences.avoidMorning && slot.startPeriod <= MORNING_LATEST_END_PERIOD) return false;
      if (preferences.avoidEvening && slot.endPeriod > EVENING_FREE_LATEST_END_PERIOD) return false;
      if (preferences.freeDay && slot.day === preferences.freeDay) return false;
      return true;
    }),
  );
}

function calculateConfidence(
  courses: TimetableCourse[],
  targetCount: number,
  kind: 'balanced' | 'morning' | 'relaxed' | 'afternoonOnly' | 'highRating',
): number {
  if (courses.length === 0) return 0;

  const avgRating  = courses.reduce((s, c) => s + c.rating, 0) / courses.length;
  const avgReviews = courses.reduce((s, c) => s + c.reviewCount, 0) / courses.length;
  const totalCredits = courses.reduce((sum, course) => sum + (course.credits ?? 3), 0);

  const ratingScore = Math.round(Math.max(0, Math.min(avgRating / 5, 1)) * 42);
  const reviewScore = Math.round(Math.min(avgReviews / 12, 1) * 18);
  const completenessScore = Math.round(Math.min(courses.length / targetCount, 1) * 18);
  const creditScore = Math.round(Math.min(totalCredits / 18, 1) * 8);
  const fitScore = calculateKindFitScore(courses, kind);

  return Math.max(0, Math.min(ratingScore + reviewScore + completenessScore + creditScore + fitScore, 99));
}

function harmonizeDuplicateComboConfidence(combos: TimetableCombo[]) {
  const bestConfidenceBySignature = new Map<string, number>();

  combos.forEach((combo) => {
    if (combo.courseIds.length === 0) {
      return;
    }

    const signature = getComboSignature(combo.courseIds);
    const currentBest = bestConfidenceBySignature.get(signature) ?? 0;
    bestConfidenceBySignature.set(signature, Math.max(currentBest, combo.confidence));
  });

  return combos.map((combo) => {
    if (combo.courseIds.length === 0) {
      return combo;
    }

    const signature = getComboSignature(combo.courseIds);
    return {
      ...combo,
      confidence: bestConfidenceBySignature.get(signature) ?? combo.confidence,
    };
  });
}

function getComboSignature(courseIds: string[]) {
  return [...courseIds].sort((left, right) => left.localeCompare(right, undefined, { numeric: true })).join('|');
}

function buildComboTags(courses: TimetableCourse[]): string[] {
  const tags: string[] = [];
  const allSlots = courses.flatMap((c) => c.slots);

  if (allSlots.length === 0) return ['강의 없음'];

  if (!allSlots.some((s) => s.day === '월')) tags.push('월 공강');
  if (!allSlots.some((s) => s.day === '금')) tags.push('금 공강');

  if (allSlots.every((s) => s.endPeriod <= MORNING_LATEST_END_PERIOD)) tags.push('오전 집중');
  if (allSlots.every((s) => s.startPeriod >= AFTERNOON_EARLIEST_START_PERIOD)) tags.push('오후 수업');

  const avgRating = courses.reduce((s, c) => s + c.rating, 0) / (courses.length || 1);
  if (avgRating >= 4.3) tags.push('고평점');

  if (allSlots.every((s) => s.endPeriod <= EVENING_FREE_LATEST_END_PERIOD)) tags.push('저녁 여유');

  return tags.slice(0, 3);
}

function buildComboDescription(
  courses: TimetableCourse[],
  kind: 'balanced' | 'morning' | 'relaxed' | 'afternoonOnly' | 'highRating',
): string {
  if (courses.length === 0) {
    if (kind === 'morning') return '오전에 끝나는 담은 강의가 부족해 조합을 만들지 못했어요.';
    if (kind === 'afternoonOnly') return '정오 이후 강의가 부족해 조합을 만들지 못했어요.';
    if (kind === 'relaxed') return '공강을 넉넉히 둘 수 있는 강의 조합이 아직 부족해요.';
    if (kind === 'highRating') return '평점 데이터를 비교할 담은 강의가 아직 부족해요.';
    return '선택한 조건에 맞는 담은 강의가 아직 부족해요.';
  }

  const avgRating    = (courses.reduce((s, c) => s + c.rating, 0) / courses.length).toFixed(1);
  const totalCredits = courses.reduce((s, c) => s + (c.credits ?? 3), 0);
  const allSlots     = courses.flatMap((c) => c.slots);
  const freeDays = TIMETABLE_DAYS.filter((day) => !allSlots.some((slot) => slot.day === day));
  const freeDayCopy = freeDays.length > 0 ? `, ${freeDays.slice(0, 2).join('·')} 공강` : '';
  const maxDayLoad = getMaxDayLoad(courses);

  switch (kind) {
    case 'balanced':   return `평균 ${avgRating}점, ${totalCredits}학점${freeDayCopy}을 함께 고려한 균형 조합이에요.`;
    case 'highRating': return `평균 ${avgRating}점 강의를 우선으로 묶은 ${totalCredits}학점 조합이에요.`;
    case 'morning':    return `오전에 끝나는 강의만 모은 ${totalCredits}학점 조합이에요.`;
    case 'relaxed':    return `하루 최대 ${maxDayLoad}개 강의로 간격을 넉넉히 둔 ${totalCredits}학점 조합이에요.`;
    case 'afternoonOnly': return `정오 이후 수업만 모은 ${totalCredits}학점 조합이에요.`;
  }
}

function pickCompatibleCourses(
  courses: TimetableCourse[],
  preferredIds: string[],
  limit: number,
  maxCredits: number,
  maxPerDay?: number,
): string[] {
  const picked: string[] = [];
  const pickedNames = new Set<string>();
  let totalCredits = 0;

  const tryPick = (id: string) => {
    if (picked.length >= limit || picked.includes(id)) return;

    const course = courses.find((c) => String(c.id) === id);
    if (!course) return;
    if (pickedNames.has(normalizeCourseName(course.name))) return;
    if (hasConflict(id, picked, courses)) return;

    const courseCredits = course.credits ?? 3;
    if (totalCredits + courseCredits > maxCredits) return;

    if (maxPerDay !== undefined) {
      const dayCounts = new Map<string, number>();
      picked.forEach((pid) => {
        courses.find((c) => String(c.id) === pid)?.slots.forEach((s) => {
          dayCounts.set(s.day, (dayCounts.get(s.day) ?? 0) + 1);
        });
      });
      const wouldExceed = course.slots.some((s) => (dayCounts.get(s.day) ?? 0) >= maxPerDay);
      if (wouldExceed) return;
    }

    picked.push(id);
    pickedNames.add(normalizeCourseName(course.name));
    totalCredits += courseCredits;
  };

  preferredIds.forEach(tryPick);

  return picked;
}

function calculateKindFitScore(
  courses: TimetableCourse[],
  kind: 'balanced' | 'morning' | 'relaxed' | 'afternoonOnly' | 'highRating',
) {
  const slots = courses.flatMap((course) => course.slots);
  if (slots.length === 0) return 0;

  if (kind === 'morning') {
    return slots.every((slot) => slot.endPeriod <= MORNING_LATEST_END_PERIOD) ? 13 : 0;
  }

  if (kind === 'afternoonOnly') {
    return slots.every((slot) => slot.startPeriod >= AFTERNOON_EARLIEST_START_PERIOD) ? 13 : 0;
  }

  if (kind === 'relaxed') {
    const maxLoad = getMaxDayLoad(courses);
    return maxLoad <= 2 ? 13 : Math.max(0, 13 - (maxLoad - 2) * 4);
  }

  if (kind === 'highRating') {
    const average = courses.reduce((sum, course) => sum + course.rating, 0) / courses.length;
    return Math.round(Math.max(0, Math.min(average / 5, 1)) * 13);
  }

  const activeDays = new Set(slots.map((slot) => slot.day)).size;
  const spreadScore = Math.round((activeDays / TIMETABLE_DAYS.length) * 8);
  const stableLoadScore = Math.max(0, 5 - Math.max(getMaxDayLoad(courses) - 2, 0));
  return spreadScore + stableLoadScore;
}

function getMaxDayLoad(courses: TimetableCourse[]) {
  const counts = new Map<TimetableDay, number>();

  courses.forEach((course) => {
    course.slots.forEach((slot) => {
      counts.set(slot.day, (counts.get(slot.day) ?? 0) + 1);
    });
  });

  return Math.max(0, ...counts.values());
}

function getComboCredits(combo: TimetableCombo, courses: TimetableCourse[]) {
  return courses
    .filter((c) => combo.courseIds.includes(String(c.id)))
    .reduce((s, c) => s + (c.credits ?? 3), 0);
}

function getVisiblePeriods(entries: TimetableSlot[]) {
  const latestPeriod = entries.reduce(
    (maxPeriod, entry) => Math.max(maxPeriod, entry.endPeriod),
    DEFAULT_VISIBLE_PERIOD,
  );
  return PERIODS.slice(0, Math.min(latestPeriod, PERIODS.length));
}

function hasConflict(courseId: string, selectedIds: string[], courses: TimetableCourse[]) {
  const course = courses.find((c) => String(c.id) === courseId);
  if (!course) return false;

  const selectedSlots = courses
    .filter((c) => selectedIds.includes(String(c.id)))
    .flatMap((c) => c.slots);

  return course.slots.some((slot) =>
    selectedSlots.some(
      (s) =>
        s.day === slot.day &&
        slot.startPeriod <= s.endPeriod &&
        s.startPeriod <= slot.endPeriod,
    ),
  );
}

function normalizeCourseName(name: string) {
  return name.trim().replace(/\s+/g, '').toLowerCase();
}

function toneAccent(tone: ComboTone): string {
  switch (tone) {
    case 'blue':   return colors.primary;
    case 'green':  return '#226d68';
    case 'lilac':  return '#7655b8';
    case 'amber':  return '#b07428';
    case 'rose':   return '#c4425a';
  }
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: colors.background },
  loadingState:{ flex: 1, justifyContent: 'center' },
  content:     { paddingBottom: 112, gap: spacing.group },

  header:    { paddingHorizontal: spacing.page, gap: 5 },
  title:     { color: colors.text, fontSize: 22, lineHeight: 29, fontWeight: '800', letterSpacing: -0.4 },

  boardHeader:   { paddingHorizontal: spacing.page, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boardTitleWrap:{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  boardTitleDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  boardTitle:    { flex: 1, color: '#111318', fontSize: 16, lineHeight: 22, fontWeight: '800', letterSpacing: -0.3 },
  fullButton:    { minHeight: 40, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, backgroundColor: '#ffffff', borderWidth: 0 },
  fullButtonText:{ color: '#5E6E85', fontSize: 13, fontWeight: '600', letterSpacing: -0.3 },
  fullButtonArrow:{ width: 8, height: 8, borderRightWidth: 2, borderTopWidth: 2, borderColor: '#8f9caf', transform: [{ rotate: '45deg' }] },

  boardCard:   { marginHorizontal: spacing.page, borderRadius: spacing.radius, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12 },
  dayHeaderRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeHeaderCell:{ width: 44 },
  dayHeaderText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  boardBody:   { flexDirection: 'row' },
  timeColumn:  { width: 44 },
  timeCell:    { height: PERIOD_HEIGHT, justifyContent: 'flex-start' },
  timeText:    { color: '#8793a8', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  dayColumn:   { flex: 1, position: 'relative', borderLeftWidth: 1, borderColor: '#e8edf5' },
  gridLine:    { height: PERIOD_HEIGHT, borderTopWidth: 1, borderColor: '#edf1f7' },
  gridSpacer:  { height: PERIOD_HEIGHT },
  scheduleBlock:{ position: 'absolute', left: 3, right: 3, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 7, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)' },
  blockTitle:  { fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: -0.35 },
  blockMeta:   { marginTop: 5, color: '#5E6E85', fontSize: 9, lineHeight: 11, fontWeight: '600' },

  comboSectionHeader:{ paddingHorizontal: spacing.page, gap: 4 },
  comboSectionTitle: { color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: '800', letterSpacing: -0.3 },
  comboSectionSub:   { color: colors.textTertiary, fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: -0.2 },
  preferencePanel:   { marginHorizontal: spacing.page, borderRadius: spacing.radius, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  preferenceTitle:   { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '800', letterSpacing: -0.3 },
  preferenceChipRow: { flexDirection: 'row', gap: 8 },
  preferenceChip:    { flex: 1, minHeight: 40, borderRadius: 8, backgroundColor: '#F4F7FB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  preferenceChipActive:{ backgroundColor: '#EAF7FF', borderWidth: 1, borderColor: colors.primary },
  preferenceChipText:{ color: '#6E7A88', fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: -0.2 },
  preferenceChipTextActive:{ color: colors.primary },
  preferenceDays:    { flexDirection: 'row', gap: 6 },
  dayPreferenceChip: { flex: 1, minHeight: 34, borderRadius: 8, backgroundColor: '#F4F7FB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dayPreferenceChipActive:{ backgroundColor: colors.primary },
  dayPreferenceText: { color: '#8793A8', fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: -0.15 },
  dayPreferenceTextActive:{ color: '#FFFFFF' },

  comboRail:      { paddingHorizontal: spacing.page, gap: 12, paddingVertical: 2 },
  comboCard:      { width: 238, minHeight: 210, borderRadius: spacing.radius, padding: 18, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.surface },
  comboCardActive:{ borderColor: colors.primary, backgroundColor: colors.surface },
  comboTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comboLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comboLabel:     { color: '#5E6E85', fontSize: 14, fontWeight: '600', letterSpacing: -0.3 },
  comboLabelActive:{ color: colors.primary },
  checkCircle:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  checkMark:      { width: 12, height: 7, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#ffffff', transform: [{ rotate: '-45deg' }, { translateY: -1 }] },
  comboTitle:     { marginTop: 22, color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4 },
  comboTags:      { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  comboTag:       { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EBF3FF', color: '#4A5E78', fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: -0.25 },
  comboDescription:{ marginTop: 14, color: colors.textSecondary, fontSize: 14, lineHeight: 22, fontWeight: '600', letterSpacing: -0.3 },
  comboDivider:   { height: 1, backgroundColor: 'rgba(17,24,39,0.08)', marginTop: 24 },
  comboFooter:    { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  comboCredits:   { color: colors.textSecondary, fontSize: 15, fontWeight: '700', letterSpacing: -0.35 },
  comboFooterRule:{ width: 1, height: 16, backgroundColor: 'rgba(101,115,138,0.26)' },
  comboConfidence:{ fontSize: 15, fontWeight: '800', letterSpacing: -0.35 },

  pagerDots:    { flexDirection: 'row', justifyContent: 'center', gap: 9, marginTop: -4 },
  pagerDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dfe6f0' },
  pagerDotActive:{ width: 10, backgroundColor: colors.primary },
  messageText:  { marginTop: -4, marginHorizontal: 18, color: colors.primary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  saveButton:     { minHeight: 52, marginHorizontal: spacing.page, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.primary },
  saveButtonText: { color: '#ffffff', fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: -0.3 },
  savePlus:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  plusHorizontal: { width: 16, height: 2, borderRadius: 1, backgroundColor: '#ffffff' },
  plusVertical:   { position: 'absolute', width: 2, height: 16, borderRadius: 1, backgroundColor: '#ffffff' },

});
