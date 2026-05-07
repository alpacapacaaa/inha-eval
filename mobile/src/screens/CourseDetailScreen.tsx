import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getCourseById } from '../lib/api/courses';
import { getReviewsByCourseId, toggleReviewLike } from '../lib/api/reviews';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course, Review } from '../types/models';

interface Props {
  navigation: AppNavigation;
  route: {
    name: 'CourseDetail';
    courseId: number;
  };
}

const DETAIL_PALETTES = [
  { bg: '#082f6f', accent: '#a9caff', surface: '#123f86', card: '#245aa8' },
  { bg: '#0f1b2d', accent: '#d7b76a', surface: '#1d355e', card: '#2b4d82' },
  { bg: '#07364c', accent: '#9ed7e8', surface: '#0f526d', card: '#1b6b87' },
] as const;

export function CourseDetailScreen({ navigation, route }: Props) {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const requestIdRef = useRef(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'likes' | 'highest' | 'lowest'>('latest');
  const [selectedSemester, setSelectedSemester] = useState<string>('전체');

  const loadCourseDetail = async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [courseData, reviewData] = await Promise.all([
        getCourseById(route.courseId),
        getReviewsByCourseId(route.courseId, sortBy),
      ]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setCourse(courseData);
      setReviews(reviewData);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('강의 상세를 불러오지 못했습니다.');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadCourseDetail();
  }, [route.courseId, sortBy]);

  const semesters = useMemo(
    () => ['전체', ...Array.from(new Set(reviews.map((review) => review.semester)))],
    [reviews],
  );

  const filteredReviews = useMemo(
    () =>
      selectedSemester === '전체'
        ? reviews
        : reviews.filter((review) => review.semester === selectedSemester),
    [reviews, selectedSemester],
  );

  const topKeywords = useMemo(() => {
    const counter = new Map<string, number>();
    for (const review of reviews) {
      for (const keyword of review.examKeywords ?? []) {
        counter.set(keyword, (counter.get(keyword) ?? 0) + 1);
      }
    }
    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);
  }, [reviews]);

  const palette = useMemo(() => DETAIL_PALETTES[route.courseId % DETAIL_PALETTES.length], [route.courseId]);

  const insightSentence = useMemo(() => {
    if (!course) {
      return '';
    }
    const difficultyTone = humanizeMetric(course.difficulty, '난이도');
    const workloadTone = humanizeMetric(course.workload, '과제량');
    const ratingTone =
      course.rating >= 4.3
        ? '전반 만족도는 꽤 높은 편이에요.'
        : course.rating >= 3.7
          ? '취향이 갈리지만 꾸준히 보는 강의예요.'
          : '수강 전에 리뷰 맥락을 꼭 보고 결정하는 편이 좋아요.';
    return `${difficultyTone} ${workloadTone} ${ratingTone}`;
  }, [course]);

  const handleToggleLike = async (reviewId: number) => {
    if (!isAuthenticated) {
      navigation.navigate({ name: 'Login' });
      return;
    }

    try {
      await toggleReviewLike(reviewId);
      await loadCourseDetail();
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('좋아요 처리에 실패했습니다.');
      }
    }
  };

  const handleOpenReviewWrite = () => {
    if (!isAuthenticated) {
      navigation.navigate({ name: 'Login' });
      return;
    }

    navigation.navigate({ name: 'ReviewWrite', courseId: route.courseId });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>강의 장면을 불러오는 중입니다.</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !course) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <Text style={styles.errorText}>{errorMessage || '강의 정보를 찾지 못했습니다.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View pointerEvents="none" style={styles.blueprintBackdrop}>
        <View style={styles.backdropOrbLarge} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.related, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroStage, { backgroundColor: palette.bg }]}>
          <View style={[styles.heroGlowLarge, { backgroundColor: palette.accent }]} />
          <View style={[styles.heroGlowSmall, { backgroundColor: palette.accent }]} />

          <View style={styles.heroTopRow}>
            <Pressable style={styles.ghostRound} onPress={() => navigation.goBack()}>
              <Text style={styles.ghostRoundText}>‹</Text>
            </Pressable>
            <Pressable style={styles.heroActionPill} onPress={handleOpenReviewWrite}>
              <Text style={styles.heroActionPillText}>강의평 쓰기</Text>
            </Pressable>
          </View>

          <View style={styles.heroBody}>
            <Text style={[styles.heroDepartment, { color: palette.accent }]}>{course.department}</Text>
            <Text style={styles.heroTitle}>{course.name}</Text>
            <Text style={styles.heroSubtitle}>
              {course.professor} 교수님 · {course.type}
            </Text>
          </View>

          <View style={styles.heroFoot}>
            <View style={[styles.scoreOrb, { backgroundColor: palette.card, borderColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={styles.scoreOrbValue}>{course.rating.toFixed(1)}</Text>
              <Text style={styles.scoreOrbLabel}>평점</Text>
            </View>
            <View style={styles.heroInsightBlock}>
              <Text style={styles.heroInsightLabel}>한눈 요약</Text>
              <Text style={styles.heroInsightText}>{insightSentence}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRibbon}>
          <MetricTag label="리뷰" value={`${course.reviewCount}`} />
          <MetricTag label="난이도" value={course.difficulty} />
          <MetricTag label="과제량" value={course.workload} />
          <MetricTag label="출결" value={course.attendance} />
        </View>

        <View style={styles.keywordStream}>
          {(topKeywords.length > 0 ? topKeywords : [course.category, `학점 ${course.grading}`]).map((item) => (
            <View key={item} style={styles.keywordChip}>
              <Text style={styles.keywordChipText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.filterScene}>
          <Text style={styles.sceneLabel}>후기 필터</Text>
          <Text style={styles.sceneTitle}>읽고 싶은 후기만 좁혀보기</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
            {(['latest', 'likes', 'highest', 'lowest'] as const).map((option) => {
              const active = sortBy === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.filterChip, active ? styles.filterChipActive : null]}
                  onPress={() => setSortBy(option)}
                >
                  <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>
                    {getSortLabel(option)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
            {semesters.map((semester) => {
              const active = selectedSemester === semester;
              return (
                <Pressable
                  key={semester}
                  style={[styles.filterChip, active ? styles.filterChipActive : null]}
                  onPress={() => setSelectedSemester(semester)}
                >
                  <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>
                    {semester}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.reviewScene}>
          <Text style={styles.sceneLabel}>후기 갤러리</Text>
          <Text style={styles.sceneTitle}>사진을 넘기듯 내려보는 강의평</Text>
          <Text style={styles.sceneBody}>
            포인트를 한 번에 읽을 수 있도록 리뷰를 한 장의 작품처럼 크게 보여주고, 필요한 메트릭만 아래에
            정리했습니다.
          </Text>

          {filteredReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>아직 등록된 리뷰가 없어요.</Text>
              <Text style={styles.emptyStateBody}>첫 번째 강의평을 남겨서 이 장면의 시작을 만들어주세요.</Text>
              <Pressable style={styles.emptyStateButton} onPress={handleOpenReviewWrite}>
                <Text style={styles.emptyStateButtonText}>첫 강의평 남기기</Text>
              </Pressable>
            </View>
          ) : (
            filteredReviews.map((review, index) => (
              <ReviewStoryCard
                key={review.id}
                review={review}
                index={index}
                onLike={() => handleToggleLike(review.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricTag({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTag}>
      <Text style={styles.metricTagLabel}>{label}</Text>
      <Text style={styles.metricTagValue}>{value}</Text>
    </View>
  );
}

function ReviewStoryCard({
  review,
  index,
  onLike,
}: {
  review: Review;
  index: number;
  onLike: () => void;
}) {
  const palette = STORY_PALETTES[index % STORY_PALETTES.length];

  return (
    <View style={[styles.storyCard, { backgroundColor: palette.bg }]}>
      <View style={[styles.storyArtwork, { backgroundColor: palette.canvas }]}>
        <View style={[styles.storyGlowA, { backgroundColor: palette.accent }]} />
        <View style={[styles.storyGlowB, { backgroundColor: palette.accent }]} />
        <View style={styles.storyArtworkTop}>
          <Text style={[styles.storySemester, { color: palette.meta }]}>{review.semester}</Text>
          <View style={[styles.storyRatingPill, { backgroundColor: palette.ratingBg }]}>
            <Text style={[styles.storyRatingValue, { color: palette.ratingText }]}>{review.rating.toFixed(1)}</Text>
          </View>
        </View>
        <Text style={[styles.storyReviewText, { color: palette.text }]}>{review.content}</Text>
      </View>

      <View style={styles.storyMetaSection}>
        <View style={styles.storyMetaTop}>
          <Text style={styles.storyMetaLine}>
            {review.professorName} · {review.courseName}
          </Text>
          <Pressable style={styles.storyLikeButton} onPress={onLike}>
            <Text style={styles.storyLikeButtonText}>도움 {review.likes}</Text>
          </Pressable>
        </View>

        <View style={styles.storyMetricRow}>
          <StoryMetric label="난이도" value={review.difficulty} />
          <StoryMetric label="과제" value={review.workload} />
          <StoryMetric label="출결" value={review.attendance} />
        </View>

        {(review.examKeywords?.length ?? 0) > 0 ? (
          <View style={styles.storyTagRow}>
            {review.examKeywords?.slice(0, 4).map((keyword) => (
              <View key={`${review.id}-${keyword}`} style={styles.storyTagChip}>
                <Text style={styles.storyTagChipText}>{keyword}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.storyMetric}>
      <Text style={styles.storyMetricLabel}>{label}</Text>
      <Text style={styles.storyMetricValue}>{value}</Text>
    </View>
  );
}

const STORY_PALETTES = [
  {
    bg: '#ffffff',
    canvas: '#e7f0ff',
    text: '#0f1b2d',
    meta: '#16499a',
    accent: 'rgba(22,73,154,0.18)',
    ratingBg: 'rgba(255,255,255,0.7)',
    ratingText: '#16499a',
  },
  {
    bg: '#ffffff',
    canvas: '#082f6f',
    text: '#ffffff',
    meta: 'rgba(255,255,255,0.72)',
    accent: 'rgba(169,202,255,0.22)',
    ratingBg: 'rgba(255,255,255,0.12)',
    ratingText: '#ffffff',
  },
  {
    bg: '#ffffff',
    canvas: '#0f1b2d',
    text: '#f6f9ff',
    meta: 'rgba(215,183,106,0.78)',
    accent: 'rgba(215,183,106,0.18)',
    ratingBg: 'rgba(255,255,255,0.10)',
    ratingText: '#d7b76a',
  },
] as const;

function humanizeMetric(value: string, type: '난이도' | '과제량') {
  const normalized = value.toLowerCase();

  if (normalized.includes('hard') || normalized.includes('strict') || normalized.includes('heavy') || normalized.includes('높')) {
    return type === '난이도' ? '체감 난이도는 다소 높은 편이고,' : '과제량은 꽤 있는 편이며,';
  }

  if (normalized.includes('easy') || normalized.includes('light') || normalized.includes('flex') || normalized.includes('낮')) {
    return type === '난이도' ? '체감 난이도는 비교적 편안한 편이고,' : '과제량은 비교적 가벼운 편이며,';
  }

  return type === '난이도' ? '체감 난이도는 무난한 편이고,' : '과제량은 보통 수준이며,';
}

function getSortLabel(sort: 'latest' | 'likes' | 'highest' | 'lowest') {
  switch (sort) {
    case 'latest':
      return '최신순';
    case 'likes':
      return '추천순';
    case 'highest':
      return '평점 높은순';
    case 'lowest':
      return '평점 낮은순';
    default:
      return sort;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9fd',
  },
  blueprintBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  backdropOrbLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(22,73,154,0.10)',
    right: -94,
    top: 180,
  },
  loadingSafeArea: {
    flex: 1,
    backgroundColor: '#edf2fb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.related,
    paddingHorizontal: spacing.page,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.page,
    gap: spacing.section,
  },
  heroStage: {
    borderRadius: 26,
    overflow: 'hidden',
    padding: spacing.group,
    gap: spacing.group,
    shadowColor: '#0e1c36',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    right: -40,
    top: -30,
    opacity: 0.24,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    left: -30,
    bottom: -20,
    opacity: 0.18,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ghostRound: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  ghostRoundText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: -2,
  },
  heroActionPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroActionPillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  heroBody: {
    gap: spacing.tight,
  },
  heroDepartment: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  heroFoot: {
    flexDirection: 'row',
    gap: spacing.related,
    alignItems: 'flex-end',
  },
  scoreOrb: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  scoreOrbValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreOrbLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
  },
  heroInsightBlock: {
    flex: 1,
    gap: 6,
  },
  heroInsightLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '800',
  },
  heroInsightText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metaRibbon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.tight,
  },
  metricTag: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    gap: 2,
  },
  metricTagLabel: {
    color: '#8090ad',
    fontSize: 11,
    fontWeight: '800',
  },
  metricTagValue: {
    color: '#101621',
    fontSize: 12,
    fontWeight: '800',
  },
  keywordStream: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.tight,
  },
  keywordChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  keywordChipText: {
    color: '#2759c8',
    fontSize: 12,
    fontWeight: '800',
  },
  filterScene: {
    gap: spacing.related,
  },
  sceneLabel: {
    color: '#4d78d0',
    fontSize: 12,
    fontWeight: '800',
  },
  sceneTitle: {
    color: '#141924',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  sceneBody: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  filterRail: {
    gap: spacing.related,
    paddingRight: 18,
  },
  filterChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#16499a',
    borderColor: '#16499a',
  },
  filterChipText: {
    color: '#46617f',
    fontSize: 12,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  reviewScene: {
    gap: spacing.group,
  },
  emptyState: {
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: 22,
    gap: spacing.related,
    alignItems: 'flex-start',
  },
  emptyStateTitle: {
    color: '#141924',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  emptyStateBody: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  emptyStateButton: {
    borderRadius: 18,
    backgroundColor: 'rgba(13,62,169,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  storyCard: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    overflow: 'hidden',
    shadowColor: '#16499a',
    shadowOpacity: 0.09,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  storyArtwork: {
    minHeight: 300,
    paddingHorizontal: spacing.group,
    paddingTop: spacing.group,
    paddingBottom: spacing.group,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  storyGlowA: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    right: -34,
    top: -20,
  },
  storyGlowB: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 999,
    left: -24,
    bottom: -10,
  },
  storyArtworkTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storySemester: {
    fontSize: 12,
    fontWeight: '800',
  },
  storyRatingPill: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  storyRatingValue: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  storyReviewText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  storyMetaSection: {
    paddingHorizontal: spacing.group,
    paddingTop: spacing.group,
    paddingBottom: spacing.group,
    gap: spacing.related,
  },
  storyMetaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.related,
    alignItems: 'center',
  },
  storyMetaLine: {
    flex: 1,
    color: '#576780',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  storyLikeButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.74)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  storyLikeButtonText: {
    color: '#0d3ea9',
    fontSize: 12,
    fontWeight: '800',
  },
  storyMetricRow: {
    flexDirection: 'row',
    gap: spacing.tight,
  },
  storyMetric: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 3,
  },
  storyMetricLabel: {
    color: '#8090ad',
    fontSize: 11,
    fontWeight: '800',
  },
  storyMetricValue: {
    color: '#131722',
    fontSize: 13,
    fontWeight: '800',
  },
  storyTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.tight,
  },
  storyTagChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  storyTagChipText: {
    color: '#355ca8',
    fontSize: 12,
    fontWeight: '800',
  },
});
