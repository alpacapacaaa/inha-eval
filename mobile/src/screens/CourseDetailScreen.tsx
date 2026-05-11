import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatePanel } from '../components/ui';
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

const COMMENT_THEMES = [
  { accent: '#e8c35d', surface: '#fff9e9', quote: '#f2d77f' },
  { accent: '#9f8deb', surface: '#f6f2ff', quote: '#b6a7f2' },
  { accent: '#78bba8', surface: '#f0fbf7', quote: '#91cfbd' },
  { accent: '#8bb6f1', surface: '#f1f7ff', quote: '#9fc3f5' },
  { accent: '#ee9fb8', surface: '#fff2f7', quote: '#f2a8bf' },
] as const;

export function CourseDetailScreen({ navigation, route }: Props) {
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const requestIdRef = useRef(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);
  const [sortBy, setSortBy] = useState<'latest' | 'rating'>('latest');
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  const loadCourseDetail = async (sort: 'latest' | 'rating' = sortBy) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [courseData, reviewData] = await Promise.all([
        getCourseById(route.courseId),
        getReviewsByCourseId(route.courseId, sort),
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

      setErrorMessage(error instanceof Error ? error.message : '강의평 상세를 불러오지 못했습니다.');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    setVisibleCount(8);
    loadCourseDetail('latest');
    setSortBy('latest');
    setLikedIds(new Set());
  }, [route.courseId]);

  useEffect(() => {
    setVisibleCount(8);
    loadCourseDetail(sortBy);
  }, [sortBy]);

  const visibleReviews = useMemo(() => reviews.slice(0, visibleCount), [reviews, visibleCount]);
  const columns = useMemo(() => splitColumns(visibleReviews), [visibleReviews]);
  const hasMore = visibleCount < reviews.length;

  const handleToggleLike = async (reviewId: number) => {
    if (!isAuthenticated) {
      navigation.navigate({ name: 'Login' });
      return;
    }

    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) { next.delete(reviewId); } else { next.add(reviewId); }
      return next;
    });

    try {
      await toggleReviewLike(reviewId);
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (next.has(reviewId)) { next.delete(reviewId); } else { next.add(reviewId); }
        return next;
      });
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
      <SafeAreaView style={styles.stateSafeArea}>
        <StatePanel label="학생 코멘트를 불러오는 중입니다." loading />
      </SafeAreaView>
    );
  }

  if (errorMessage || !course) {
    return (
      <SafeAreaView style={styles.stateSafeArea}>
        <StatePanel label={errorMessage || '강의 정보를 찾지 못했습니다.'} error />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backGlyph}>‹</Text>
          </PressableScale>

          <PressableScale style={styles.writeButton} onPress={handleOpenReviewWrite}>
            <PencilIcon />
            <Text style={styles.writeButtonText}>강의평 쓰기</Text>
          </PressableScale>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.courseTitle}>{course.name}</Text>
            <Text style={styles.professorName}>{course.professor} 교수님</Text>
            <View style={styles.commentCountRow}>
              <ChatIcon />
              <Text style={styles.commentCountText}>
                학생들이 남긴 코멘트 {course.reviewCount || reviews.length}개
              </Text>
            </View>
          </View>

          <CommentIllustration />
        </View>

        <View style={styles.divider} />

        <View style={styles.noticeRow}>
          <SparkleIcon />
          <Text style={styles.noticeText}>익명으로 작성된 실제 수강생 코멘트입니다.</Text>
        </View>

        <View style={styles.sortRow}>
          <PressableScale
            style={[styles.sortChip, sortBy === 'latest' ? styles.sortChipActive : null]}
            onPress={() => setSortBy('latest')}
          >
            <Text style={[styles.sortChipText, sortBy === 'latest' ? styles.sortChipTextActive : null]}>최신순</Text>
          </PressableScale>
          <PressableScale
            style={[styles.sortChip, sortBy === 'rating' ? styles.sortChipActive : null]}
            onPress={() => setSortBy('rating')}
          >
            <Text style={[styles.sortChipText, sortBy === 'rating' ? styles.sortChipTextActive : null]}>평점순</Text>
          </PressableScale>
        </View>

        {visibleReviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>아직 코멘트가 없어요.</Text>
            <Text style={styles.emptyBody}>첫 번째 강의평을 남기면 이 화면에 카드처럼 전시됩니다.</Text>
            <PressableScale style={styles.emptyButton} onPress={handleOpenReviewWrite}>
              <Text style={styles.emptyButtonText}>첫 강의평 쓰기</Text>
            </PressableScale>
          </View>
        ) : (
          <View style={styles.commentColumns}>
            {columns.map((column, columnIndex) => (
              <View key={`column-${columnIndex}`} style={styles.commentColumn}>
                {column.map(({ review, index }) => (
                  <CommentCard
                    key={review.id}
                    review={review}
                    index={index}
                    isLiked={likedIds.has(review.id)}
                    likeCount={review.likes + (likedIds.has(review.id) ? 1 : 0)}
                    onBookmark={() => handleToggleLike(review.id)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        {hasMore ? (
          <PressableScale style={styles.moreButton} onPress={() => setVisibleCount((count) => count + 8)}>
            <Text style={styles.moreButtonText}>더 많은 코멘트 보기</Text>
            <ChevronDownIcon />
          </PressableScale>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CommentCard({
  review,
  index,
  isLiked,
  likeCount,
  onBookmark,
}: {
  review: Review;
  index: number;
  isLiked: boolean;
  likeCount: number;
  onBookmark: () => void;
}) {
  const theme = COMMENT_THEMES[index % COMMENT_THEMES.length];
  const text = review.oneLineTip || review.content || '아직 상세 코멘트가 없습니다.';
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const filled = Math.round(review.rating);

  return (
    <View style={[styles.commentCard, { backgroundColor: theme.surface }]}>
      <View style={styles.ratingRow}>
        <Text style={[styles.ratingStars, { color: theme.accent }]}>
          {'★'.repeat(filled)}{'☆'.repeat(Math.max(0, 5 - filled))}
        </Text>
        <Text style={[styles.ratingValue, { color: theme.accent }]}>{review.rating.toFixed(1)}</Text>
      </View>

      <Text style={[styles.quoteMark, { color: theme.quote }]}>”</Text>
      <Text
        style={styles.commentText}
        numberOfLines={expanded ? undefined : 5}
        onTextLayout={(e) => {
          if (!expanded) setIsTruncated(e.nativeEvent.lines.length >= 5);
        }}
      >
        {text}
      </Text>

      {!expanded && isTruncated ? (
        <PressableScale onPress={() => setExpanded(true)}>
          <Text style={[styles.expandText, { color: theme.accent }]}>더 보기</Text>
        </PressableScale>
      ) : null}

      <View style={styles.cardBottom}>
        <PressableScale
          style={[styles.likeButton, isLiked ? styles.likeButtonActive : null]}
          onPress={onBookmark}
        >
          <HeartIcon color={isLiked ? theme.accent : '#c8d2e0'} />
          <Text style={[styles.likeCount, { color: isLiked ? theme.accent : '#b8c4d4' }]}>
            {likeCount}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

function splitColumns(reviews: Review[]) {
  const columns: Array<Array<{ review: Review; index: number }>> = [[], []];

  reviews.forEach((review, index) => {
    columns[index % 2].push({ review, index });
  });

  return columns;
}

function PencilIcon() {
  return (
    <View style={styles.pencilIcon}>
      <View style={styles.pencilBody} />
      <View style={styles.pencilTip} />
    </View>
  );
}

function ChatIcon() {
  return (
    <View style={styles.chatIcon}>
      <View style={styles.chatDot} />
      <View style={styles.chatDot} />
      <View style={styles.chatDot} />
    </View>
  );
}

function SparkleIcon() {
  return (
    <View style={styles.sparkleIcon}>
      <View style={styles.sparkleVertical} />
      <View style={styles.sparkleHorizontal} />
    </View>
  );
}

function CommentIllustration() {
  return (
    <View style={styles.heroIllustration}>
      <View style={styles.browserCard}>
        <View style={styles.browserTop} />
        <View style={styles.browserLineShort} />
        <View style={styles.browserLineLong} />
      </View>
      <View style={styles.chatBubbleLarge}>
        <View style={styles.heroDot} />
        <View style={styles.heroDot} />
        <View style={styles.heroDot} />
      </View>
      <View style={styles.illustrationSparkleA} />
      <View style={styles.illustrationSparkleB} />
    </View>
  );
}

function HeartIcon({ color }: { color: string }) {
  return (
    <View style={styles.heartIcon}>
      <View style={[styles.heartLeft, { backgroundColor: color }]} />
      <View style={[styles.heartRight, { backgroundColor: color }]} />
      <View style={[styles.heartBottom, { backgroundColor: color }]} />
    </View>
  );
}

function ChevronDownIcon() {
  return <Text style={styles.chevronDown}>⌄</Text>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stateSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.page,
  },
  content: {
    paddingHorizontal: spacing.page,
    gap: 22,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16499a',
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  backGlyph: {
    color: '#101827',
    fontSize: 42,
    lineHeight: 42,
    fontWeight: '500',
    marginTop: -5,
    marginLeft: -2,
  },
  writeButton: {
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: '#101827',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#101827',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  writeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  pencilIcon: {
    width: 20,
    height: 20,
    transform: [{ rotate: '-38deg' }],
  },
  pencilBody: {
    position: 'absolute',
    left: 7,
    top: 1,
    width: 7,
    height: 16,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  pencilTip: {
    position: 'absolute',
    left: 7,
    bottom: -1,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  hero: {
    minHeight: 188,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.group,
  },
  heroCopy: {
    flex: 1,
    gap: 14,
  },
  courseTitle: {
    color: '#101827',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1.6,
  },
  professorName: {
    color: '#50627d',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: -0.45,
  },
  commentCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  commentCountText: {
    color: '#586a86',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  chatIcon: {
    width: 25,
    height: 21,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#718098',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  chatDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#718098',
  },
  heroIllustration: {
    width: 168,
    height: 150,
    position: 'relative',
  },
  browserCard: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 106,
    height: 82,
    borderRadius: 10,
    backgroundColor: 'rgba(226,236,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(151,183,246,0.38)',
    transform: [{ rotate: '4deg' }],
  },
  browserTop: {
    height: 18,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: 'rgba(104,145,230,0.28)',
  },
  browserLineShort: {
    width: 38,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(104,145,230,0.20)',
    marginTop: 17,
    marginLeft: 18,
  },
  browserLineLong: {
    width: 58,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(104,145,230,0.16)',
    marginTop: 10,
    marginLeft: 18,
  },
  chatBubbleLarge: {
    position: 'absolute',
    left: 6,
    bottom: 18,
    width: 88,
    height: 66,
    borderRadius: 18,
    backgroundColor: '#7ea8ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2f6edb',
    shadowOpacity: 0.20,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  heroDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  illustrationSparkleA: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    right: 8,
    bottom: 26,
    backgroundColor: '#a9c4ff',
  },
  illustrationSparkleB: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    left: 42,
    top: 18,
    backgroundColor: '#c3d5ff',
  },
  divider: {
    height: 1,
    backgroundColor: '#dce4f0',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkleIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleVertical: {
    position: 'absolute',
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#d6c486',
  },
  sparkleHorizontal: {
    position: 'absolute',
    width: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d6c486',
  },
  noticeText: {
    flex: 1,
    color: '#8b96a8',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  commentColumns: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  commentColumn: {
    flex: 1,
    gap: 14,
  },
  commentCard: {
    minHeight: 208,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 14,
    shadowColor: '#16499a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
  },
  quoteMark: {
    fontSize: 38,
    lineHeight: 31,
    fontWeight: '900',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingStars: {
    fontSize: 13,
    letterSpacing: 1,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  commentText: {
    color: '#1c2a3a',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: -4,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  likeButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  likeCount: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -6,
  },
  sortChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  sortChipActive: {
    backgroundColor: '#101827',
    borderColor: '#101827',
  },
  sortChipText: {
    color: '#65738a',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sortChipTextActive: {
    color: '#ffffff',
  },
  heartIcon: {
    width: 20,
    height: 18,
    position: 'relative',
  },
  heartLeft: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    left: 0,
    top: 0,
  },
  heartRight: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    right: 0,
    top: 0,
  },
  heartBottom: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 3,
    left: 3,
    top: 5,
    transform: [{ rotate: '45deg' }],
  },
  moreButton: {
    minHeight: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(226,233,244,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#16499a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  moreButtonText: {
    color: '#51627d',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  chevronDown: {
    color: '#51627d',
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '500',
    marginTop: -8,
  },
  emptyCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(226,233,244,0.96)',
    padding: spacing.page,
    gap: spacing.related,
  },
  emptyTitle: {
    color: '#101827',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  emptyBody: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  emptyButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#101827',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
});
