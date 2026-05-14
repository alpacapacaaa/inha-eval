import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatePanel } from '../components/ui';
import { getAllCourses } from '../lib/api/courses';
import {
  loadSelectedTimetableIds,
  loadTimetableCartIds,
  saveSelectedTimetableIds,
  saveTimetableCartIds,
} from '../lib/storage/timetableStorage';
import {
  formatPeriodRange,
  PERIODS,
  TIMETABLE_BY_COURSE_ID,
  TIMETABLE_DAYS,
  TimetableSlot,
} from '../lib/timetableData';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

type CourseWithSlots = Course & { slots: TimetableSlot[] };

const BLOCK_COLORS = ['#E0EEFF', '#e2f4ea', '#efe4ff', '#fff0cf', '#EBF3FF', '#dff5f3'];
const BLOCK_TEXT_COLORS = ['#23A9FF', '#226d68', '#7655b8', '#8a5a28', '#23A9FF', '#1a6c68'];
const PERIOD_HEIGHT = 27;
const DEFAULT_VISIBLE_PERIOD = 19;
const MAX_TIMETABLE_CREDITS = 21;

export function CartFullScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = (text: string) => {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(''), 2200);
  };

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const [courses, cIds, sIds] = await Promise.all([
          getAllCourses(),
          loadTimetableCartIds(),
          loadSelectedTimetableIds(),
        ]);
        if (!isActive) return;
        setAllCourses(courses);
        setCartIds(cIds);
        setSelectedIds(sIds);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    load();
    return () => { isActive = false; };
  }, []);

  const cartCourses = useMemo(
    () =>
      allCourses
        .filter((c) => {
          const slots = c.slots?.length ? c.slots : TIMETABLE_BY_COURSE_ID[String(c.id)] ?? [];
          return cartIds.includes(String(c.id)) && slots.length > 0;
        })
        .map((c) => ({
          ...c,
          slots: c.slots?.length ? c.slots : TIMETABLE_BY_COURSE_ID[String(c.id)] ?? [],
        }))
        .sort((a, b) => b.rating - a.rating),
    [allCourses, cartIds],
  );

  const placedEntries = useMemo(
    () =>
      cartCourses
        .filter((c) => selectedIds.includes(String(c.id)))
        .flatMap((course, index) =>
          course.slots.map((slot) => ({
            ...slot,
            backgroundColor: BLOCK_COLORS[index % BLOCK_COLORS.length],
            textColor: BLOCK_TEXT_COLORS[index % BLOCK_TEXT_COLORS.length],
            courseId: String(course.id),
            courseName: course.name,
          })),
        ),
    [cartCourses, selectedIds],
  );

  const handleToggle = useCallback(
    async (course: CourseWithSlots) => {
      const courseId = String(course.id);
      if (selectedIds.includes(courseId)) {
        const nextIds = selectedIds.filter((id) => id !== courseId);
        setSelectedIds(nextIds);
        await saveSelectedTimetableIds(nextIds);
        showMessage(`${course.name} 제거됨`);
        return;
      }
      if (hasConflict(courseId, selectedIds, cartCourses)) {
        showMessage(`${course.name}: 시간이 겹치는 강의가 있어요`);
        return;
      }
      const nextIds = [...selectedIds, courseId];
      setSelectedIds(nextIds);
      await saveSelectedTimetableIds(nextIds);
      showMessage(`${course.name} 추가됨`);
    },
    [selectedIds, cartCourses],
  );

  const handleRemove = useCallback(
    async (courseId: string) => {
      const nextCart = cartIds.filter((id) => id !== courseId);
      const nextSelected = selectedIds.filter((id) => id !== courseId);
      setCartIds(nextCart);
      setSelectedIds(nextSelected);
      await Promise.all([
        saveTimetableCartIds(nextCart),
        saveSelectedTimetableIds(nextSelected),
      ]);
    },
    [cartIds, selectedIds],
  );

  const handleApplyAll = async () => {
    const toAdd: string[] = [];
    let tempSelected = [...selectedIds];
    let tempCredits = cartCourses
      .filter((course) => tempSelected.includes(String(course.id)))
      .reduce((sum, course) => sum + (course.credits ?? 3), 0);
    let skippedCount = 0;

    for (const course of cartCourses) {
      const courseId = String(course.id);
      if (tempSelected.includes(courseId)) continue;
      const credits = course.credits ?? 3;
      if (tempCredits + credits > MAX_TIMETABLE_CREDITS || hasConflict(courseId, tempSelected, cartCourses)) {
        skippedCount += 1;
        continue;
      }
      toAdd.push(courseId);
      tempSelected = [...tempSelected, courseId];
      tempCredits += credits;
    }
    if (toAdd.length === 0) {
      showMessage(skippedCount > 0 ? '시간이 겹치거나 21학점을 넘는 강의는 제외했어요.' : '이미 모든 강의가 적용되어 있어요.');
      return;
    }
    const nextIds = [...selectedIds, ...toAdd];
    setSelectedIds(nextIds);
    await saveSelectedTimetableIds(nextIds);
    showMessage(skippedCount > 0
      ? `${toAdd.length}개를 적용했어요. 겹치거나 21학점을 넘는 강의는 제외했어요.`
      : `${toAdd.length}개 강의를 시간표에 추가했어요.`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.loadingState}>
          <StatePanel label="내 시간표를 불러오는 중입니다." loading />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#111318" />
        </PressableScale>
        <Text style={styles.headerTitle}>내 시간표</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{selectedIds.length}/{cartCourses.length}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 미니 시간표 */}
        <MiniBoard entries={placedEntries} />

        {/* 일괄 적용 + 메시지 */}
        <PressableScale style={styles.applyAllButton} onPress={handleApplyAll}>
          <Text style={styles.applyAllText}>장바구니 한번에 적용</Text>
          <Ionicons name="checkmark-done-outline" size={18} color="#ffffff" />
        </PressableScale>

        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        {/* 강의 목록 */}
        {cartCourses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color={colors.primary} />
            <Text style={styles.emptyTitle}>보관한 강의가 없어요</Text>
            <Text style={styles.emptyDesc}>강의 페이지에서 담기 버튼을 눌러보세요.</Text>
          </View>
        ) : (
          <View style={styles.courseList}>
            {cartCourses.map((course, index) => (
              <CourseRow
                key={String(course.id)}
                course={course}
                index={index}
                isInTimetable={selectedIds.includes(String(course.id))}
                onToggle={() => handleToggle(course)}
                onRemove={() => handleRemove(String(course.id))}
                onPress={() => navigation.navigate({ name: 'CourseDetail', courseId: course.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 미니 시간표 보드 ──────────────────────────────────────────────────────────

function MiniBoard({
  entries,
}: {
  entries: Array<TimetableSlot & { backgroundColor: string; textColor: string; courseId: string; courseName: string }>;
}) {
  const visiblePeriods = getVisiblePeriods(entries);
  const lastVisiblePeriod = visiblePeriods[visiblePeriods.length - 1]?.period ?? DEFAULT_VISIBLE_PERIOD;
  const boardHeight = visiblePeriods.length * PERIOD_HEIGHT;
  return (
    <View style={styles.boardCard}>
      <View style={styles.dayHeaderRow}>
        <View style={styles.timeHeaderCell} />
        {TIMETABLE_DAYS.map((day) => (
          <Text key={day} style={styles.dayHeaderText}>{day}</Text>
        ))}
      </View>
      <View style={styles.boardBody}>
        <View style={[styles.timeColumn, { height: boardHeight }]}>
          {visiblePeriods.map((p) => (
            <View key={p.period} style={styles.timeCell}>
              <Text style={styles.timeText}>{p.period % 2 === 1 ? p.time : ''}</Text>
            </View>
          ))}
        </View>
        {TIMETABLE_DAYS.map((day) => (
          <View key={day} style={[styles.dayColumn, { height: boardHeight }]}>
            {visiblePeriods.map((p) => (
              <View
                key={`grid-${day}-${p.period}`}
                style={p.period % 2 === 1 ? styles.gridLine : styles.gridSpacer}
              />
            ))}
            {entries
              .filter((e) => e.day === day && e.startPeriod <= lastVisiblePeriod)
              .map((e) => (
                <View
                  key={`${e.courseId}-${day}-${e.startPeriod}`}
                  style={[
                    styles.scheduleBlock,
                    {
                      top: (e.startPeriod - 1) * PERIOD_HEIGHT + 4,
                      height:
                        Math.min(e.endPeriod, lastVisiblePeriod) * PERIOD_HEIGHT -
                        (e.startPeriod - 1) * PERIOD_HEIGHT - 8,
                      backgroundColor: e.backgroundColor,
                    },
                  ]}
                >
                  <Text style={[styles.blockTitle, { color: e.textColor }]} numberOfLines={2}>
                    {e.courseName}
                  </Text>
                </View>
              ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function getVisiblePeriods(entries: TimetableSlot[]) {
  const latestPeriod = entries.reduce(
    (maxPeriod, entry) => Math.max(maxPeriod, entry.endPeriod),
    DEFAULT_VISIBLE_PERIOD,
  );
  return PERIODS.slice(0, Math.min(latestPeriod, PERIODS.length));
}

// ─── 강의 행 ──────────────────────────────────────────────────────────────────

function CourseRow({
  course,
  index,
  isInTimetable,
  onToggle,
  onRemove,
  onPress,
}: {
  course: CourseWithSlots;
  index: number;
  isInTimetable: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onPress: () => void;
}) {
  const accent = BLOCK_TEXT_COLORS[index % BLOCK_TEXT_COLORS.length];
  const slotText = course.slots.map((s) => `${s.day} ${formatPeriodRange(s.startPeriod, s.endPeriod)}`).join(' · ');

  return (
    <View style={[styles.row, isInTimetable ? styles.rowActive : null]}>
      <View style={[styles.rowStripe, { backgroundColor: accent }]} />
      <PressableScale style={styles.rowBody} onPress={onPress}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{course.name}</Text>
          <Text style={styles.rowCredits}>{course.credits ?? 3}학점</Text>
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {course.professor} 교수{slotText ? ` · ${slotText}` : ''}
        </Text>
        <Text style={styles.rowRating}>★ {course.rating.toFixed(1)} · 리뷰 {course.reviewCount}개</Text>
      </PressableScale>
      <View style={styles.rowActions}>
        <PressableScale
          style={[styles.toggleBtn, isInTimetable ? styles.toggleBtnActive : null]}
          onPress={onToggle}
        >
          <Ionicons
            name={isInTimetable ? 'checkmark' : 'add'}
            size={18}
            color={isInTimetable ? '#ffffff' : '#5E6E85'}
          />
        </PressableScale>
        <PressableScale style={styles.removeBtn} onPress={onRemove} hitSlop={4}>
          <Ionicons name="close" size={14} color="#c0c8d4" />
        </PressableScale>
      </View>
    </View>
  );
}

// ─── 충돌 체크 ────────────────────────────────────────────────────────────────

function hasConflict(courseId: string, selectedIds: string[], courses: CourseWithSlots[]) {
  const course = courses.find((c) => String(c.id) === courseId);
  if (!course) return false;
  const selectedSlots = courses
    .filter((c) => selectedIds.includes(String(c.id)))
    .flatMap((c) => c.slots);
  return course.slots.some((slot) =>
    selectedSlots.some(
      (s) => s.day === slot.day && slot.startPeriod <= s.endPeriod && s.startPeriod <= slot.endPeriod,
    ),
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: colors.background },
  loadingState:{ flex: 1, justifyContent: 'center' },
  content:     { gap: spacing.group, paddingTop: 8 },

  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.page, paddingBottom: 16, gap: 12 },
  backButton:     { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder },
  headerTitle:    { flex: 1, color: '#111318', fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4 },
  countBadge:     { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.primary },
  countText:      { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: -0.3 },

  boardCard:    { marginHorizontal: spacing.page, borderRadius: spacing.radius, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12 },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeHeaderCell:{ width: 44 },
  dayHeaderText: { flex: 1, color: '#111318', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  boardBody:    { flexDirection: 'row' },
  timeColumn:   { width: 44 },
  timeCell:     { height: PERIOD_HEIGHT, justifyContent: 'flex-start' },
  timeText:     { color: '#8793a8', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  dayColumn:    { flex: 1, position: 'relative', borderLeftWidth: 1, borderColor: '#e8edf5' },
  gridLine:     { height: PERIOD_HEIGHT, borderTopWidth: 1, borderColor: '#edf1f7' },
  gridSpacer:   { height: PERIOD_HEIGHT },
  scheduleBlock:{ position: 'absolute', left: 3, right: 3, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 7, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E8EF' },
  blockTitle:   { fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: -0.35 },

  applyAllButton:{ minHeight: 52, marginHorizontal: spacing.page, borderRadius: spacing.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary },
  applyAllText:  { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  messageText:   { marginTop: -8, marginHorizontal: spacing.page, color: colors.primary, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  emptyState:  { marginTop: 40, alignItems: 'center', gap: 12 },
  emptyTitle:  { color: '#111318', fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  emptyDesc:   { color: '#5E6E85', fontSize: 14, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },

  courseList:  { marginHorizontal: spacing.page, borderRadius: spacing.radius, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder },
  row:         { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(17,24,39,0.06)' },
  rowActive:   { backgroundColor: 'rgba(57,118,206,0.06)' },
  rowStripe:   { width: 4, alignSelf: 'stretch' },
  rowBody:     { flex: 1, gap: 4, paddingVertical: 14, paddingLeft: 14 },
  rowTop:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName:     { flex: 1, color: '#111318', fontSize: 15, lineHeight: 19, fontWeight: '800', letterSpacing: -0.4 },
  rowCredits:  { color: '#5E6E85', fontSize: 13, fontWeight: '700', letterSpacing: -0.25 },
  rowMeta:     { color: '#8a96aa', fontSize: 12, fontWeight: '500', letterSpacing: -0.2 },
  rowRating:   { color: '#a8b4c4', fontSize: 11, fontWeight: '600', letterSpacing: -0.2 },
  rowActions:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 14, paddingLeft: 10 },
  toggleBtn:      { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F4F7', borderWidth: 0 },
  toggleBtnActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  removeBtn:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
