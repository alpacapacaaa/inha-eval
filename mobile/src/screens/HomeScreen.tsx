import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoursePosterCard } from '../components/CoursePosterCard';
import { PressableScale, StatePanel } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import {
  getFamousCourses,
  getGrowthCourses,
  getHoneyGeCourses,
  getVerifiedCourses,
} from '../lib/api/courses';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

type CurationKey = 'growth' | 'famous' | 'honey' | 'verified';

type HomeListItem =
  | { type: 'header'; id: 'header' }
  | { type: 'course'; id: string; course: Course; index: number };

const curationCards: {
  id: CurationKey;
  title: string;
  caption: string;
  tone: string;
  accent: string;
  reason: string;
}[] = [
  { id: 'growth',   title: '이번 학기\n평점이 오른 강의', caption: '업 트렌드',    tone: '#dff6e9', accent: '#35a86b', reason: '평점 상승 중' },
  { id: 'famous',   title: '학생들이 많이\n담은 강의',     caption: '인기 강의',    tone: '#eee9ff', accent: '#8f6bea', reason: '학생들의 선택' },
  { id: 'honey',    title: '교양 꿀강의\n모음',            caption: '교양 추천',    tone: '#fff2d8', accent: '#f2a93b', reason: '교양 꿀강의' },
  { id: 'verified', title: '리뷰 많은\n검증된 강의',       caption: '검증된 강의',  tone: '#ffe8ec', accent: '#e85b73', reason: '검증된 강의' },
];

const CURATION_FETCH: Record<CurationKey, () => Promise<Course[]>> = {
  growth:   getGrowthCourses,
  famous:   getFamousCourses,
  honey:    getHoneyGeCourses,
  verified: getVerifiedCourses,
};

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [famousCourses, setFamousCourses] = useState<Course[]>([]);
  const [honeyCourses, setHoneyCourses] = useState<Course[]>([]);
  const [verifiedCourses, setVerifiedCourses] = useState<Course[]>([]);
  const [growthCourses, setGrowthCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedCuration, setSelectedCuration] = useState<CurationKey | null>(null);
  const [curationCourses, setCurationCourses] = useState<Course[]>([]);
  const [curationLoading, setCurationLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadHighlights = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [famous, honey, verified, growth] = await Promise.all([
          getFamousCourses(),
          getHoneyGeCourses(),
          getVerifiedCourses(),
          getGrowthCourses(),
        ]);

        if (!isActive) return;

        setFamousCourses(famous.slice(0, 10));
        setHoneyCourses(honey.slice(0, 10));
        setVerifiedCourses(verified.slice(0, 10));
        setGrowthCourses(growth.slice(0, 10));
      } catch (error) {
        if (!isActive) return;
        setErrorMessage(error instanceof Error ? error.message : '메인 피드를 불러오지 못했습니다.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadHighlights();

    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!selectedCuration) {
      setCurationCourses([]);
      return;
    }

    let isActive = true;
    setCurationLoading(true);
    setCurationCourses([]);

    CURATION_FETCH[selectedCuration]()
      .then((courses) => { if (isActive) setCurationCourses(courses); })
      .catch(() => { if (isActive) setCurationCourses([]); })
      .finally(() => { if (isActive) setCurationLoading(false); });

    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    return () => { isActive = false; };
  }, [selectedCuration]);

  const mergedCourses = useMemo(() => {
    const seen = new Set<number>();
    return [...growthCourses, ...famousCourses, ...honeyCourses, ...verifiedCourses]
      .filter((course) => {
        if (seen.has(course.id)) return false;
        seen.add(course.id);
        return true;
      })
      .sort((a, b) => getCourseWeight(b) - getCourseWeight(a))
      .slice(0, 12);
  }, [famousCourses, growthCourses, honeyCourses, verifiedCourses]);

  const heroCourse = useMemo(() => {
    if (mergedCourses.length === 0) return undefined;
    const heroPool = mergedCourses.filter((c) => !isOtherMajor(c, user?.department));
    const candidates = (heroPool.length > 0 ? heroPool : mergedCourses).slice(0, 5);
    return candidates[getTodaySeed() % candidates.length];
  }, [mergedCourses, user?.department]);

  const heroReason = getAutoReason(heroCourse, growthCourses, honeyCourses, verifiedCourses);

  const userName = isAuthenticated && user ? user.nickname : '게스트';

  const listCourses = selectedCuration
    ? curationCourses
    : mergedCourses.filter((c) => c.id !== heroCourse?.id).slice(0, 7);

  const items = useMemo<HomeListItem[]>(
    () => [
      { type: 'header', id: 'header' },
      ...listCourses.map((course, index) => ({
        type: 'course' as const,
        id: `course-${course.id}`,
        course,
        index,
      })),
    ],
    [listCourses],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <FlatList
        ref={flatListRef}
        data={isLoading || errorMessage ? [{ type: 'header' as const, id: 'header' as const }] : items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.group }]}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <HomeHeader
                userName={userName}
                heroCourse={heroCourse}
                heroReason={heroReason}
                isLoading={isLoading}
                errorMessage={errorMessage}
                selectedCuration={selectedCuration}
                curationLoading={curationLoading}
                navigation={navigation}
                onSelectCuration={(id) =>
                  setSelectedCuration((prev) => (prev === id ? null : id))
                }
              />
            );
          }

          return (
            <View style={styles.courseRow}>
              <CoursePosterCard
                course={item.course}
                variant="medium"
                index={item.index}
                userDepartment={user?.department}
                onPress={() => navigation.navigate({ name: 'CourseCollection', courseId: item.course.id })}
              />
            </View>
          );
        }}
        onScroll={(event) => navigation.onTabScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function HomeHeader({
  userName,
  heroCourse,
  heroReason,
  isLoading,
  errorMessage,
  selectedCuration,
  curationLoading,
  navigation,
  onSelectCuration,
}: {
  userName: string;
  heroCourse?: Course;
  heroReason: string;
  isLoading: boolean;
  errorMessage: string;
  selectedCuration: CurationKey | null;
  curationLoading: boolean;
  navigation: AppNavigation;
  onSelectCuration: (id: CurationKey) => void;
}) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.topGreeting}>
        <View>
          <Text style={styles.greetingTitle}>안녕하세요, {userName}님</Text>
          <Text style={styles.greetingSubtitle}>오늘도 좋은 강의로 채워보세요.</Text>
        </View>
        <PressableScale style={styles.noticeButton} onPress={() => navigation.navigate({ name: 'Notifications' })}>
          <BellIcon />
        </PressableScale>
      </View>

      {isLoading ? <StatePanel label="추천 강의를 고르는 중입니다." loading /> : null}
      {!isLoading && errorMessage ? <StatePanel label={errorMessage} error /> : null}

      {!isLoading && !errorMessage && heroCourse ? (
        <PressableScale
          style={styles.heroCard}
          onPress={() => navigation.navigate({ name: 'CourseCollection', courseId: heroCourse.id })}
        >
          <View style={styles.heroCopy}>
            <View style={styles.heroReasonRow}>
              <Text style={styles.sectionAccent}>오늘의 추천</Text>
              <View style={styles.reasonBadge}>
                <Text style={styles.reasonBadgeText}>{heroReason}</Text>
              </View>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{heroCourse.name}</Text>
            <Text style={styles.heroMeta} numberOfLines={1}>
              {heroCourse.professor} 교수 · {heroCourse.department}
            </Text>
            <View style={styles.heroTags}>
              {heroCourse.type ? <Text style={styles.heroTag}>{heroCourse.type}</Text> : null}
              <Text style={styles.heroTag}>후기 {heroCourse.reviewCount}개</Text>
              <Text style={styles.heroTag}>★ {heroCourse.rating.toFixed(1)}</Text>
            </View>
          </View>
          <View style={styles.heroVisual}>
            <View style={styles.codeTile}>
              <Text style={styles.codeTileText}>★</Text>
            </View>
            <View style={styles.visualBase} />
          </View>
        </PressableScale>
      ) : null}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>추천 큐레이션</Text>
        {selectedCuration ? (
          <PressableScale onPress={() => onSelectCuration(selectedCuration)}>
            <Text style={styles.resetText}>전체 보기</Text>
          </PressableScale>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.curationRail}
      >
        {curationCards.map((card) => {
          const isActive = selectedCuration === card.id;
          return (
            <PressableScale
              key={card.id}
              style={[styles.curationCard, isActive && styles.curationCardActive]}
              onPress={() => onSelectCuration(card.id)}
            >
              <View style={[styles.curationIcon, { backgroundColor: isActive ? `${card.accent}22` : card.tone }]}>
                <View style={[styles.curationIconGlyph, { backgroundColor: card.accent }]} />
              </View>
              <Text style={[styles.curationTitle, isActive && { color: card.accent }]}>{card.title}</Text>
              <Text style={styles.curationCount}>{card.caption}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {!isLoading && !errorMessage ? (
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {selectedCuration
              ? (curationCards.find((c) => c.id === selectedCuration)?.caption ?? '추천 강의')
              : '지금 인기 있는 강의'}
          </Text>
          {curationLoading ? (
            <Text style={styles.loadingText}>불러오는 중...</Text>
          ) : !selectedCuration ? (
            <PressableScale style={styles.moreButton} onPress={() => navigation.switchTab('Search')}>
              <Text style={styles.moreText}>더보기</Text>
              <View style={styles.moreChevron} />
            </PressableScale>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function BellIcon() {
  return (
    <View style={styles.bellIcon}>
      <View style={styles.bellBody} />
      <View style={styles.bellClapper} />
    </View>
  );
}

function isOtherMajor(course: Course, userDepartment?: string): boolean {
  const isGeneral = course.type.includes('교양') || course.department.includes('교양');
  if (isGeneral) return false;
  if (userDepartment && course.department === userDepartment) return false;
  return true;
}

function getTodaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getCourseWeight(course: Course) {
  return course.rating * 20 + Math.min(course.reviewCount, 200) * 0.7;
}

function getAutoReason(
  course: Course | undefined,
  growthCourses: Course[],
  honeyCourses: Course[],
  verifiedCourses: Course[],
): string {
  if (!course) return '추천 강의';
  if (growthCourses.some((c) => c.id === course.id)) return '평점 상승 중';
  if (honeyCourses.some((c) => c.id === course.id)) return '교양 꿀강의';
  if (verifiedCourses.some((c) => c.id === course.id)) return '검증된 강의';
  return '학생들의 선택';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 112,
  },
  headerWrap: {
    gap: 26,
  },
  topGreeting: {
    paddingHorizontal: spacing.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingTitle: {
    color: '#111827',
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  greetingSubtitle: {
    marginTop: 8,
    color: '#7a8495',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  noticeButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
  },
  bellIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBody: {
    width: 16,
    height: 17,
    borderWidth: 2,
    borderColor: '#111827',
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomWidth: 1,
  },
  bellClapper: {
    width: 7,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#111827',
    marginTop: -1,
  },
  heroCard: {
    marginHorizontal: spacing.page,
    minHeight: 224,
    borderRadius: 28,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.09,
    shadowRadius: 34,
  },
  heroCopy: {
    flex: 1,
    gap: 13,
  },
  heroReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sectionAccent: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  reasonBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: colors.primarySoft,
  },
  reasonBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroTitle: {
    color: '#111827',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  heroMeta: {
    color: '#65738a',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  heroTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroTag: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#e9f1ff',
    color: '#526783',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  heroVisual: {
    width: 122,
    height: 122,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf4ff',
    marginLeft: 18,
  },
  codeTile: {
    width: 64,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7da7e8',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    zIndex: 2,
  },
  codeTileText: {
    color: '#eaf2ff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  visualBase: {
    position: 'absolute',
    width: 86,
    height: 22,
    borderRadius: 10,
    backgroundColor: '#d9e6f8',
    bottom: 28,
  },
  sectionRow: {
    paddingHorizontal: spacing.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.65,
  },
  curationRail: {
    paddingHorizontal: spacing.page,
    gap: 14,
    paddingBottom: 2,
  },
  curationCard: {
    width: 136,
    minHeight: 158,
    borderRadius: 20,
    padding: 18,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
  },
  curationCardActive: {
    borderColor: 'rgba(22,73,154,0.22)',
    shadowOpacity: 0.13,
  },
  resetText: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  loadingText: {
    color: '#9aa5b8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  curationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  curationIconGlyph: {
    width: 18,
    height: 18,
    borderRadius: 6,
  },
  curationTitle: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  curationCount: {
    color: '#7a8495',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  moreText: {
    color: '#8a96aa',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  moreChevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: '#8a96aa',
    transform: [{ rotate: '45deg' }],
  },
  courseRow: {
    paddingHorizontal: spacing.page,
    marginBottom: 14,
  },
});
