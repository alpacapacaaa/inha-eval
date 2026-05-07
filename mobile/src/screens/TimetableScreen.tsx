import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

type TimetableCourse = Course & {
  slots: TimetableSlot[];
};

const PERIOD_HEIGHT = 46;
const BLOCK_COLORS = ['#16499a', '#226d68', '#d84f41', '#8a5a28', '#243b53', '#52616b'];

export function TimetableScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

        if (!isActive) {
          return;
        }

        const initialCartIds = storedCartIds.length > 0 ? storedCartIds : TIMETABLE_STARTER_CART_IDS;
        const initialSelectedIds =
          storedSelectedIds.length > 0 ? storedSelectedIds : TIMETABLE_STARTER_SELECTED_IDS;

        setAllCourses(courses);
        setCartIds(initialCartIds);
        setSelectedIds(initialSelectedIds.filter((id) => initialCartIds.includes(id)));

        if (storedCartIds.length === 0) {
          await saveTimetableCartIds(initialCartIds);
        }
        if (storedSelectedIds.length === 0) {
          await saveSelectedTimetableIds(initialSelectedIds);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, []);

  const timetableCourses = useMemo<TimetableCourse[]>(
    () =>
      allCourses.map((course) => ({
        ...course,
        slots: TIMETABLE_BY_COURSE_ID[String(course.id)] ?? [],
      })),
    [allCourses],
  );

  const cartCourses = useMemo(
    () =>
      timetableCourses
        .filter((course) => cartIds.includes(String(course.id)))
        .sort((a, b) => {
          const aPlaced = selectedIds.includes(String(a.id));
          const bPlaced = selectedIds.includes(String(b.id));
          if (aPlaced !== bPlaced) {
            return aPlaced ? -1 : 1;
          }
          return b.rating - a.rating;
        }),
    [cartIds, selectedIds, timetableCourses],
  );

  const placedCourses = useMemo(
    () => cartCourses.filter((course) => selectedIds.includes(String(course.id))),
    [cartCourses, selectedIds],
  );

  const candidateCourses = useMemo(
    () =>
      timetableCourses
        .filter((course) => !cartIds.includes(String(course.id)) && course.slots.length > 0)
        .slice(0, 12),
    [cartIds, timetableCourses],
  );

  const placedEntries = useMemo(
    () =>
      placedCourses.flatMap((course, index) =>
        course.slots.map((slot) => ({
          ...slot,
          color: BLOCK_COLORS[index % BLOCK_COLORS.length],
          courseId: String(course.id),
          courseName: course.name,
          professor: course.professor,
        })),
      ),
    [placedCourses],
  );

  const maxPeriod = Math.max(10, ...placedEntries.map((entry) => entry.endPeriod), 10);
  const boardPeriods = PERIODS.filter((period) => period.period <= maxPeriod);
  const totalCredits = placedCourses.reduce((sum, course) => sum + (course.credits ?? 3), 0);
  const conflicts = getConflicts(placedEntries);

  const persistCartIds = async (nextIds: string[]) => {
    setCartIds(nextIds);
    await saveTimetableCartIds(nextIds);
  };

  const persistSelectedIds = async (nextIds: string[]) => {
    setSelectedIds(nextIds);
    await saveSelectedTimetableIds(nextIds);
  };

  const addToCart = async (courseId: string) => {
    const nextCartIds = cartIds.includes(courseId) ? cartIds : [...cartIds, courseId];
    await persistCartIds(nextCartIds);
    setMessage('보관함에 담았어요.');
  };

  const removeFromCart = async (courseId: string) => {
    const nextCartIds = cartIds.filter((id) => id !== courseId);
    const nextSelectedIds = selectedIds.filter((id) => id !== courseId);
    await persistCartIds(nextCartIds);
    await persistSelectedIds(nextSelectedIds);
    setMessage('보관함에서 뺐어요.');
  };

  const placeCourse = async (courseId: string) => {
    if (selectedIds.includes(courseId)) {
      await persistSelectedIds(selectedIds.filter((id) => id !== courseId));
      setMessage('시간표에서 내렸어요.');
      return;
    }

    if (hasConflict(courseId, selectedIds, timetableCourses)) {
      setMessage('겹치는 시간이 있어 올릴 수 없어요.');
      return;
    }

    await persistSelectedIds([...selectedIds, courseId]);
    setMessage('시간표에 올렸어요.');
  };

  const placeAll = async () => {
    const nextSelectedIds = [...selectedIds];
    let placed = 0;

    cartCourses.forEach((course) => {
      const id = String(course.id);
      if (nextSelectedIds.includes(id)) {
        return;
      }
      if (hasConflict(id, nextSelectedIds, timetableCourses)) {
        return;
      }
      nextSelectedIds.push(id);
      placed += 1;
    });

    await persistSelectedIds(nextSelectedIds);
    setMessage(placed > 0 ? `${placed}개 강의를 올렸어요.` : '올릴 수 있는 강의가 없어요.');
  };

  const clearPlaced = async () => {
    await persistSelectedIds([]);
    setMessage('시간표를 비웠어요.');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>시간표 보관함을 정리하는 중입니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.group }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => navigation.onTabScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Time.</Text>
          <Text style={styles.title}>담은 강의로 시간표를 만듭니다</Text>
          <Text style={styles.description}>
            큐레이션에서 고른 강의를 올리고, 겹치는 시간과 학점을 바로 확인하세요.
          </Text>
        </View>

        <View style={styles.summaryStrip}>
          <SummaryItem value={`${cartCourses.length}`} label="보관함" />
          <SummaryItem value={`${placedCourses.length}`} label="시간표" />
          <SummaryItem value={`${totalCredits}`} label="학점" />
          <SummaryItem value={`${conflicts.length}`} label="충돌" danger={conflicts.length > 0} />
        </View>

        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.darkButton, pressed ? styles.buttonPressed : null]}
            onPress={placeAll}
          >
            <Text style={styles.darkButtonText}>겹치지 않게 올리기</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.lightButton, pressed ? styles.buttonPressed : null]}
            onPress={clearPlaced}
          >
            <Text style={styles.lightButtonText}>비우기</Text>
          </Pressable>
        </View>

        <TimetableBoard entries={placedEntries} periods={boardPeriods} />

        {conflicts.length > 0 ? (
          <View style={styles.conflictBox}>
            {conflicts.map((conflict) => (
              <Text key={conflict} style={styles.conflictText}>{conflict}</Text>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>보관함</Text>
          <Text style={styles.sectionMeta}>{cartCourses.length}개</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cartRail}>
          {cartCourses.length === 0 ? (
            <View style={styles.emptyShelf}>
              <Text style={styles.emptyShelfText}>담긴 강의가 없습니다.</Text>
            </View>
          ) : (
            cartCourses.map((course) => {
              const id = String(course.id);
              const placed = selectedIds.includes(id);
              const conflict = !placed && hasConflict(id, selectedIds, timetableCourses);
              return (
                <CourseShelfCard
                  key={`cart-${course.id}`}
                  course={course}
                  placed={placed}
                  conflict={conflict}
                  onPlace={() => placeCourse(id)}
                  onRemove={() => removeFromCart(id)}
                />
              );
            })
          )}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>강의 더 담기</Text>
          <Text style={styles.sectionMeta}>시간 정보 있는 강의</Text>
        </View>

        <View style={styles.candidateList}>
          {candidateCourses.map((course) => (
            <Pressable
              key={`candidate-${course.id}`}
              accessibilityRole="button"
              style={({ pressed }) => [styles.candidateCard, pressed ? styles.buttonPressed : null]}
              onPress={() => addToCart(String(course.id))}
            >
              <View style={styles.candidateTextBlock}>
                <Text style={styles.candidateName} numberOfLines={1}>{course.name}</Text>
                <Text style={styles.candidateMeta} numberOfLines={1}>
                  {course.professor} · {course.department}
                </Text>
              </View>
              <Text style={styles.addText}>담기</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({ value, label, danger = false }: { value: string; label: string; danger?: boolean }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, danger ? styles.summaryValueDanger : null]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function TimetableBoard({
  entries,
  periods,
}: {
  entries: Array<TimetableSlot & { color: string; courseId: string; courseName: string; professor: string }>;
  periods: typeof PERIODS;
}) {
  const boardHeight = periods.length * PERIOD_HEIGHT;

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
          {periods.map((period) => (
            <View key={`period-${period.period}`} style={styles.timeCell}>
              <Text style={styles.periodText}>{period.period}</Text>
              <Text style={styles.timeText}>{period.time}</Text>
            </View>
          ))}
        </View>
        {TIMETABLE_DAYS.map((day) => (
          <View key={`column-${day}`} style={[styles.dayColumn, { height: boardHeight }]}>
            {periods.map((period) => (
              <View key={`grid-${day}-${period.period}`} style={styles.gridLine} />
            ))}
            {entries
              .filter((entry) => entry.day === day)
              .map((entry) => (
                <View
                  key={`${entry.courseId}-${day}-${entry.startPeriod}`}
                  style={[
                    styles.scheduleBlock,
                    {
                      top: (entry.startPeriod - 1) * PERIOD_HEIGHT + 3,
                      height: (entry.endPeriod - entry.startPeriod + 1) * PERIOD_HEIGHT - 6,
                      backgroundColor: entry.color,
                    },
                  ]}
                >
                  <Text style={styles.blockTitle} numberOfLines={2}>{entry.courseName}</Text>
                  <Text style={styles.blockMeta} numberOfLines={1}>{entry.location}</Text>
                </View>
              ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function CourseShelfCard({
  course,
  placed,
  conflict,
  onPlace,
  onRemove,
}: {
  course: TimetableCourse;
  placed: boolean;
  conflict: boolean;
  onPlace: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.shelfCard, placed ? styles.shelfCardPlaced : null]}>
      <Text style={styles.shelfBadge}>{course.category || course.type || '강의'}</Text>
      <Text style={styles.shelfName} numberOfLines={2}>{course.name}</Text>
      <Text style={styles.shelfMeta} numberOfLines={1}>{course.professor} · {course.credits ?? 3}학점</Text>
      <Text style={[styles.shelfStatus, conflict ? styles.shelfStatusDanger : null]}>
        {placed ? '시간표에 올라감' : conflict ? '시간 겹침' : '올릴 수 있음'}
      </Text>
      <View style={styles.shelfActions}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.placeButton,
            conflict && !placed ? styles.placeButtonDisabled : null,
            pressed && !(conflict && !placed) ? styles.buttonPressed : null,
          ]}
          onPress={onPlace}
          disabled={conflict && !placed}
        >
          <Text style={styles.placeButtonText}>{placed ? '내리기' : '올리기'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.removeButton, pressed ? styles.buttonPressed : null]}
          onPress={onRemove}
        >
          <Text style={styles.removeButtonText}>빼기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function hasConflict(courseId: string, selectedIds: string[], courses: TimetableCourse[]) {
  const course = courses.find((item) => String(item.id) === courseId);
  if (!course) {
    return false;
  }

  const selectedSlots = courses
    .filter((item) => selectedIds.includes(String(item.id)))
    .flatMap((item) => item.slots);

  return course.slots.some((slot) =>
    selectedSlots.some(
      (selectedSlot) =>
        selectedSlot.day === slot.day &&
        slot.startPeriod <= selectedSlot.endPeriod &&
        selectedSlot.startPeriod <= slot.endPeriod,
    ),
  );
}

function getConflicts(entries: Array<TimetableSlot & { courseName: string }>) {
  return entries.flatMap((entry, index) =>
    entries.slice(index + 1).flatMap((other) => {
      const overlaps =
        entry.day === other.day &&
        entry.startPeriod <= other.endPeriod &&
        other.startPeriod <= entry.endPeriod;
      return overlaps ? [`${entry.day} ${entry.courseName} · ${other.courseName} 시간이 겹칩니다.`] : [];
    }),
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9fd',
  },
  content: {
    paddingBottom: 112,
    gap: spacing.group,
  },
  header: {
    paddingHorizontal: spacing.page,
    alignItems: 'flex-start',
    gap: 8,
  },
  kicker: {
    color: '#65738a',
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    color: '#121826',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    maxWidth: 330,
  },
  description: {
    color: '#65738a',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'left',
    maxWidth: 330,
  },
  summaryStrip: {
    marginHorizontal: spacing.page,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.58)',
    flexDirection: 'row',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    shadowColor: '#16499a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryValue: {
    color: '#121826',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  summaryValueDanger: {
    color: '#d84f41',
  },
  summaryLabel: {
    color: '#7b879a',
    fontSize: 10,
    fontWeight: '800',
  },
  messageText: {
    marginHorizontal: spacing.page,
    color: '#16499a',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.related,
    paddingHorizontal: spacing.page,
  },
  darkButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(18,24,38,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#121826',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
  },
  darkButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  lightButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  lightButtonText: {
    color: '#121826',
    fontSize: 13,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.985 }],
  },
  boardCard: {
    marginHorizontal: spacing.page,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: 12,
    shadowColor: '#16499a',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeHeaderCell: {
    width: 38,
  },
  dayHeaderText: {
    flex: 1,
    color: '#121826',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  boardBody: {
    flexDirection: 'row',
  },
  timeColumn: {
    width: 38,
  },
  timeCell: {
    height: PERIOD_HEIGHT,
    justifyContent: 'flex-start',
  },
  periodText: {
    color: '#121826',
    fontSize: 10,
    fontWeight: '900',
  },
  timeText: {
    color: '#a0a0a7',
    fontSize: 8,
    fontWeight: '700',
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderColor: '#eef1f6',
  },
  gridLine: {
    height: PERIOD_HEIGHT,
    borderTopWidth: 1,
    borderColor: '#eef1f6',
  },
  scheduleBlock: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  blockTitle: {
    color: '#ffffff',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
  },
  blockMeta: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 7,
    fontWeight: '800',
  },
  conflictBox: {
    marginHorizontal: spacing.page,
    borderRadius: 18,
    backgroundColor: 'rgba(216,79,65,0.08)',
    padding: spacing.related,
    gap: 5,
  },
  conflictText: {
    color: '#d84f41',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    paddingHorizontal: spacing.page,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#121826',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  sectionMeta: {
    color: '#96969d',
    fontSize: 11,
    fontWeight: '800',
  },
  cartRail: {
    paddingHorizontal: spacing.page,
    gap: spacing.related,
  },
  emptyShelf: {
    width: 220,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    padding: spacing.page,
  },
  emptyShelfText: {
    color: '#7b879a',
    fontSize: 13,
    fontWeight: '800',
  },
  shelfCard: {
    width: 184,
    minHeight: 190,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    padding: 16,
    gap: 8,
  },
  shelfCardPlaced: {
    backgroundColor: 'rgba(232,242,255,0.76)',
  },
  shelfBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: '#16499a',
    fontSize: 10,
    fontWeight: '900',
  },
  shelfName: {
    color: '#121826',
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  shelfMeta: {
    color: '#65738a',
    fontSize: 12,
    fontWeight: '800',
  },
  shelfStatus: {
    color: '#226d68',
    fontSize: 11,
    fontWeight: '900',
  },
  shelfStatusDanger: {
    color: '#d84f41',
  },
  shelfActions: {
    marginTop: 'auto',
    flexDirection: 'row',
    gap: 8,
  },
  placeButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(18,24,38,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    paddingVertical: 10,
  },
  placeButtonDisabled: {
    backgroundColor: '#52616b',
  },
  placeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  removeButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  removeButtonText: {
    color: '#65738a',
    fontSize: 12,
    fontWeight: '900',
  },
  candidateList: {
    paddingHorizontal: spacing.page,
    gap: spacing.tight,
  },
  candidateCard: {
    minHeight: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.related,
  },
  candidateTextBlock: {
    flex: 1,
    gap: 3,
  },
  candidateName: {
    color: '#121826',
    fontSize: 15,
    fontWeight: '900',
  },
  candidateMeta: {
    color: '#7b879a',
    fontSize: 12,
    fontWeight: '700',
  },
  addText: {
    color: '#16499a',
    fontSize: 13,
    fontWeight: '900',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.related,
  },
  loadingText: {
    color: '#65738a',
    fontSize: 14,
    fontWeight: '800',
  },
});
