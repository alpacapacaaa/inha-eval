import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const curationCards: {
  id: CurationKey;
  title: string;
  caption: string;
  accent: string;
  background: string;
}[] = [
  { id: 'growth', title: '평점 상승', caption: '최근 반응 좋은 강의', accent: '#23A9FF', background: '#EAF7FF' },
  { id: 'famous', title: '인기 강의', caption: '학생들이 많이 본 강의', accent: '#23A9FF', background: '#F4F8FC' },
  { id: 'honey', title: '교양 추천', caption: '가볍게 둘러볼 교양', accent: '#226D68', background: '#EAF6F0' },
  { id: 'verified', title: '후기 많은', caption: '정보가 충분한 강의', accent: '#23A9FF', background: '#F4F8FC' },
];

const CURATION_FETCH: Record<CurationKey, () => Promise<Course[]>> = {
  growth: getGrowthCourses,
  famous: getFamousCourses,
  honey: getHoneyGeCourses,
  verified: getVerifiedCourses,
};

const HOME_GROWTH_ILLUSTRATIONS = [
  require('../../assets/home-growth-seed.png'),
  require('../../assets/home-growth-sprout.png'),
  require('../../assets/home-growth-leaf.png'),
  require('../../assets/home-growth-tree.png'),
  require('../../assets/home-growth-forest.png'),
] as const;
const HOME_BUTTERFLY_SPRITES = {
  blue: require('../../assets/home-butterfly-blue.png'),
  red: require('../../assets/home-butterfly-red.png'),
  yellow: require('../../assets/home-butterfly-yellow.png'),
  orange: require('../../assets/home-butterfly-orange.png'),
} as const;

const HOME_GRADE_LEVELS = [
  { name: '씨앗', minPoints: 0 },
  { name: '새싹', minPoints: 100 },
  { name: '잎새', minPoints: 300 },
  { name: '나무', minPoints: 700 },
  { name: '숲', minPoints: 1200 },
] as const;

const HOME_GROWTH_SUFFIX: Record<(typeof HOME_GRADE_LEVELS)[number]['name'], string> = {
  씨앗: '을 키워요',
  새싹: '을 키워요',
  잎새: '를 키워요',
  나무: '를 키워요',
  숲: '을 가꿔요',
};

function getHomeGradeInfo(points: number) {
  const safePoints = Math.max(0, points);
  const currentIndex = HOME_GRADE_LEVELS.reduce((current, grade, index) => (
    safePoints >= grade.minPoints ? index : current
  ), 0);
  const current = HOME_GRADE_LEVELS[currentIndex];
  const next = HOME_GRADE_LEVELS[currentIndex + 1] ?? null;
  const progress = next
    ? Math.min(1, (safePoints - current.minPoints) / (next.minPoints - current.minPoints))
    : 1;

  return {
    currentIndex,
    current,
    next,
    progress,
    remainingPoints: next ? Math.max(0, next.minPoints - safePoints) : 0,
  };
}

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [famousCourses, setFamousCourses] = useState<Course[]>([]);
  const [honeyCourses, setHoneyCourses] = useState<Course[]>([]);
  const [verifiedCourses, setVerifiedCourses] = useState<Course[]>([]);
  const [growthCourses, setGrowthCourses] = useState<Course[]>([]);
  const [selectedCuration, setSelectedCuration] = useState<CurationKey | null>(null);
  const [curationCourses, setCurationCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [curationLoading, setCurationLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

    return () => {
      isActive = false;
    };
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
      .then((courses) => {
        if (isActive) setCurationCourses(courses.slice(0, 5));
      })
      .catch(() => {
        if (isActive) setCurationCourses([]);
      })
      .finally(() => {
        if (isActive) setCurationLoading(false);
      });

    return () => {
      isActive = false;
    };
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
      .slice(0, 10);
  }, [famousCourses, growthCourses, honeyCourses, verifiedCourses]);

  const recommendedCourses = useMemo(
    () => buildHomeRecommendations(mergedCourses, user?.department),
    [mergedCourses, user?.department],
  );

  const curatedVisibleCourses = useMemo(
    () => buildHomeRecommendations(curationCourses, user?.department).slice(0, 5),
    [curationCourses, user?.department],
  );

  const heroCourse = useMemo(() => {
    if (recommendedCourses.length === 0) return undefined;
    const pool = recommendedCourses.filter((course) => !isOtherMajor(course, user?.department));
    const candidates = (pool.length > 0 ? pool : recommendedCourses).slice(0, 5);
    return candidates[getTodaySeed() % candidates.length];
  }, [recommendedCourses, user?.department]);

  const userName = isAuthenticated && user ? user.nickname : '게스트';
  const visibleCourses = selectedCuration
    ? curatedVisibleCourses
    : recommendedCourses.filter((c) => c.id !== heroCourse?.id).slice(0, 4);
  const gradeInfo = useMemo(() => getHomeGradeInfo(user?.points ?? 0), [user?.points]);
  const pointProgress = Math.round(gradeInfo.progress * 100);
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 12) + 96 }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => navigation.onTabScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View style={styles.topUtilityRow}>
          <PressableScale style={styles.utilityButton} onPress={() => navigation.switchTab('Search')}>
            <Ionicons name="search-outline" size={21} color="#5E6A78" />
          </PressableScale>
          <PressableScale style={styles.utilityButton} onPress={() => navigation.navigate({ name: 'Notifications' })}>
            <Ionicons name="notifications-outline" size={21} color="#5E6A78" />
          </PressableScale>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroGreeting}>{userName}님, 오늘은</Text>
            <Text style={styles.heroTitle}>
              강의평으로 <Text style={styles.heroAccent}>{gradeInfo.current.name}</Text>{HOME_GROWTH_SUFFIX[gradeInfo.current.name]}
            </Text>
          </View>

          <GrowthScene activeIndex={gradeInfo.currentIndex} />

          <View style={styles.pointBox}>
            <View style={styles.pointHeader}>
              <Text style={styles.pointText}>내 포인트 {user?.points ?? 0}P</Text>
              <Text style={styles.pointHint}>
                {gradeInfo.next
                  ? `${gradeInfo.next.name}까지 ${gradeInfo.remainingPoints}P`
                  : '가장 높은 등급이에요'}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pointProgress}%` }]} />
            </View>
          </View>

          <PressableScale
            style={styles.primaryButton}
            onPress={() => navigation.switchTab('Search')}
          >
            <Text style={styles.primaryButtonText}>강의평 작성하기</Text>
          </PressableScale>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>빠른 추천</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.benefitRail}>
          {curationCards.map((card) => {
            const isActive = selectedCuration === card.id;
            return (
              <PressableScale
                key={card.id}
                style={[styles.benefitCard, { backgroundColor: card.background }, isActive ? styles.benefitCardActive : null]}
                onPress={() => setSelectedCuration((prev) => (prev === card.id ? null : card.id))}
              >
                <Text style={styles.benefitTitle}>{card.title}</Text>
                <Text style={[styles.benefitCaption, { color: card.accent }]}>{card.caption}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        {isLoading ? <StatePanel label="추천 강의를 고르는 중입니다." loading /> : null}
        {!isLoading && errorMessage ? <StatePanel label={errorMessage} error /> : null}

        {!isLoading && !errorMessage ? (
          <View style={styles.courseSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCuration
                  ? curationCards.find((card) => card.id === selectedCuration)?.caption ?? '추천 강의'
                  : '추천 강의'}
              </Text>
              {curationLoading ? <Text style={styles.loadingText}>불러오는 중...</Text> : null}
            </View>

            {visibleCourses.map((course, index) => (
              <View key={course.id} style={styles.courseRow}>
                <CoursePosterCard
                  course={course}
                  variant="medium"
                  index={index}
                  userDepartment={user?.department}
                  onPress={() => navigation.navigate({ name: 'CourseCollection', courseId: course.id })}
                />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function GrowthScene({ activeIndex }: { activeIndex: number }) {
  const breezeAnim = useRef(new Animated.Value(0)).current;
  const butterflyAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const breezeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breezeAnim, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breezeAnim, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const butterflyLoops = butterflyAnims.map((anim, index) => Animated.loop(
      Animated.sequence([
        Animated.delay(index * 1100),
        Animated.timing(anim, {
          toValue: 1,
          duration: 4800 + index * 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1200 + index * 450),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ));

    breezeLoop.start();
    butterflyLoops.forEach((loop) => loop.start());
    return () => {
      breezeLoop.stop();
      butterflyLoops.forEach((loop) => loop.stop());
    };
  }, [breezeAnim, butterflyAnims]);

  return (
    <View style={styles.growthScene}>
      <View style={styles.growthSlide}>
        <Image source={HOME_GROWTH_ILLUSTRATIONS[activeIndex]} style={styles.growthArtwork} resizeMode="cover" />
        <GrowthMotionOverlay
          index={activeIndex}
          breezeAnim={breezeAnim}
          butterflyAnims={butterflyAnims}
        />
      </View>
    </View>
  );
}

function GrowthMotionOverlay({
  index,
  breezeAnim,
  butterflyAnims,
}: {
  index: number;
  breezeAnim: Animated.Value;
  butterflyAnims: Animated.Value[];
}) {
  const driftX = breezeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, 4],
  });
  const driftY = breezeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -3],
  });
  const foregroundLeafX = breezeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, -4],
  });
  const foregroundLeafY = breezeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-1, 3],
  });
  const leafRotate = breezeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-16deg', '-10deg'],
  });
  const secondaryLeafRotate = breezeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['22deg', '28deg'],
  });
  const foregroundLeafRotate = breezeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['16deg', '21deg'],
  });
  return (
    <View pointerEvents="none" style={styles.motionLayer}>
      {index >= 1 ? (
        <Animated.View
          style={[
            styles.motionLeaf,
            styles.motionLeafPrimary,
            { transform: [{ translateX: driftX }, { translateY: driftY }, { rotate: leafRotate }] },
          ]}
        />
      ) : null}
      {index >= 2 ? (
        <Animated.View
          style={[
            styles.motionLeaf,
            styles.motionLeafSecondary,
            { transform: [{ translateX: driftX }, { translateY: driftY }, { rotate: secondaryLeafRotate }] },
          ]}
        />
      ) : null}
      {index >= 3 ? (
        <Animated.View
          style={[
            styles.motionLeaf,
            styles.motionLeafForeground,
            { transform: [{ translateX: foregroundLeafX }, { translateY: foregroundLeafY }, { rotate: foregroundLeafRotate }] },
          ]}
        />
      ) : null}
      {index >= 1 ? <AnimatedButterfly kind="yellow" progress={butterflyAnims[0]} variant="left" /> : null}
      {index >= 2 ? <AnimatedButterfly kind="blue" progress={butterflyAnims[1]} variant="right" /> : null}
      {index >= 3 ? <AnimatedButterfly kind={index === 4 ? 'red' : 'orange'} progress={butterflyAnims[2]} variant="upper" /> : null}
    </View>
  );
}

type ButterflyKind = keyof typeof HOME_BUTTERFLY_SPRITES;
type ButterflyVariant = 'left' | 'right' | 'upper';

const BUTTERFLY_PATHS: Record<ButterflyVariant, {
  anchor: { left?: number; right?: number; top: number };
  width: number;
  height: number;
  x: number[];
  y: number[];
  trail: { left?: number; right?: number; top: number }[];
}> = {
  left: {
    anchor: { left: 24, top: 52 },
    width: 28,
    height: 28,
    x: [0, 12, 26, 40],
    y: [0, -5, -2, -8],
    trail: [
      { left: 19, top: 67 },
      { left: 27, top: 63 },
      { left: 37, top: 60 },
      { left: 48, top: 58 },
    ],
  },
  right: {
    anchor: { right: 24, top: 40 },
    width: 30,
    height: 30,
    x: [0, -12, -25, -38],
    y: [0, -4, 3, -3],
    trail: [
      { right: 21, top: 56 },
      { right: 31, top: 52 },
      { right: 42, top: 50 },
      { right: 53, top: 52 },
    ],
  },
  upper: {
    anchor: { right: 92, top: 24 },
    width: 24,
    height: 24,
    x: [0, -8, -18, -28],
    y: [0, 4, -2, 3],
    trail: [
      { right: 86, top: 38 },
      { right: 94, top: 42 },
      { right: 104, top: 41 },
      { right: 114, top: 38 },
    ],
  },
};

function AnimatedButterfly({
  kind,
  progress,
  variant,
}: {
  kind: ButterflyKind;
  progress: Animated.Value;
  variant: ButterflyVariant;
}) {
  const path = BUTTERFLY_PATHS[variant];
  const translateX = progress.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: path.x,
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: path.y,
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.86, 1],
    outputRange: [0, 0.9, 0.9, 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-4deg', '4deg', '-2deg'],
  });

  return (
    <>
      {path.trail.map((dot, dotIndex) => (
        <FlightTrailDot key={`${variant}-trail-${dotIndex}`} progress={progress} dot={dot} index={dotIndex} />
      ))}
      <Animated.View
        style={[
          styles.motionButterfly,
          path.anchor,
          {
            width: path.width,
            height: path.height,
            opacity,
            transform: [{ translateX }, { translateY }, { rotate }],
          },
        ]}
      >
        <Image source={HOME_BUTTERFLY_SPRITES[kind]} style={styles.motionButterflyArtwork} resizeMode="contain" />
      </Animated.View>
    </>
  );
}

function FlightTrailDot({
  progress,
  dot,
  index,
}: {
  progress: Animated.Value;
  dot: { left?: number; right?: number; top: number };
  index: number;
}) {
  const start = 0.12 + index * 0.12;
  const opacity = progress.interpolate({
    inputRange: [0, start, Math.min(start + 0.08, 0.95), Math.min(start + 0.24, 1)],
    outputRange: [0, 0, 0.72, 0],
  });

  return <Animated.View style={[styles.flightTrailDot, dot, { opacity }]} />;
}

function isOtherMajor(course: Course, userDepartment?: string): boolean {
  const isGeneral = course.type.includes('교양') || course.department.includes('교양');
  if (isGeneral) return false;
  if (userDepartment && course.department === userDepartment) return false;
  return true;
}

type HomeCourseScope = 'major' | 'general' | 'other';

function buildHomeRecommendations(courses: Course[], userDepartment?: string): Course[] {
  if (!userDepartment) return courses;

  const buckets: Record<HomeCourseScope, Course[]> = {
    major: [],
    general: [],
    other: [],
  };

  courses.forEach((course) => {
    buckets[getHomeCourseScope(course, userDepartment)].push(course);
  });

  if (buckets.major.length === 0) return [...buckets.general, ...buckets.other];

  const result: Course[] = [];
  const used = new Set<number>();
  let majorCount = 0;
  let otherCount = 0;

  const take = (scope: HomeCourseScope) => {
    const index = buckets[scope].findIndex((course) => !used.has(course.id));
    if (index < 0) return false;
    const [course] = buckets[scope].splice(index, 1);
    result.push(course);
    used.add(course.id);
    if (scope === 'major') majorCount += 1;
    if (scope === 'other') otherCount += 1;
    return true;
  };

  while (result.length < courses.length) {
    const before = result.length;

    if (majorCount <= otherCount && take('major')) continue;
    if (take('general')) continue;
    if (take('major')) continue;
    if (majorCount > otherCount && take('other')) continue;
    if (take('other')) continue;

    if (result.length === before) break;
  }

  return result;
}

function getHomeCourseScope(course: Course, userDepartment: string): HomeCourseScope {
  if (course.type.includes('교양') || course.department.includes('교양')) return 'general';
  if (course.department === userDepartment) return 'major';
  return 'other';
}

function getTodaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getCourseWeight(course: Course) {
  return course.rating * 20 + Math.min(course.reviewCount, 200) * 0.7;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: 12,
  },
  topUtilityRow: {
    paddingHorizontal: spacing.page,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -2,
  },
  utilityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.56)',
  },
  heroCard: {
    marginHorizontal: spacing.page,
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  heroCopy: {
    minWidth: 0,
  },
  heroGreeting: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: -0.15,
  },
  heroTitle: {
    marginTop: 5,
    color: colors.text,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  heroAccent: {
    color: colors.primary,
  },
  pointBox: {
    marginTop: 8,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  pointText: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pointHint: {
    color: colors.textTertiary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.fillStrong,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  primaryButton: {
    marginTop: 8,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  growthScene: {
    alignSelf: 'stretch',
    height: 178,
    marginTop: 34,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#EEF3F5',
  },
  growthSlide: {
    width: '100%',
    height: 178,
    position: 'relative',
    overflow: 'hidden',
  },
  growthArtwork: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '108%',
    height: '108%',
    marginLeft: '-4%',
    marginTop: '-3%',
  },
  motionLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  motionLeaf: {
    position: 'absolute',
    width: 10,
    height: 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 3,
    backgroundColor: '#8FCA48',
    opacity: 0.9,
  },
  motionLeafPrimary: {
    right: 84,
    top: 56,
  },
  motionLeafSecondary: {
    left: 92,
    top: 78,
    width: 8,
    height: 5,
    backgroundColor: '#9AD556',
  },
  motionLeafForeground: {
    right: 116,
    top: 88,
    width: 12,
    height: 7,
    backgroundColor: '#78B83D',
  },
  motionButterfly: {
    position: 'absolute',
  },
  motionButterflyArtwork: {
    width: '100%',
    height: '100%',
  },
  flightTrailDot: {
    position: 'absolute',
    width: 4,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#9DD9FF',
  },
  sectionHeader: {
    paddingHorizontal: spacing.page,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  benefitRail: {
    paddingHorizontal: spacing.page,
    gap: 8,
    paddingBottom: 2,
  },
  benefitCard: {
    width: 130,
    minHeight: 80,
    borderRadius: spacing.radius,
    padding: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  benefitCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  benefitTitle: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  benefitCaption: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  courseSection: {
    gap: 8,
    marginTop: 4,
  },
  loadingText: {
    marginLeft: 'auto',
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  courseRow: {
    paddingHorizontal: spacing.page,
  },
});
