import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatePanel } from '../components/ui';
import { getAllCourses } from '../lib/api/courses';
import { loadSelectedTimetableIds, loadTimetableCartIds } from '../lib/storage/timetableStorage';
import {
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

type TimetableCourse = Course & { slots: TimetableSlot[] };

const PERIOD_HEIGHT = 58;
const BLOCK_COLORS = ['#dfe9ff', '#e2f4ea', '#efe4ff', '#fff0cf', '#e7f0ff', '#dff5f3'];
const BLOCK_TEXT_COLORS = ['#16499a', '#226d68', '#7655b8', '#8a5a28', '#24548f', '#1a6c68'];

export function TimetableFullScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        slots: TIMETABLE_BY_COURSE_ID[String(course.id)] ?? [],
      })),
    [allCourses],
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
    const maxPeriod = placedEntries.reduce((max, e) => Math.max(max, e.endPeriod), 9);
    return PERIODS.slice(0, maxPeriod);
  }, [placedEntries]);

  const totalCredits = placedCourses.reduce((sum, c) => sum + (c.credits ?? 3), 0);

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
          <View style={styles.backArrow} />
        </PressableScale>
        <Text style={styles.headerTitle}>내 시간표</Text>
        <View style={styles.creditsBadge}>
          <Text style={styles.creditsText}>총 {totalCredits}학점</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {placedCourses.length === 0 ? (
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
                      <Text style={styles.timeText}>{period.time}</Text>
                    </View>
                  ))}
                </View>
                {TIMETABLE_DAYS.map((day) => (
                  <View
                    key={`column-${day}`}
                    style={[styles.dayColumn, { height: visiblePeriods.length * PERIOD_HEIGHT }]}
                  >
                    {visiblePeriods.map((period) => (
                      <View key={`grid-${day}-${period.period}`} style={styles.gridLine} />
                    ))}
                    {placedEntries
                      .filter((entry) => entry.day === day && entry.startPeriod <= visiblePeriods.length)
                      .map((entry) => (
                        <View
                          key={`${entry.courseId}-${day}-${entry.startPeriod}`}
                          style={[
                            styles.scheduleBlock,
                            {
                              top: (entry.startPeriod - 1) * PERIOD_HEIGHT + 4,
                              height:
                                Math.min(entry.endPeriod, visiblePeriods.length) * PERIOD_HEIGHT -
                                (entry.startPeriod - 1) * PERIOD_HEIGHT -
                                8,
                              backgroundColor: entry.backgroundColor,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.blockTitle, { color: entry.textColor }]}
                            numberOfLines={3}
                          >
                            {entry.courseName}
                          </Text>
                          <Text style={styles.blockMeta} numberOfLines={1}>{entry.location}</Text>
                        </View>
                      ))}
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.courseListTitle}>담은 강의 목록</Text>

            <View style={styles.courseList}>
              {placedCourses.map((course, index) => (
                <PressableScale
                  key={`course-${course.id}`}
                  style={styles.courseCard}
                  onPress={() => navigation.navigate({ name: 'CourseDetail', courseId: course.id })}
                >
                  <View style={[styles.courseColor, { backgroundColor: BLOCK_COLORS[index % BLOCK_COLORS.length] }]}>
                    <View style={[styles.courseColorInner, { backgroundColor: BLOCK_TEXT_COLORS[index % BLOCK_TEXT_COLORS.length] }]} />
                  </View>
                  <View style={styles.courseCopy}>
                    <Text style={styles.courseName} numberOfLines={1}>{course.name}</Text>
                    <Text style={styles.courseMeta} numberOfLines={1}>
                      {course.professor} 교수 · {course.slots[0]?.location ?? '강의실 미정'}
                    </Text>
                  </View>
                  <View style={styles.courseCredit}>
                    <Text style={styles.courseCreditText}>{course.credits ?? 3}학점</Text>
                  </View>
                  <View style={styles.courseChevron} />
                </PressableScale>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
  },
  backArrow: {
    width: 9,
    height: 9,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#111827',
    transform: [{ rotate: '45deg' }, { translateX: 2 }],
  },
  headerTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  creditsBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.primary,
  },
  creditsText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
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
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  emptyDesc: {
    color: '#65738a',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  boardCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
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
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
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
    fontWeight: '900',
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
  scheduleBlock: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  blockTitle: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  blockMeta: {
    marginTop: 5,
    color: '#65738a',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
  },
  courseListTitle: {
    color: '#111827',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginBottom: -4,
  },
  courseList: {
    gap: 10,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  courseColor: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseColorInner: {
    width: 14,
    height: 14,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  courseCopy: {
    flex: 1,
    gap: 4,
  },
  courseName: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  courseMeta: {
    color: '#65738a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: -0.25,
  },
  courseCredit: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#eef4ff',
  },
  courseCreditText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  courseChevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: '#8f9caf',
    transform: [{ rotate: '45deg' }],
  },
});
