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
  TIMETABLE_STARTER_CART_IDS,
  TIMETABLE_STARTER_SELECTED_IDS,
  TimetableSlot,
} from '../lib/timetableData';
import {
  loadPinnedTimetableIds,
  loadSelectedTimetableIds,
  loadTimetableCartIds,
  savePinnedTimetableIds,
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

const PERIOD_HEIGHT = 54;
const BOARD_PERIODS = PERIODS.slice(0, 9);
const BLOCK_COLORS = ['#dfe9ff', '#e2f4ea', '#efe4ff', '#fff0cf', '#e7f0ff', '#dff5f3'];
const BLOCK_TEXT_COLORS = ['#16499a', '#226d68', '#7655b8', '#8a5a28', '#24548f', '#1a6c68'];
const MAX_COMBO_CREDITS = 18;

export function TimetableScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [activeComboId, setActiveComboId] = useState('balanced');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);

      try {
        const [courses, storedCartIds, storedSelectedIds, storedPinnedIds] = await Promise.all([
          getAllCourses(),
          loadTimetableCartIds(),
          loadSelectedTimetableIds(),
          loadPinnedTimetableIds(),
        ]);

        if (!isActive) return;

        const initialCartIds = storedCartIds.length > 0 ? storedCartIds : TIMETABLE_STARTER_CART_IDS;
        const initialSelectedIds =
          storedSelectedIds.length > 0 ? storedSelectedIds : TIMETABLE_STARTER_SELECTED_IDS;

        setAllCourses(courses);
        setCartIds(initialCartIds);
        setSelectedIds(initialSelectedIds.filter((id) => initialCartIds.includes(id)));
        setPinnedIds(storedPinnedIds.filter((id) => initialCartIds.includes(id)));

        if (storedCartIds.length === 0) await saveTimetableCartIds(initialCartIds);
        if (storedSelectedIds.length === 0) await saveSelectedTimetableIds(initialSelectedIds);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();
    return () => { isActive = false; };
  }, []);

  const timetableCourses = useMemo<TimetableCourse[]>(
    () => allCourses.map((course) => ({ ...course, slots: TIMETABLE_BY_COURSE_ID[String(course.id)] ?? [] })),
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
    () => buildCombos(cartCourses, user?.department, pinnedIds),
    [cartCourses, user?.department, pinnedIds],
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
    const nextIds = combo.courseIds.filter((id) => cartIds.includes(id));
    setActiveComboId(combo.id);
    setSelectedIds(nextIds);
    await saveSelectedTimetableIds(nextIds);
    setMessage(`${combo.title} 조합을 시간표에 반영했어요.`);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const saveCombo = async () => {
    if (!activeCombo) return;
    const nextCartIds = Array.from(new Set([...cartIds, ...activeCombo.courseIds]));
    setCartIds(nextCartIds);
    await saveTimetableCartIds(nextCartIds);
    setMessage('이 조합을 보관함에 담았어요.');
  };

  const handleBlockPress = async (courseId: string, courseName: string) => {
    const nextIds = selectedIds.filter((id) => id !== courseId);
    setSelectedIds(nextIds);
    await saveSelectedTimetableIds(nextIds);
    setMessage(`${courseName} 제거됨`);
  };

  const handleSavedCardPress = async (course: TimetableCourse) => {
    const courseId = String(course.id);
    if (selectedIds.includes(courseId)) {
      const nextIds = selectedIds.filter((id) => id !== courseId);
      setSelectedIds(nextIds);
      await saveSelectedTimetableIds(nextIds);
      setMessage(`${course.name} 제거됨`);
      return;
    }
    if (hasConflict(courseId, selectedIds, cartCourses)) {
      setMessage(`${course.name}: 시간이 겹치는 강의가 있어요`);
      return;
    }
    const nextIds = [...selectedIds, courseId];
    setSelectedIds(nextIds);
    await saveSelectedTimetableIds(nextIds);
    setMessage(`${course.name} 추가됨`);
  };

  const handleTogglePin = async (courseId: string) => {
    const next = pinnedIds.includes(courseId)
      ? pinnedIds.filter((id) => id !== courseId)
      : [...pinnedIds, courseId];
    setPinnedIds(next);
    await savePinnedTimetableIds(next);
    setMessage(
      next.includes(courseId)
        ? '고정 강의로 설정했어요. 모든 조합에 포함돼요.'
        : '고정 해제했어요.',
    );
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
          <Text style={styles.kicker}>시간표</Text>
          <Text style={styles.title}>이번 학기 시간표</Text>
        </View>

        <View style={styles.boardHeader}>
          <View style={styles.boardTitleWrap}>
            <View style={styles.boardTitleDot} />
            <Text style={styles.boardTitle}>{activeCombo?.title ?? '현재'} 시간표</Text>
          </View>
          <PressableScale style={styles.fullButton} onPress={() => navigation.navigate({ name: 'TimetableFull' })}>
            <Text style={styles.fullButtonText}>전체 보기</Text>
            <View style={styles.fullButtonArrow} />
          </PressableScale>
        </View>

        <TimetableBoard entries={placedEntries} onBlockPress={handleBlockPress} />

        <View style={styles.comboSectionHeader}>
          <Text style={styles.comboSectionTitle}>추천 조합</Text>
          <Text style={styles.comboSectionSub}>평점 · 리뷰수 · 조합 완성도 기준 · 최대 {MAX_COMBO_CREDITS}학점</Text>
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

        <View style={styles.savedHeader}>
          <Text style={styles.savedTitle}>보관한 강의</Text>
          <PressableScale style={styles.viewAllButton} onPress={() => navigation.navigate({ name: 'CartFull' })}>
            <Text style={styles.viewAllText}>전체 보기</Text>
            <View style={styles.viewAllChevron} />
          </PressableScale>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedRail}>
          {cartCourses.slice(0, 8).map((course, index) => (
            <SavedCourseCard
              key={`saved-${course.id}`}
              course={course}
              index={index}
              isPinned={pinnedIds.includes(String(course.id))}
              isInTimetable={selectedIds.includes(String(course.id))}
              onPress={() => handleSavedCardPress(course)}
              onTogglePin={() => handleTogglePin(String(course.id))}
            />
          ))}
        </ScrollView>

        <View style={{ height: 8 }} />
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
          <ComboGlyph tone={combo.tone} />
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
        <Text style={[styles.comboConfidence, { color: toneAccent(combo.tone) }]}>추천도 {combo.confidence}%</Text>
      </View>
    </PressableScale>
  );
}

function ComboGlyph({ tone }: { tone: ComboTone }) {
  return (
    <View style={[styles.comboGlyph, { backgroundColor: toneAccent(tone) + '22' }]}>
      <View style={[styles.comboGlyphInner, { backgroundColor: toneAccent(tone) }]} />
    </View>
  );
}

function TimetableBoard({
  entries,
  onBlockPress,
}: {
  entries: Array<TimetableSlot & { backgroundColor: string; textColor: string; courseId: string; courseName: string; professor: string }>;
  onBlockPress: (courseId: string, courseName: string) => void;
}) {
  const boardHeight = BOARD_PERIODS.length * PERIOD_HEIGHT;

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
          {BOARD_PERIODS.map((period) => (
            <View key={`period-${period.period}`} style={styles.timeCell}>
              <Text style={styles.timeText}>{period.time}</Text>
            </View>
          ))}
        </View>
        {TIMETABLE_DAYS.map((day) => (
          <View key={`column-${day}`} style={[styles.dayColumn, { height: boardHeight }]}>
            {BOARD_PERIODS.map((period) => (
              <View key={`grid-${day}-${period.period}`} style={styles.gridLine} />
            ))}
            {entries
              .filter((entry) => entry.day === day && entry.startPeriod <= BOARD_PERIODS.length)
              .map((entry) => (
                <PressableScale
                  key={`${entry.courseId}-${day}-${entry.startPeriod}`}
                  style={[
                    styles.scheduleBlock,
                    {
                      top: (entry.startPeriod - 1) * PERIOD_HEIGHT + 4,
                      height:
                        Math.min(entry.endPeriod, BOARD_PERIODS.length) * PERIOD_HEIGHT -
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

function SavedCourseCard({
  course, index, isPinned, isInTimetable, onPress, onTogglePin,
}: {
  course: TimetableCourse;
  index: number;
  isPinned: boolean;
  isInTimetable: boolean;
  onPress: () => void;
  onTogglePin: () => void;
}) {
  const bookmarkColor = BLOCK_TEXT_COLORS[index % BLOCK_TEXT_COLORS.length];

  return (
    <PressableScale
      style={[
        styles.savedCard,
        isPinned ? styles.savedCardPinned : null,
        isInTimetable ? styles.savedCardActive : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.savedBookmark, { backgroundColor: bookmarkColor }]}>
        <View style={styles.savedBookmarkCut} />
      </View>
      <View style={styles.savedCopy}>
        <Text style={styles.savedCourseName} numberOfLines={1}>{course.name}</Text>
        <Text style={styles.savedCourseMeta} numberOfLines={1}>
          {course.professor} 교수 · {course.slots[0]?.location ?? '강의실 미정'}
        </Text>
      </View>
      <View style={styles.savedCardRight}>
        <View style={[styles.timetableIndicator, isInTimetable ? styles.timetableIndicatorActive : null]} />
        <PressableScale style={[styles.pinButton, isPinned ? styles.pinButtonActive : null]} onPress={onTogglePin}>
          <View style={[styles.pinDot, isPinned ? styles.pinDotActive : null]} />
        </PressableScale>
      </View>
    </PressableScale>
  );
}

// ─── 조합 빌더 ────────────────────────────────────────────────────────────────

function buildCombos(
  courses: TimetableCourse[],
  userDepartment?: string,
  pinnedIds: string[] = [],
): TimetableCombo[] {
  if (courses.length === 0) return [];

  const deptLabel = userDepartment
    ? `${userDepartment.replace(/학과$|학부$|전공$/u, '')} `
    : '';

  // 고정 강의가 항상 먼저 선택되도록 선호 목록 앞에 배치
  const makePool = (filtered: TimetableCourse[]) => {
    const filteredIds = filtered.map((c) => String(c.id));
    const pinFirst = pinnedIds.filter((id) => filteredIds.includes(id));
    const rest = filteredIds.filter((id) => !pinnedIds.includes(id));
    return [...pinFirst, ...rest];
  };

  const allPool    = makePool(courses);
  const byRating   = [...courses].sort((a, b) => b.rating - a.rating);
  const morningPool = makePool(courses.filter((c) => c.slots.some((s) => s.startPeriod <= 4)));
  const relaxedPool = makePool(courses.filter((c) => c.slots.every((s) => s.startPeriod >= 3)));
  const earlyPool   = makePool(courses.filter((c) => c.slots.every((s) => s.endPeriod <= 7)));
  const ratingPool  = makePool(byRating);

  const balanced   = pickCompatibleCourses(courses, allPool,    7, MAX_COMBO_CREDITS);
  const morning    = pickCompatibleCourses(courses, morningPool, 6, MAX_COMBO_CREDITS);
  const relaxed    = pickCompatibleCourses(courses, relaxedPool, 6, MAX_COMBO_CREDITS, 2); // 하루 최대 2강의
  const earlyEnd   = pickCompatibleCourses(courses, earlyPool,   6, MAX_COMBO_CREDITS);
  const highRating = pickCompatibleCourses(courses, ratingPool,  6, MAX_COMBO_CREDITS);

  const safeMorning  = morning.length >= 3    ? morning    : balanced.slice(0, 6);
  const safeRelaxed  = relaxed.length >= 3    ? relaxed    : balanced.slice(1, 7);
  const safeEarly    = earlyEnd.length >= 3   ? earlyEnd   : balanced.slice(0, 6);
  const safeHigh     = highRating.length >= 3 ? highRating : balanced.slice(0, 6);

  const get = (ids: string[]) => courses.filter((c) => ids.includes(String(c.id)));

  const result: TimetableCombo[] = [
    {
      id: 'balanced',
      title: `${deptLabel}밸런스형`,
      tags: buildComboTags(get(balanced)),
      description: buildComboDescription(get(balanced), 'balanced'),
      confidence: calculateConfidence(get(balanced), 7, 4),
      courseIds: balanced,
      tone: 'blue',
    },
    {
      id: 'highRating',
      title: '고평점 강의 위주',
      tags: buildComboTags(get(safeHigh)),
      description: buildComboDescription(get(safeHigh), 'highRating'),
      confidence: calculateConfidence(get(safeHigh), 6, 6),
      courseIds: safeHigh,
      tone: 'rose',
    },
    {
      id: 'morning',
      title: '오전 집중형',
      tags: buildComboTags(get(safeMorning)),
      description: buildComboDescription(get(safeMorning), 'morning'),
      confidence: calculateConfidence(get(safeMorning), 6, -2),
      courseIds: safeMorning,
      tone: 'green',
    },
    {
      id: 'relaxed',
      title: '공강 여유형',
      tags: buildComboTags(get(safeRelaxed)),
      description: buildComboDescription(get(safeRelaxed), 'relaxed'),
      confidence: calculateConfidence(get(safeRelaxed), 6, 0),
      courseIds: safeRelaxed,
      tone: 'lilac',
    },
    {
      id: 'earlyEnd',
      title: '저녁 없는 조합',
      tags: buildComboTags(get(safeEarly)),
      description: buildComboDescription(get(safeEarly), 'earlyEnd'),
      confidence: calculateConfidence(get(safeEarly), 6, 2),
      courseIds: safeEarly,
      tone: 'amber',
    },
  ];

  return result.map((c, i) => ({ ...c, confidence: Math.min(c.confidence + i, 99) }));
}

function calculateConfidence(courses: TimetableCourse[], targetCount: number, typeOffset: number): number {
  if (courses.length === 0) return 72;

  const avgRating  = courses.reduce((s, c) => s + c.rating, 0) / courses.length;
  const avgReviews = courses.reduce((s, c) => s + c.reviewCount, 0) / courses.length;

  const ratingScore   = Math.round(((avgRating - 1) / 4) * 18 + 56);
  const reviewBonus   = Math.min(Math.round(avgReviews / 6), 10);
  const completeness  = Math.round(Math.min(courses.length / targetCount, 1) * 8);

  return Math.min(Math.max(ratingScore + reviewBonus + completeness + typeOffset, 72), 97);
}

function buildComboTags(courses: TimetableCourse[]): string[] {
  const tags: string[] = [];
  const allSlots = courses.flatMap((c) => c.slots);

  if (allSlots.length === 0) return ['강의 없음'];

  if (!allSlots.some((s) => s.day === '월')) tags.push('월 공강');
  if (!allSlots.some((s) => s.day === '금')) tags.push('금 공강');

  const morningRatio = allSlots.filter((s) => s.startPeriod <= 4).length / allSlots.length;
  if (morningRatio > 0.55) tags.push('오전 수업');

  const avgRating = courses.reduce((s, c) => s + c.rating, 0) / (courses.length || 1);
  if (avgRating >= 4.3) tags.push('고평점');

  if (allSlots.every((s) => s.endPeriod <= 7)) tags.push('저녁 여유');

  return tags.slice(0, 3);
}

function buildComboDescription(
  courses: TimetableCourse[],
  kind: 'balanced' | 'morning' | 'relaxed' | 'earlyEnd' | 'highRating',
): string {
  if (courses.length === 0) return '담은 강의에서 조합을 구성 중이에요.';

  const avgRating    = (courses.reduce((s, c) => s + c.rating, 0) / courses.length).toFixed(1);
  const totalCredits = courses.reduce((s, c) => s + (c.credits ?? 3), 0);
  const allSlots     = courses.flatMap((c) => c.slots);
  const freeDay      = !allSlots.some((s) => s.day === '월') ? '월'
    : !allSlots.some((s) => s.day === '금') ? '금' : null;

  switch (kind) {
    case 'balanced':   return `평균 ${avgRating}점, ${totalCredits}학점${freeDay ? `, ${freeDay} 공강` : ''}으로 균형 잡힌 조합이에요.`;
    case 'highRating': return `보관 강의 중 평점 높은 순으로 구성한 ${totalCredits}학점 조합이에요.`;
    case 'morning':    return `오전 중심 ${totalCredits}학점으로, 오후 시간을 자유롭게 쓸 수 있어요.`;
    case 'relaxed':    return `하루 최대 2강의, ${totalCredits}학점으로 공강이 넉넉한 조합이에요.`;
    case 'earlyEnd':   return `저녁 강의 없이 ${totalCredits}학점을 채운 조합이에요.`;
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
    if (pickedNames.has(course.name)) return;
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
    pickedNames.add(course.name);
    totalCredits += courseCredits;
  };

  preferredIds.forEach(tryPick);
  courses.forEach((c) => tryPick(String(c.id)));

  return picked;
}

function getComboCredits(combo: TimetableCombo, courses: TimetableCourse[]) {
  return courses
    .filter((c) => combo.courseIds.includes(String(c.id)))
    .reduce((s, c) => s + (c.credits ?? 3), 0);
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

function toneAccent(tone: ComboTone): string {
  switch (tone) {
    case 'blue':   return '#3976ce';
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

  header:    { paddingHorizontal: spacing.page, gap: 6 },
  kicker:    { color: colors.primary, fontSize: 14, lineHeight: 18, fontWeight: '900', letterSpacing: -0.35 },
  title:     { color: '#111827', fontSize: 26, lineHeight: 33, fontWeight: '900', letterSpacing: -1 },

  boardHeader:   { paddingHorizontal: spacing.page, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boardTitleWrap:{ flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  boardTitleDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3976ce' },
  boardTitle:    { flex: 1, color: '#111827', fontSize: 18, lineHeight: 23, fontWeight: '900', letterSpacing: -0.6 },
  fullButton:    { minHeight: 40, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.94)' },
  fullButtonText:{ color: '#65738a', fontSize: 13, fontWeight: '600', letterSpacing: -0.3 },
  fullButtonArrow:{ width: 8, height: 8, borderRightWidth: 2, borderTopWidth: 2, borderColor: '#8f9caf', transform: [{ rotate: '45deg' }] },

  boardCard:   { marginHorizontal: spacing.page, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.08, shadowRadius: 28 },
  dayHeaderRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeHeaderCell:{ width: 44 },
  dayHeaderText: { flex: 1, color: '#111827', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  boardBody:   { flexDirection: 'row' },
  timeColumn:  { width: 44 },
  timeCell:    { height: PERIOD_HEIGHT, justifyContent: 'flex-start' },
  timeText:    { color: '#8793a8', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  dayColumn:   { flex: 1, position: 'relative', borderLeftWidth: 1, borderColor: '#e8edf5' },
  gridLine:    { height: PERIOD_HEIGHT, borderTopWidth: 1, borderColor: '#edf1f7' },
  scheduleBlock:{ position: 'absolute', left: 3, right: 3, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 7, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)' },
  blockTitle:  { fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: -0.35 },
  blockMeta:   { marginTop: 5, color: '#65738a', fontSize: 9, lineHeight: 11, fontWeight: '600' },

  comboSectionHeader:{ paddingHorizontal: spacing.page, gap: 4 },
  comboSectionTitle: { color: '#111827', fontSize: 19, lineHeight: 24, fontWeight: '900', letterSpacing: -0.65 },
  comboSectionSub:   { color: '#9aa5b8', fontSize: 12, fontWeight: '700', letterSpacing: -0.2 },

  comboRail:      { paddingHorizontal: spacing.page, gap: 16, paddingVertical: 2 },
  comboCard:      { width: 246, minHeight: 224, borderRadius: 24, padding: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.95)', backgroundColor: 'rgba(255,255,255,0.78)', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.08, shadowRadius: 26 },
  comboCardActive:{ borderColor: '#3976ce', backgroundColor: 'rgba(255,255,255,0.94)' },
  comboTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  comboLabelRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comboGlyph:     { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  comboGlyphInner:{ width: 9, height: 9, borderRadius: 3, transform: [{ rotate: '45deg' }] },
  comboLabel:     { color: '#65738a', fontSize: 14, fontWeight: '600', letterSpacing: -0.3 },
  comboLabelActive:{ color: colors.primary },
  checkCircle:    { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3976ce' },
  checkMark:      { width: 12, height: 7, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: '#ffffff', transform: [{ rotate: '-45deg' }, { translateY: -1 }] },
  comboTitle:     { marginTop: 28, color: '#111827', fontSize: 22, lineHeight: 28, fontWeight: '900', letterSpacing: -0.8 },
  comboTags:      { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  comboTag:       { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eef4ff', color: '#526783', fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: -0.25 },
  comboDescription:{ marginTop: 14, color: '#65738a', fontSize: 14, lineHeight: 22, fontWeight: '700', letterSpacing: -0.3 },
  comboDivider:   { height: 1, backgroundColor: 'rgba(17,24,39,0.08)', marginTop: 24 },
  comboFooter:    { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  comboCredits:   { color: '#65738a', fontSize: 15, fontWeight: '700', letterSpacing: -0.35 },
  comboFooterRule:{ width: 1, height: 16, backgroundColor: 'rgba(101,115,138,0.26)' },
  comboConfidence:{ fontSize: 15, fontWeight: '900', letterSpacing: -0.35 },

  pagerDots:    { flexDirection: 'row', justifyContent: 'center', gap: 9, marginTop: -4 },
  pagerDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dfe6f0' },
  pagerDotActive:{ width: 10, backgroundColor: '#3976ce' },
  messageText:  { marginTop: -4, marginHorizontal: spacing.page, color: colors.primary, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  saveButton:     { minHeight: 62, marginHorizontal: spacing.page, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#2866d6', shadowColor: '#2866d6', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.22, shadowRadius: 28 },
  saveButtonText: { color: '#ffffff', fontSize: 18, lineHeight: 23, fontWeight: '900', letterSpacing: -0.45 },
  savePlus:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  plusHorizontal: { width: 16, height: 2, borderRadius: 1, backgroundColor: '#ffffff' },
  plusVertical:   { position: 'absolute', width: 2, height: 16, borderRadius: 1, backgroundColor: '#ffffff' },

  savedHeader:   { paddingHorizontal: spacing.page, marginTop: spacing.group, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savedTitle:    { color: '#111827', fontSize: 19, lineHeight: 24, fontWeight: '900', letterSpacing: -0.6 },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewAllText:   { color: '#65738a', fontSize: 14, fontWeight: '600', letterSpacing: -0.3 },
  viewAllChevron:{ width: 8, height: 8, borderRightWidth: 2, borderTopWidth: 2, borderColor: '#8f9caf', transform: [{ rotate: '45deg' }] },

  savedRail:    { paddingHorizontal: spacing.page, gap: 12, paddingBottom: 2 },
  savedCard:      { width: 200, minHeight: 74, borderRadius: 16, paddingLeft: 16, paddingRight: 10, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)' },
  savedCardPinned:{ borderColor: 'rgba(57,118,206,0.28)', backgroundColor: 'rgba(239,246,255,0.95)' },
  savedCardActive:{ borderColor: 'rgba(57,118,206,0.42)', backgroundColor: 'rgba(225,237,255,0.95)' },
  savedCardRight: { flexDirection: 'column', alignItems: 'center', gap: 6 },
  timetableIndicator:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#dce4f0' },
  timetableIndicatorActive:{ backgroundColor: '#3976ce' },
  savedBookmark:{ width: 17, height: 24, borderRadius: 3, overflow: 'hidden' },
  savedBookmarkCut:{ position: 'absolute', left: 4, right: 4, bottom: -4, height: 8, backgroundColor: 'rgba(255,255,255,0.88)', transform: [{ rotate: '45deg' }] },
  savedCopy:    { flex: 1, gap: 4 },
  savedCourseName:{ color: '#111827', fontSize: 14, lineHeight: 18, fontWeight: '900', letterSpacing: -0.35 },
  savedCourseMeta:{ color: '#65738a', fontSize: 11, lineHeight: 14, fontWeight: '500', letterSpacing: -0.25 },
  pinButton:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.04)' },
  pinButtonActive:{ backgroundColor: 'rgba(57,118,206,0.14)' },
  pinDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#c8d2e0' },
  pinDotActive: { backgroundColor: '#3976ce' },

});
