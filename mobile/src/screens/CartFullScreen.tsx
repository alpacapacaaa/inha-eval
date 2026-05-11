import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatePanel } from '../components/ui';
import { getAllCourses } from '../lib/api/courses';
import { loadTimetableCartIds, saveTimetableCartIds } from '../lib/storage/timetableStorage';
import { TIMETABLE_BY_COURSE_ID } from '../lib/timetableData';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

const BLOCK_COLORS = ['#dfe9ff', '#e2f4ea', '#efe4ff', '#fff0cf', '#e7f0ff', '#dff5f3'];
const BLOCK_TEXT_COLORS = ['#16499a', '#226d68', '#7655b8', '#8a5a28', '#24548f', '#1a6c68'];

export function CartFullScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const [courses, ids] = await Promise.all([getAllCourses(), loadTimetableCartIds()]);
        if (!isActive) return;
        setAllCourses(courses);
        setCartIds(ids);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();
    return () => { isActive = false; };
  }, []);

  const cartCourses = useMemo(
    () => allCourses.filter((c) => cartIds.includes(String(c.id))),
    [allCourses, cartIds],
  );

  const handleRemove = useCallback(async (courseId: number) => {
    const nextIds = cartIds.filter((id) => id !== String(courseId));
    setCartIds(nextIds);
    await saveTimetableCartIds(nextIds);
  }, [cartIds]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.loadingState}>
          <StatePanel label="보관함을 불러오는 중입니다." loading />
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
        <Text style={styles.headerTitle}>보관한 강의</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{cartCourses.length}개</Text>
        </View>
      </View>

      <FlatList
        data={cartCourses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <View style={styles.emptyIconInner} />
            </View>
            <Text style={styles.emptyTitle}>보관한 강의가 없어요</Text>
            <Text style={styles.emptyDesc}>강의 카드뉴스에서 담기 버튼을 눌러보세요.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <CourseRow
            course={item}
            index={index}
            onPress={() => navigation.navigate({ name: 'CourseDetail', courseId: item.id })}
            onRemove={() => handleRemove(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

function CourseRow({
  course,
  index,
  onPress,
  onRemove,
}: {
  course: Course;
  index: number;
  onPress: () => void;
  onRemove: () => void;
}) {
  const slots = TIMETABLE_BY_COURSE_ID[String(course.id)] ?? [];
  const slotLabel = slots.length > 0
    ? slots.map((s) => `${s.day} ${s.startPeriod}-${s.endPeriod}교시`).join(', ')
    : '시간표 미등록';

  const accentColor = BLOCK_TEXT_COLORS[index % BLOCK_TEXT_COLORS.length];
  const bgColor = BLOCK_COLORS[index % BLOCK_COLORS.length];

  return (
    <PressableScale style={styles.row} onPress={onPress}>
      <View style={[styles.rowColor, { backgroundColor: bgColor }]}>
        <View style={[styles.rowColorDot, { backgroundColor: accentColor }]} />
      </View>

      <View style={styles.rowCopy}>
        <Text style={styles.rowName} numberOfLines={1}>{course.name}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>{course.professor} 교수 · {course.department}</Text>
        <Text style={styles.rowSlot} numberOfLines={1}>{slotLabel}</Text>
      </View>

      <View style={styles.rowRight}>
        <View style={styles.ratingPill}>
          <Text style={[styles.ratingText, { color: accentColor }]}>★ {course.rating.toFixed(1)}</Text>
        </View>
        <PressableScale
          style={styles.removeButton}
          onPress={onRemove}
          hitSlop={8}
        >
          <View style={styles.removeLine1} />
          <View style={styles.removeLine2} />
        </PressableScale>
      </View>
    </PressableScale>
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
  countBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.primary,
  },
  countText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  list: {
    paddingHorizontal: spacing.page,
    paddingTop: 4,
    gap: 0,
  },
  separator: {
    height: 10,
  },
  emptyState: {
    marginTop: 72,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconInner: {
    width: 28,
    height: 36,
    borderWidth: 2.5,
    borderColor: colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 0,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  emptyDesc: {
    color: '#65738a',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
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
  rowColor: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowColorDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  rowCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  rowName: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  rowMeta: {
    color: '#65738a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: -0.25,
  },
  rowSlot: {
    color: '#8fa3bc',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 10,
    flexShrink: 0,
  },
  ratingPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f0f4fb',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f5f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeLine1: {
    position: 'absolute',
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#8fa3bc',
    transform: [{ rotate: '45deg' }],
  },
  removeLine2: {
    position: 'absolute',
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#8fa3bc',
    transform: [{ rotate: '-45deg' }],
  },
});
