import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, PressableScale, StatePanel } from '../components/ui';
import { getCourseById, getCourseStats } from '../lib/api/courses';
import { getReviewsByCourseId } from '../lib/api/reviews';
import { loadTimetableCartIds, saveTimetableCartIds } from '../lib/storage/timetableStorage';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course, CourseStats, Review } from '../types/models';
import { AppRoute } from '../types/navigation';

interface Props {
  navigation: AppNavigation;
  route: Extract<AppRoute, { name: 'CourseCollection' }>;
}

type CardNewsKind = 'mood' | 'signals' | 'fit' | 'keywords' | 'quote';

interface CardNewsItem {
  id: string;
  kind: CardNewsKind;
  badge: string;
  title: string;
  accent: string;
  soft: string;
}

const CARD_NEWS_THEME: Record<CardNewsKind, Pick<CardNewsItem, 'accent' | 'soft'>> = {
  mood: { accent: '#2f6edb', soft: '#edf5ff' },
  signals: { accent: '#0e9a69', soft: '#ecfaf3' },
  fit: { accent: '#e07119', soft: '#fff4e8' },
  keywords: { accent: '#d92f80', soft: '#fff0f7' },
  quote: { accent: '#8a42d6', soft: '#f5edff' },
};

export function CourseCollectionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isInCart, setIsInCart] = useState(false);

  const cardWidth = Math.min(width - 44, 390);
  const cardHeight = Math.min(Math.max(height - insets.top - insets.bottom - 205, 520), 640);
  const sideInset = Math.max((width - cardWidth) / 2, spacing.related);

  useEffect(() => {
    let isActive = true;

    const loadCollection = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [courseResult, reviewResult, statsResult, cartIds] = await Promise.allSettled([
          getCourseById(route.courseId),
          getReviewsByCourseId(route.courseId),
          getCourseStats(route.courseId),
          loadTimetableCartIds(),
        ]);

        if (!isActive) {
          return;
        }

        if (courseResult.status === 'rejected') {
          throw courseResult.reason;
        }

        if (reviewResult.status === 'rejected') {
          throw reviewResult.reason;
        }

        setCourse(courseResult.value);
        setReviews(reviewResult.value);

        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value);
        }

        if (cartIds.status === 'fulfilled') {
          setIsInCart(cartIds.value.includes(String(route.courseId)));
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : '강의 카드뉴스를 불러오지 못했습니다.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadCollection();

    return () => {
      isActive = false;
    };
  }, [route.courseId]);

  const cards = useMemo<CardNewsItem[]>(() => {
    if (!course) {
      return [];
    }

    const mood = getMoodCopy(course, reviews);

    return [
      {
        id: 'mood',
        kind: 'mood',
        badge: '전체 분위기',
        title: `${mood.title} 강의`,
        ...CARD_NEWS_THEME.mood,
      },
      {
        id: 'signals',
        kind: 'signals',
        badge: '수강 신호 지표',
        title: '강의력 · 난이도 · 과제 · 출결 · 학점 · 족보',
        ...CARD_NEWS_THEME.signals,
      },
      {
        id: 'fit',
        kind: 'fit',
        badge: '추천 대상',
        title: '이런 학생에게 잘 맞아요',
        ...CARD_NEWS_THEME.fit,
      },
      {
        id: 'keywords',
        kind: 'keywords',
        badge: '핵심 키워드',
        title: `${course.name}의 핵심 키워드`,
        ...CARD_NEWS_THEME.keywords,
      },
      {
        id: 'quote',
        kind: 'quote',
        badge: '마지막 한줄 요약',
        title: '한 줄 요약',
        ...CARD_NEWS_THEME.quote,
      },
    ];
  }, [course, reviews]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 16));
    setActiveIndex(Math.max(0, Math.min(nextIndex, cards.length - 1)));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.stateSafeArea}>
        <StatePanel label="강의 카드뉴스를 준비하는 중입니다." loading />
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

  const handleOpenDetail = () => navigation.navigate({ name: 'CourseDetail', courseId: course.id });
  const handleOpenReviewWrite = () => navigation.navigate({ name: 'ReviewWrite', courseId: course.id });

  const handleToggleCart = async () => {
    const currentIds = await loadTimetableCartIds();
    const courseId = String(course.id);
    const nextIds = currentIds.includes(courseId)
      ? currentIds.filter((id) => id !== courseId)
      : [...currentIds, courseId];
    await saveTimetableCartIds(nextIds);
    setIsInCart(!currentIds.includes(courseId));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.screen, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.topBar}>
          <PressableScale style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backGlyph}>‹</Text>
          </PressableScale>

          <View style={styles.titleBlock}>
            <Text style={styles.topTitle} numberOfLines={1}>{course.name}</Text>
            <Text style={styles.topSubtitle} numberOfLines={1}>{course.professor}</Text>
          </View>

          <View style={styles.topActions}>
            <PressableScale style={[styles.iconButton, isInCart ? styles.iconButtonActive : null]} onPress={handleToggleCart}>
              <BookmarkGlyph active={isInCart} />
            </PressableScale>
            <PressableScale style={styles.iconButton} onPress={() => Alert.alert('더보기', '공유 기능은 준비 중입니다.')}>
              <MoreGlyph />
            </PressableScale>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          decelerationRate="fast"
          snapToInterval={cardWidth + 16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.cardRail, { paddingHorizontal: sideInset }]}
          onMomentumScrollEnd={handleMomentumEnd}
        >
          {cards.map((item) => (
            <CardNewsSlide
              key={item.id}
              item={item}
              course={course}
              reviews={reviews}
              stats={stats}
              width={cardWidth}
              height={cardHeight}
            />
          ))}
        </ScrollView>

        <View style={styles.pagination}>
          {cards.map((item, index) => (
            <View
              key={`dot-${item.id}`}
              style={[
                styles.dot,
                { backgroundColor: activeIndex === index ? item.accent : '#d8dce4' },
                activeIndex === index ? styles.dotActive : null,
              ]}
            />
          ))}
        </View>

        <View style={styles.ctaRow}>
          <Button label="상세 강의평 보기" variant="secondary" style={styles.ctaButton} onPress={handleOpenDetail} />
          <Button label="강의평 쓰기" style={styles.ctaButton} onPress={handleOpenReviewWrite} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function CardNewsSlide({
  item,
  course,
  reviews,
  stats,
  width,
  height,
}: {
  item: CardNewsItem;
  course: Course;
  reviews: Review[];
  stats: CourseStats | null;
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.slideFrame, { width, height }]}>
      <View style={styles.slidePaper}>
        <View style={styles.slideHeader}>
          <View style={[styles.badge, { backgroundColor: item.soft }]}>
            <Text style={[styles.badgeText, { color: item.accent }]}>{item.badge}</Text>
          </View>
          <Text style={styles.slideTitle}>{item.title}</Text>
        </View>

        <View style={styles.hairline} />

        <View style={styles.slideBody}>
          {item.kind === 'mood' ? <MoodSlide course={course} reviews={reviews} accent={item.accent} soft={item.soft} /> : null}
          {item.kind === 'signals' ? <SignalSlide stats={stats} accent={item.accent} soft={item.soft} /> : null}
          {item.kind === 'fit' ? <FitSlide course={course} reviews={reviews} accent={item.accent} /> : null}
          {item.kind === 'keywords' ? <KeywordSlide course={course} reviews={reviews} accent={item.accent} soft={item.soft} /> : null}
          {item.kind === 'quote' ? <QuoteSlide course={course} reviews={reviews} accent={item.accent} soft={item.soft} /> : null}
        </View>

        <View style={styles.slideFooter}>
          <Text style={styles.footerMeta} numberOfLines={1}>{course.name} · {course.professor}</Text>
          <Text style={[styles.footerRating, { color: item.accent }]}>★ {course.rating.toFixed(1)}</Text>
        </View>
      </View>
    </View>
  );
}

function MoodSlide({
  course,
  reviews,
  accent,
  soft,
}: {
  course: Course;
  reviews: Review[];
  accent: string;
  soft: string;
}) {
  const mood = getMoodCopy(course, reviews);

  return (
    <View style={styles.moodContent}>
      <View style={styles.ratingRow}>
        <Text style={[styles.bigRating, { color: accent }]}>{course.rating.toFixed(1)}</Text>
        <Text style={styles.ratingMax}>/ 5.0</Text>
      </View>

      <GrowthIllustration accent={accent} soft={soft} />

      <View style={[styles.quoteBox, { backgroundColor: soft }]}>
        <Text style={[styles.quoteGlyph, { color: accent }]}>“</Text>
        <Text style={styles.quoteBoxText}>{mood.summary}</Text>
      </View>
    </View>
  );
}

function SignalSlide({
  stats,
  accent,
  soft,
}: {
  stats: CourseStats | null;
  accent: string;
  soft: string;
}) {
  const rows = getSignalRows(stats);

  if (rows.length === 0) {
    return (
      <View style={styles.signalEmpty}>
        <ClipboardIllustration accent={accent} soft={soft} />
        <View style={[styles.emptyMessage, { backgroundColor: soft }]}>
          <Text style={[styles.emptyTitle, { color: accent }]}>아직 데이터가 없어요</Text>
          <Text style={styles.emptyBody}>슬라이더를 포함한 수강평을 남기면 이 항목이 채워집니다.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.signalContent}>
      <ClipboardIllustration accent={accent} soft={soft} />
      <View style={styles.signalList}>
        {rows.map((row) => (
          <View key={row.label} style={styles.signalRow}>
            <View style={styles.signalLabelRow}>
              <Text style={styles.signalLabel}>{row.label}</Text>
              <Text style={[styles.signalValue, { color: accent }]}>{row.value.toFixed(1)}</Text>
            </View>
            <View style={styles.signalTrack}>
              <View style={[styles.signalFill, { width: `${Math.min(row.value, 10) * 10}%`, backgroundColor: accent }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function FitSlide({
  course,
  reviews,
  accent,
}: {
  course: Course;
  reviews: Review[];
  accent: string;
}) {
  const labels = getFitLabels(course, reviews).slice(0, 3);

  return (
    <View style={styles.fitContent}>
      {labels.map((label, index) => (
        <View key={label} style={styles.fitRow}>
          <View style={styles.fitIndexWrap}>
            <Text style={[styles.fitIndex, { color: accent }]}>{String(index + 1).padStart(2, '0')}</Text>
          </View>
          <View style={[styles.fitIcon, { borderColor: accent }]}>
            <View style={[styles.fitIconDot, { backgroundColor: accent }]} />
          </View>
          <Text style={styles.fitText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function KeywordSlide({
  course,
  reviews,
  accent,
  soft,
}: {
  course: Course;
  reviews: Review[];
  accent: string;
  soft: string;
}) {
  const keywords = collectKeywords(course, reviews).slice(0, 6);

  return (
    <View style={styles.keywordContent}>
      <View style={styles.keywordGrid}>
        {keywords.map((keyword) => (
          <View key={keyword} style={[styles.keywordChip, { backgroundColor: soft }]}>
            <Text style={styles.keywordText}>{keyword}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.keywordSource, { backgroundColor: soft }]}>
        <SearchGlyph accent={accent} />
        <Text style={styles.keywordSourceText}>후기 {course.reviewCount}개에서 추출한 키워드예요.</Text>
      </View>
    </View>
  );
}

function QuoteSlide({
  course,
  reviews,
  accent,
  soft,
}: {
  course: Course;
  reviews: Review[];
  accent: string;
  soft: string;
}) {
  const sentence = getOneLineSummary(course, reviews);

  return (
    <View style={styles.lastQuoteContent}>
      <View style={[styles.quoteCircle, { backgroundColor: soft }]}>
        <Text style={[styles.lastQuoteGlyph, { color: accent }]}>“</Text>
      </View>
      <Text style={styles.lastQuoteText}>{sentence}</Text>
    </View>
  );
}

function GrowthIllustration({ accent, soft }: { accent: string; soft: string }) {
  return (
    <View style={styles.growthWrap}>
      <View style={[styles.growthOrb, { backgroundColor: soft }]} />
      <View style={styles.barGroup}>
        {[46, 78, 116].map((barHeight, index) => (
          <View key={barHeight} style={[styles.growthBar, { height: barHeight, opacity: 0.32 + index * 0.18, backgroundColor: accent }]} />
        ))}
      </View>
      <View style={[styles.arrowStem, { backgroundColor: accent }]} />
      <View style={[styles.arrowHead, { borderBottomColor: accent }]} />
      <View style={[styles.growthDot, { backgroundColor: accent, left: 24, bottom: 38 }]} />
      <View style={[styles.growthDot, { backgroundColor: accent, left: 54, bottom: 55, opacity: 0.35 }]} />
    </View>
  );
}

function ClipboardIllustration({ accent, soft }: { accent: string; soft: string }) {
  return (
    <View style={[styles.clipboardOrb, { backgroundColor: soft }]}>
      <View style={[styles.clipboard, { borderColor: accent }]}>
        <View style={[styles.clipTop, { backgroundColor: accent }]} />
        {[0, 1, 2].map((line) => (
          <View key={line} style={styles.clipLineRow}>
            <View style={[styles.checkMark, { borderColor: accent }]}>
              <View style={[styles.checkDot, { backgroundColor: accent }]} />
            </View>
            <View style={[styles.clipLine, { backgroundColor: accent, opacity: 0.24 + line * 0.12 }]} />
          </View>
        ))}
      </View>
      <View style={[styles.checkBadge, { backgroundColor: accent }]}>
        <Text style={styles.checkBadgeText}>✓</Text>
      </View>
    </View>
  );
}

function BookmarkGlyph({ active }: { active: boolean }) {
  return (
    <View style={[styles.bookmarkGlyph, active ? styles.bookmarkGlyphActive : null]} />
  );
}

function MoreGlyph() {
  return (
    <View style={styles.moreGlyph}>
      <View style={styles.moreDot} />
      <View style={styles.moreDot} />
      <View style={styles.moreDot} />
    </View>
  );
}

function SearchGlyph({ accent }: { accent: string }) {
  return (
    <View style={styles.searchGlyph}>
      <View style={[styles.searchCircle, { borderColor: accent }]} />
      <View style={[styles.searchHandle, { backgroundColor: accent }]} />
    </View>
  );
}

function getMoodCopy(course: Course, reviews: Review[]) {
  const text = `${course.difficulty} ${course.workload} ${course.attendance} ${reviews.map((review) => review.content).join(' ')}`;

  if (course.rating >= 4.5) {
    return {
      title: '성장형',
      summary: '부담은 있지만 듣고 나면 남는 게 많다는 신호가 강해요.',
    };
  }

  if (text.includes('많') || text.includes('어렵') || text.toLowerCase().includes('hard')) {
    return {
      title: '도전형',
      summary: '난이도와 준비량은 있지만 성실하게 따라가면 얻는 게 있는 강의예요.',
    };
  }

  if (course.type.includes('교양')) {
    return {
      title: '탐색형',
      summary: '전공 밖 관심사를 넓히면서 부담을 조절하기 좋은 흐름이에요.',
    };
  }

  return {
    title: '균형형',
    summary: '난이도, 과제, 출결을 함께 보고 판단하기 좋은 강의예요.',
  };
}

function getSignalRows(stats: CourseStats | null) {
  if (!stats) {
    return [];
  }

  return [
    { label: '강의력', value: stats.teachingScore },
    { label: '난이도', value: stats.diffScore },
    { label: '과제', value: stats.workScore },
    { label: '출결', value: stats.attScore },
    { label: '학점', value: stats.gradScore },
    { label: '족보', value: stats.pastExamScore },
  ].filter((row): row is { label: string; value: number } => row.value !== null);
}

function getFitLabels(course: Course, reviews: Review[]) {
  const labels = reviews.flatMap((review) => review.recommendFor ?? []).filter(Boolean);

  if (labels.length > 0) {
    return [...new Set(labels)];
  }

  const normalized = `${course.attendance} ${course.workload} ${course.grading}`;

  if (course.type.includes('교양')) {
    return ['교양을 부담 없이 채우고 싶은 사람', '토론이나 과제를 감당할 수 있는 사람', '수업 분위기를 보고 고르는 사람'];
  }

  if (normalized.includes('많') || normalized.includes('엄격')) {
    return ['성실한 출석력을 가진 사람', '중간기말 대신 퀴즈로 대체하고 싶은 사람', '복습 루틴을 꾸준히 가져갈 사람'];
  }

  return ['전공 흐름을 차근차근 잡고 싶은 사람', '과제 부담을 미리 알고 준비하는 사람', '수강 전에 리뷰 맥락을 보는 사람'];
}

function collectKeywords(course: Course, reviews: Review[]) {
  const keywords = new Set<string>();

  for (const review of reviews) {
    review.examKeywords?.forEach((keyword) => keywords.add(keyword));
    review.recommendFor?.forEach((keyword) => keywords.add(keyword));
  }

  if (keywords.size === 0) {
    [course.workload, course.attendance, course.difficulty, course.grading, course.category, course.type]
      .filter(Boolean)
      .forEach((keyword) => keywords.add(keyword));
  }

  return [...keywords].slice(0, 8);
}

function getOneLineSummary(course: Course, reviews: Review[]) {
  const topReview = reviews.find((review) => review.oneLineTip?.trim()) ?? reviews[0];

  if (topReview?.oneLineTip) {
    return topReview.oneLineTip;
  }

  if (topReview?.content) {
    return topReview.content;
  }

  return getMoodCopy(course, reviews).summary;
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
  screen: {
    flex: 1,
    gap: 10,
  },
  topBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 2,
  },
  topTitle: {
    color: '#101827',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  topSubtitle: {
    color: '#8a93a3',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(219,226,237,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1b365f',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  backGlyph: {
    color: '#111827',
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '500',
    marginTop: -4,
  },
  iconButtonActive: {
    backgroundColor: '#eef4ff',
    borderColor: '#c5d9f8',
  },
  bookmarkGlyph: {
    width: 14,
    height: 19,
    borderWidth: 2,
    borderColor: '#111827',
    borderBottomWidth: 0,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    transform: [{ skewY: '-8deg' }],
  },
  bookmarkGlyphActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  moreGlyph: {
    flexDirection: 'row',
    gap: 3,
  },
  moreDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#111827',
  },
  cardRail: {
    gap: 16,
    alignItems: 'center',
  },
  slideFrame: {
    borderRadius: 30,
    padding: 1,
    backgroundColor: 'rgba(255,255,255,0.78)',
    shadowColor: '#1b365f',
    shadowOpacity: 0.09,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  slidePaper: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eef2f8',
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 22,
  },
  slideHeader: {
    gap: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  slideTitle: {
    color: '#111827',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  hairline: {
    height: 1,
    backgroundColor: '#eef1f6',
    marginTop: 24,
    marginBottom: 24,
  },
  slideBody: {
    flex: 1,
  },
  slideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerMeta: {
    flex: 1,
    color: '#8b95a6',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
  },
  footerRating: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  moodContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  bigRating: {
    fontSize: 58,
    lineHeight: 64,
    fontWeight: '900',
    letterSpacing: -2.4,
  },
  ratingMax: {
    color: '#8b95a6',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  growthWrap: {
    height: 185,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
  },
  growthOrb: {
    position: 'absolute',
    width: 172,
    height: 172,
    borderRadius: 86,
    bottom: 4,
  },
  barGroup: {
    height: 132,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 13,
  },
  growthBar: {
    width: 34,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  arrowStem: {
    position: 'absolute',
    width: 118,
    height: 16,
    borderRadius: 999,
    right: 30,
    top: 48,
    opacity: 0.58,
    transform: [{ rotate: '-34deg' }],
  },
  arrowHead: {
    position: 'absolute',
    right: 19,
    top: 34,
    width: 0,
    height: 0,
    borderLeftWidth: 17,
    borderRightWidth: 17,
    borderBottomWidth: 27,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '55deg' }],
  },
  growthDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.22,
  },
  quoteBox: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 7,
  },
  quoteGlyph: {
    fontSize: 28,
    lineHeight: 26,
    fontWeight: '900',
  },
  quoteBoxText: {
    color: '#253044',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '500',
    letterSpacing: -0.45,
  },
  signalEmpty: {
    flex: 1,
    justifyContent: 'space-around',
  },
  signalContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 18,
  },
  clipboardOrb: {
    alignSelf: 'center',
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipboard: {
    width: 86,
    height: 104,
    borderRadius: 15,
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.42)',
    paddingTop: 22,
    paddingHorizontal: 13,
    gap: 12,
  },
  clipTop: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    width: 38,
    height: 15,
    borderRadius: 8,
  },
  clipLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkMark: {
    width: 13,
    height: 13,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  clipLine: {
    flex: 1,
    height: 5,
    borderRadius: 999,
  },
  checkBadge: {
    position: 'absolute',
    right: 28,
    bottom: 28,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#ffffff',
  },
  checkBadgeText: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '900',
  },
  emptyMessage: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  signalList: {
    gap: 13,
  },
  signalRow: {
    gap: 7,
  },
  signalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signalLabel: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  signalValue: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  signalTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
    overflow: 'hidden',
  },
  signalFill: {
    height: '100%',
    borderRadius: 999,
  },
  fitContent: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  fitRow: {
    minHeight: 88,
    borderTopWidth: 1,
    borderTopColor: '#eef1f6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  fitIndexWrap: {
    width: 34,
  },
  fitIndex: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  fitIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitIconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fitText: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: -0.45,
  },
  keywordContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  keywordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  keywordChip: {
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  keywordText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  keywordSource: {
    minHeight: 78,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  keywordSourceText: {
    flex: 1,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  searchGlyph: {
    width: 36,
    height: 36,
  },
  searchCircle: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
  },
  searchHandle: {
    position: 'absolute',
    width: 15,
    height: 4,
    borderRadius: 999,
    left: 21,
    top: 24,
    transform: [{ rotate: '45deg' }],
  },
  lastQuoteContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  quoteCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastQuoteGlyph: {
    fontSize: 48,
    lineHeight: 48,
    fontWeight: '900',
    marginTop: -4,
  },
  lastQuoteText: {
    color: '#111827',
    fontSize: 21,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  pagination: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.page,
  },
  ctaButton: {
    flex: 1,
    minHeight: 54,
  },
});
