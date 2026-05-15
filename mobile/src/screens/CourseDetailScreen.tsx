import { Ionicons } from '@expo/vector-icons';
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
  }, [route.courseId]);

  useEffect(() => {
    setVisibleCount(8);
    loadCourseDetail(sortBy);
  }, [sortBy]);

  const visibleReviews = useMemo(() => reviews.slice(0, visibleCount), [reviews, visibleCount]);
  const hasMore = visibleCount < reviews.length;

  const handleToggleLike = async (reviewId: number) => {
    if (!isAuthenticated) {
      navigation.navigate({ name: 'Login' });
      return;
    }

    const previousReview = reviews.find((review) => review.id === reviewId);
    if (!previousReview) {
      return;
    }

    const nextLiked = !previousReview.likedByMe;
    const nextLikes = Math.max(0, previousReview.likes + (nextLiked ? 1 : -1));

    setReviews((current) => current.map((review) => (
      review.id === reviewId
        ? { ...review, likedByMe: nextLiked, likes: nextLikes }
        : review
    )));

    try {
      await toggleReviewLike(reviewId);
    } catch {
      setReviews((current) => current.map((review) => (
        review.id === reviewId ? previousReview : review
      )));
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
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </PressableScale>

          <PressableScale style={styles.writeButton} onPress={handleOpenReviewWrite}>
            <Ionicons name="pencil-outline" size={15} color="#ffffff" />
            <Text style={styles.writeButtonText}>강의평 쓰기</Text>
          </PressableScale>
        </View>

        <View style={styles.hero}>
          <Text style={styles.courseTitle}>{course.name}</Text>
          <Text style={styles.professorName}>
            {course.professor} 교수님 · {course.department || '개설학과 미정'}
          </Text>
          <Text style={styles.commentCountText}>
            학생들이 남긴 코멘트 {course.reviewCount || reviews.length}개
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.noticeRow}>
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
          <View style={styles.commentList}>
            {visibleReviews.map((review, index) => (
              <CommentCard
                key={review.id}
                review={review}
                index={index}
                isLiked={Boolean(review.likedByMe)}
                likeCount={review.likes}
                onBookmark={() => handleToggleLike(review.id)}
              />
            ))}
          </View>
        )}

        {hasMore ? (
          <PressableScale style={styles.moreButton} onPress={() => setVisibleCount((count) => count + 8)}>
            <Text style={styles.moreButtonText}>더 많은 코멘트 보기</Text>
            <Ionicons name="chevron-down" size={20} color="#51627d" />
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
  const text = review.oneLineTip || review.content || '아직 상세 코멘트가 없습니다.';
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const shouldShowExpand = isTruncated || text.length > 120;

  const filled = Math.round(review.rating);

  return (
    <View style={styles.commentCard}>
      <View style={styles.ratingRow}>
        <Text style={styles.ratingStars}>
          {'★'.repeat(filled)}{'☆'.repeat(Math.max(0, 5 - filled))}
        </Text>
        <Text style={styles.ratingValue}>{review.rating.toFixed(1)}</Text>
      </View>

      <Text
        style={styles.commentText}
        numberOfLines={expanded ? undefined : 4}
        onTextLayout={(e) => {
          if (!expanded) setIsTruncated(e.nativeEvent.lines.length >= 4);
        }}
      >
        {text}
      </Text>

      {shouldShowExpand ? (
        <PressableScale style={styles.expandButton} onPress={() => setExpanded((current) => !current)}>
          <Text style={styles.expandText}>{expanded ? '접기' : '더 보기'}</Text>
        </PressableScale>
      ) : null}

      <View style={styles.cardBottom}>
        <PressableScale
          style={[styles.likeButton, isLiked ? styles.likeButtonActive : null]}
          onPress={onBookmark}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={17} color={isLiked ? colors.primary : '#AAB6C3'} />
          <Text style={[styles.likeCount, isLiked ? styles.likeCountActive : null]}>{likeCount}</Text>
        </PressableScale>
      </View>
    </View>
  );
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
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  writeButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  writeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  hero: {
    gap: 10,
  },
  courseTitle: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  professorName: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  commentCountText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  commentList: {
    gap: 12,
  },
  commentCard: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.card,
    paddingTop: spacing.card,
    paddingBottom: 13,
    gap: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ratingStars: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
  },
  ratingValue: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  commentText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 23,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  expandButton: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
  },
  expandText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 68,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 18,
    backgroundColor: colors.fill,
  },
  likeButtonActive: {
    backgroundColor: colors.primarySoft,
  },
  likeCount: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  likeCountActive: {
    color: colors.primary,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -6,
  },
  sortChip: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sortChipTextActive: {
    color: '#ffffff',
  },
  moreButton: {
    minHeight: 50,
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  moreButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  emptyCard: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.page,
    gap: spacing.related,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  emptyButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
});
