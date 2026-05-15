import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatePanel } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
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
  TimetableDay,
  TimetableSlot,
} from '../lib/timetableData';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

type TimetableCourse = Course & { slots: TimetableSlot[] };

type SelectedEntry = {
  courseId: string;
  courseName: string;
  professor: string;
  day: TimetableDay;
  startPeriod: number;
  endPeriod: number;
  location: string;
};

const PERIOD_HEIGHT = 29;
const BLOCK_COLORS = ['#E0EEFF', '#e2f4ea', '#efe4ff', '#fff0cf', '#EBF3FF', '#dff5f3'];
const BLOCK_TEXT_COLORS = ['#23A9FF', '#226d68', '#7655b8', '#8a5a28', '#23A9FF', '#1a6c68'];
const MAX_TIMETABLE_CREDITS = 21;
const DEFAULT_VISIBLE_PERIOD = 19;
const COURSE_SCOPE_COLORS = {
  general: '#226d68',
  major: '#d96816',
  other: '#8A96AA',
};

export function TimetableFullScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry | null>(null);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const [courses, storedCartIds, storedSelectedIds] = await Promise.all([
          getAllCourses(),
          loadTimetableCartIds(),
          loadSelectedTimetableIds(),
        ]);

        if (!isActive) return;

        const validSelectedIds = storedSelectedIds.filter((id) => storedCartIds.includes(id));
        setAllCourses(courses);
        setCartIds(storedCartIds);
        setSelectedIds(validSelectedIds);
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
    () => timetableCourses.filter((course) => cartIds.includes(String(course.id))),
    [cartIds, timetableCourses],
  );

  const placedCourses = useMemo(
    () => timetableCourses.filter((course) => selectedIds.includes(String(course.id))),
    [timetableCourses, selectedIds],
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

  const visiblePeriods = useMemo(() => {
    const maxPeriod = placedEntries.reduce((max, e) => Math.max(max, e.endPeriod), DEFAULT_VISIBLE_PERIOD);
    return PERIODS.slice(0, Math.min(maxPeriod, PERIODS.length));
  }, [placedEntries]);
  const lastVisiblePeriod = visiblePeriods[visiblePeriods.length - 1]?.period ?? DEFAULT_VISIBLE_PERIOD;

  const totalCredits = placedCourses.reduce((sum, c) => sum + (c.credits ?? 3), 0);
  const handleToggleCourse = useCallback(async (course: TimetableCourse) => {
    const courseId = String(course.id);
    const isSelected = selectedIds.includes(courseId);
    if (!isSelected && hasConflict(courseId, selectedIds, cartCourses)) {
      setMessage(`${course.name}: 시간이 겹치는 강의가 있어요.`);
      return;
    }

    const nextIds = isSelected
      ? selectedIds.filter((id) => id !== courseId)
      : [...selectedIds, courseId];
    const nextCourses = cartCourses.filter((item) => nextIds.includes(String(item.id)));
    const nextCredits = nextCourses.reduce((sum, item) => sum + (item.credits ?? 3), 0);

    if (!isSelected && nextCredits > MAX_TIMETABLE_CREDITS) {
      setMessage(`최대 ${MAX_TIMETABLE_CREDITS}학점까지만 넣을 수 있어요.`);
      return;
    }

    setSelectedIds(nextIds);
    await saveSelectedTimetableIds(nextIds);
    setMessage(isSelected ? `${course.name}을 시간표에서 뺐어요.` : `${course.name}을 시간표에 넣었어요.`);
  }, [cartCourses, selectedIds]);

  const handleRemoveFromCart = useCallback(async (course: TimetableCourse) => {
    const courseId = String(course.id);
    const nextCartIds = cartIds.filter((id) => id !== courseId);
    const nextSelectedIds = selectedIds.filter((id) => id !== courseId);

    setCartIds(nextCartIds);
    setSelectedIds(nextSelectedIds);
    await Promise.all([
      saveTimetableCartIds(nextCartIds),
      saveSelectedTimetableIds(nextSelectedIds),
    ]);
    setMessage(`${course.name}을 담은 강의에서 삭제했어요.`);
  }, [cartIds, selectedIds]);

  const handleBlockPress = (entry: SelectedEntry) => {
    setSelectedEntry(entry);
  };

  const handleDeleteFromTimetable = async () => {
    if (!selectedEntry) return;
    const nextIds = selectedIds.filter((id) => id !== selectedEntry.courseId);
    setSelectedIds(nextIds);
    await saveSelectedTimetableIds(nextIds);
    setSelectedEntry(null);
    setMessage(`${selectedEntry.courseName}을 시간표에서 뺐어요.`);
  };

  const handleViewReviews = () => {
    if (!selectedEntry) return;
    setSelectedEntry(null);
    navigation.navigate({ name: 'CourseDetail', courseId: Number(selectedEntry.courseId) });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.loadingState}>
          <StatePanel label="시간표를 불러오는 중입니다." loading />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>내 시간표</Text>
        <View style={styles.creditsBadge}>
          <Text style={styles.creditsText}>{selectedIds.length}/{cartCourses.length}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {cartCourses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>담은 강의가 없어요</Text>
            <Text style={styles.emptyDesc}>시간표 탭에서 추천 조합을 골라보세요.</Text>
          </View>
        ) : (
          <>
            <View style={styles.boardCard}>
              <View style={styles.dayHeaderRow}>
                <View style={styles.timeHeaderCell} />
                {TIMETABLE_DAYS.map((day) => (
                  <Text key={`day-${day}`} style={styles.dayHeaderText}>{day}</Text>
                ))}
              </View>
              <View style={styles.boardBody}>
                <View style={[styles.timeColumn, { height: visiblePeriods.length * PERIOD_HEIGHT }]}>
                  {visiblePeriods.map((period) => (
                    <View key={`period-${period.period}`} style={styles.timeCell}>
                      <Text style={styles.timeText}>{period.period % 2 === 1 ? period.time : ''}</Text>
                    </View>
                  ))}
                </View>
                {TIMETABLE_DAYS.map((day) => (
                  <View
                    key={`column-${day}`}
                    style={[styles.dayColumn, { height: visiblePeriods.length * PERIOD_HEIGHT }]}
                  >
                    {visiblePeriods.map((period) => (
                      <View
                        key={`grid-${day}-${period.period}`}
                        style={period.period % 2 === 1 ? styles.gridLine : styles.gridSpacer}
                      />
                    ))}
                    {placedEntries
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
                                (entry.startPeriod - 1) * PERIOD_HEIGHT -
                                8,
                              backgroundColor: entry.backgroundColor,
                            },
                          ]}
                          onPress={() => handleBlockPress({
                            courseId: entry.courseId,
                            courseName: entry.courseName,
                            professor: entry.professor,
                            day: entry.day,
                            startPeriod: entry.startPeriod,
                            endPeriod: entry.endPeriod,
                            location: entry.location,
                          })}
                        >
                          <Text
                            style={[styles.blockTitle, { color: entry.textColor }]}
                            numberOfLines={3}
                          >
                            {entry.courseName}
                          </Text>
                          <Text style={styles.blockMeta} numberOfLines={1}>{entry.location}</Text>
                        </PressableScale>
                      ))}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.courseListHeader}>
              <Text style={styles.courseListTitle}>담은 강의 목록</Text>
              <Text style={styles.courseListMeta}>{totalCredits}/{MAX_TIMETABLE_CREDITS}학점</Text>
            </View>
            {message ? <Text style={styles.messageText}>{message}</Text> : null}

            <View style={styles.courseList}>
              {cartCourses.map((course) => {
                const isSelected = selectedIds.includes(String(course.id));
                const accent = getCourseScopeColor(course, user?.department);
                const slotText = formatSlotText(course.slots);
                return (
                  <View
                    key={`course-${course.id}`}
                    style={[styles.courseCard, isSelected ? styles.courseCardSelected : null]}
                  >
                    <View style={[styles.courseStripe, { backgroundColor: accent }]} />
                    <PressableScale
                      style={styles.courseToggleArea}
                      onPress={() => navigation.navigate({ name: 'CourseCollection', courseId: course.id })}
                    >
                      <View style={styles.courseCopy}>
                        <Text style={styles.courseName} numberOfLines={1}>{course.name}</Text>
                        <Text style={styles.courseMeta} numberOfLines={1}>
                          {course.professor} 교수{slotText ? ` · ${slotText}` : ''}
                        </Text>
                        <Text style={styles.courseRating}>★ {course.rating.toFixed(1)} · 리뷰 {course.reviewCount}개</Text>
                      </View>
                    </PressableScale>
                    <Text style={styles.courseCreditText}>{course.credits ?? 3}학점</Text>
                    <PressableScale style={[styles.toggleButton, isSelected ? styles.toggleButtonActive : null]} onPress={() => handleToggleCourse(course)}>
                      <Ionicons name={isSelected ? 'checkmark' : 'add'} size={20} color={isSelected ? '#ffffff' : '#5E6E85'} />
                    </PressableScale>
                    <PressableScale style={styles.removeButton} onPress={() => handleRemoveFromCart(course)}>
                      <Ionicons name="close" size={20} color="#7D8898" />
                    </PressableScale>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {selectedEntry ? (
        <Modal transparent animationType="slide" onRequestClose={() => setSelectedEntry(null)}>
          <Pressable style={styles.sheetOverlay} onPress={() => setSelectedEntry(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetCourseName}>{selectedEntry.courseName}</Text>
            <Text style={styles.sheetProfessor}>{selectedEntry.professor}</Text>
            <View style={styles.sheetInfoList}>
              <View style={styles.sheetInfoRow}>
                <Text style={styles.sheetInfoLabel}>강의실</Text>
                <Text style={styles.sheetInfoValue}>{selectedEntry.location || '미정'}</Text>
              </View>
              <View style={styles.sheetInfoRow}>
                <Text style={styles.sheetInfoLabel}>시간</Text>
                <Text style={styles.sheetInfoValue}>
                  {selectedEntry.day}요일 {formatPeriodRange(selectedEntry.startPeriod, selectedEntry.endPeriod)}
                </Text>
              </View>
            </View>
            <View style={styles.sheetActions}>
              <PressableScale style={styles.sheetReviewButton} onPress={handleViewReviews}>
                <Text style={styles.sheetReviewButtonText}>강의평 보기</Text>
              </PressableScale>
              <PressableScale style={styles.sheetDeleteButton} onPress={handleDeleteFromTimetable}>
                <Text style={styles.sheetDeleteButtonText}>삭제</Text>
              </PressableScale>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function formatSlotText(slots: TimetableSlot[]) {
  return slots.map((slot) => `${slot.day} ${formatPeriodRange(slot.startPeriod, slot.endPeriod)}`).join(' · ');
}

function getCourseScopeColor(course: Course, userDepartment?: string) {
  if (course.type.includes('교양') || course.department.includes('교양')) {
    return COURSE_SCOPE_COLORS.general;
  }
  if (userDepartment && course.department === userDepartment) {
    return COURSE_SCOPE_COLORS.major;
  }
  return COURSE_SCOPE_COLORS.other;
}

function hasConflict(courseId: string, selectedIds: string[], courses: TimetableCourse[]) {
  const course = courses.find((c) => String(c.id) === courseId);
  if (!course) return false;

  const selectedSlots = courses
    .filter((c) => selectedIds.includes(String(c.id)))
    .flatMap((c) => c.slots);

  return course.slots.some((slot) =>
    selectedSlots.some(
      (selectedSlot) =>
        selectedSlot.day === slot.day &&
        slot.startPeriod <= selectedSlot.endPeriod &&
        selectedSlot.startPeriod <= slot.endPeriod,
    ),
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    gap: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  creditsBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.primary,
  },
  creditsText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: spacing.page,
    paddingBottom: 48,
    gap: spacing.group,
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#111318',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  emptyDesc: {
    color: '#5E6E85',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  boardCard: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeHeaderCell: {
    width: 44,
  },
  dayHeaderText: {
    flex: 1,
    color: '#111318',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  boardBody: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: 44,
  },
  timeCell: {
    height: PERIOD_HEIGHT,
    justifyContent: 'flex-start',
  },
  timeText: {
    color: '#8793a8',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderColor: '#e8edf5',
  },
  gridLine: {
    height: PERIOD_HEIGHT,
    borderTopWidth: 1,
    borderColor: '#edf1f7',
  },
  gridSpacer: {
    height: PERIOD_HEIGHT,
  },
  scheduleBlock: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E8EF',
  },
  blockTitle: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  blockMeta: {
    marginTop: 5,
    color: '#5E6E85',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '600',
  },
  courseListHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: -4,
  },
  courseListTitle: {
    color: '#111318',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  courseListMeta: {
    color: '#8A96AA',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  messageText: {
    marginTop: -12,
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  courseList: {
    borderRadius: spacing.radius,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 92,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,24,39,0.07)',
  },
  courseStripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  courseCardSelected: {
    backgroundColor: colors.surface,
  },
  courseToggleArea: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
  },
  courseCopy: {
    flex: 1,
    gap: 4,
  },
  courseName: {
    color: '#111318',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  courseMeta: {
    color: '#8A96AA',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  courseRating: {
    color: '#A8B4C4',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  courseCreditText: {
    color: '#5E6E85',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.25,
    marginRight: 12,
  },
  toggleButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F1F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  removeButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:                { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: spacing.page, paddingTop: 12 },
  sheetHandle:          { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D9E3', alignSelf: 'center', marginBottom: 20 },
  sheetCourseName:      { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.4, lineHeight: 24 },
  sheetProfessor:       { marginTop: 4, color: colors.textSecondary, fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  sheetInfoList:        { marginTop: 20, gap: 10 },
  sheetInfoRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetInfoLabel:       { width: 44, color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  sheetInfoValue:       { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  sheetActions:         { marginTop: 24, flexDirection: 'row', gap: 10 },
  sheetReviewButton:    { flex: 1, minHeight: 50, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sheetReviewButtonText:{ color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  sheetDeleteButton:    { minHeight: 50, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#F4F7FB', alignItems: 'center', justifyContent: 'center' },
  sheetDeleteButtonText:{ color: '#E0404A', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
});
