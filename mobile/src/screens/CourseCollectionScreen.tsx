import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCourseById } from '../lib/api/courses';
import { getReviewsByCourseId } from '../lib/api/reviews';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course, Review } from '../types/models';
import { AppRoute } from '../types/navigation';

interface Props {
  navigation: AppNavigation;
  route: Extract<AppRoute, { name: 'CourseCollection' }>;
}

const ART_PALETTES = [
  { bg: '#082f6f', deep: '#061f4d', accent: '#a9caff', ink: '#ffffff', muted: 'rgba(255,255,255,0.68)' },
  { bg: '#0f1b2d', deep: '#111827', accent: '#d7b76a', ink: '#ffffff', muted: 'rgba(255,255,255,0.68)' },
  { bg: '#07364c', deep: '#052838', accent: '#9ed7e8', ink: '#ffffff', muted: 'rgba(255,255,255,0.70)' },
  { bg: '#fffaf5', deep: '#f0dfcb', accent: '#17325f', ink: '#152033', muted: '#716252' },
] as const;

const CARD_NEWS_THEMES = [
  { paper: '#fffdf8', accent: '#17325f', line: 'rgba(23,50,95,0.13)' },
  { paper: '#fbfaf6', accent: '#176a42', line: 'rgba(23,106,66,0.13)' },
  { paper: '#fffaf5', accent: '#b14524', line: 'rgba(177,69,36,0.14)' },
  { paper: '#f8fbff', accent: '#315f7b', line: 'rgba(49,95,123,0.14)' },
  { paper: '#fffdf9', accent: '#8f1d4d', line: 'rgba(143,29,77,0.14)' },
] as const;

type ExhibitionItem =
  | {
      id: string;
      kind: 'mood';
      title: string;
      body: string;
      meta: string;
      rating: number;
    }
  | {
      id: string;
      kind: 'signal';
      title: string;
      meta: string;
      rating: number;
      signals: Array<{ label: string; value: number }>;
    }
  | {
      id: string;
      kind: 'fit';
      title: string;
      meta: string;
      rating: number;
      fits: string[];
    }
  | {
      id: string;
      kind: 'quote';
      title: string;
      body: string;
      meta: string;
      rating: number;
    }
  | {
      id: string;
      kind: 'keywords';
      title: string;
      meta: string;
      rating: number;
      keywords: string[];
    };

export function CourseCollectionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const cardWidth = Math.min(width - 88, 430);
  const cardHeight = Math.max(590, height - insets.top - insets.bottom - 132);
  const sideInset = Math.max((width - cardWidth) / 2, spacing.page);

  useEffect(() => {
    let isActive = true;

    const loadCollection = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [courseData, reviewData] = await Promise.all([
          getCourseById(route.courseId),
          getReviewsByCourseId(route.courseId),
        ]);

        if (!isActive) {
          return;
        }

        setCourse(courseData);
        setReviews(reviewData);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : '강의 전시를 불러오지 못했습니다.');
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

  const exhibitionItems = useMemo(() => {
    if (!course) {
      return [];
    }

    const topReview = reviews[0];
    const keywords = collectKeywords(course, reviews);
    const mood = getCourseMood(course, reviews);

    return [
      {
        id: `mood-${course.id}`,
        kind: 'mood' as const,
        title: mood.label,
        body: mood.summary,
        meta: `${course.department} · ${course.type}`,
        rating: course.rating,
      },
      {
        id: `signal-${course.id}`,
        kind: 'signal' as const,
        title: '수강 신호',
        meta: '과제 · 출결 · 시험 · 학점',
        rating: course.rating,
        signals: [
          { label: '과제', value: metricToScore(course.workload) },
          { label: '출결', value: metricToScore(course.attendance) },
          { label: '시험', value: metricToScore(topReview?.examInfo ?? course.difficulty) },
          { label: '학점', value: 6 - metricToScore(course.grading) },
        ],
      },
      {
        id: `fit-${course.id}`,
        kind: 'fit' as const,
        title: '잘 맞는 사람',
        meta: '추천 대상',
        rating: course.rating,
        fits: getFitLabels(course, reviews),
      },
      {
        id: `quote-${course.id}`,
        kind: 'quote' as const,
        title: topReview ? '대표 한 문장' : '첫 리뷰를 기다리는 강의',
        body: topReview?.oneLineTip || topReview?.content || '이 강의는 아직 상세 리뷰가 부족해요. 수강 경험이 있다면 후배들이 바로 참고할 수 있도록 첫 기록을 남겨주세요.',
        meta: topReview ? `${topReview.semester} · 도움 ${topReview.likes}` : `${course.professor} 교수님`,
        rating: topReview?.rating ?? course.rating,
      },
      {
        id: `keywords-${course.id}`,
        kind: 'keywords' as const,
        title: '키워드 타일',
        meta: `신호 ${keywords.length}개`,
        rating: course.rating,
        keywords,
      },
    ];
  }, [course, reviews]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 16));
    setActiveIndex(Math.max(0, Math.min(nextIndex, exhibitionItems.length - 1)));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.stateSafeArea}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.stateText}>강의 전시를 준비하는 중입니다.</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !course) {
    return (
      <SafeAreaView style={styles.stateSafeArea}>
        <Text style={styles.errorText}>{errorMessage || '강의 정보를 찾지 못했습니다.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.screen, { paddingTop: insets.top + spacing.related, paddingBottom: insets.bottom + spacing.related }]}>
        <View style={styles.viewerTitleBlock}>
          <Text style={styles.collectionTitle} numberOfLines={1}>
            {course.name}
          </Text>
          <Text style={styles.collectionSubtitle} numberOfLines={1}>
            {course.professor}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.viewerScroll}
          horizontal
          pagingEnabled={false}
          decelerationRate="fast"
          snapToInterval={cardWidth + 16}
          snapToAlignment="start"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.viewerRail, { paddingHorizontal: sideInset }]}
          onMomentumScrollEnd={handleMomentumEnd}
        >
          {exhibitionItems.map((item, index) => (
            <ReviewExhibitCard
              key={item.id}
              item={item}
              index={index}
              width={cardWidth}
              height={cardHeight}
              course={course}
            />
          ))}
        </ScrollView>

        <View style={styles.dotRail}>
          {exhibitionItems.map((item, index) => (
            <View
              key={`dot-${item.id}`}
              style={[styles.dot, activeIndex === index ? styles.dotActive : null]}
            />
          ))}
        </View>

        <View style={styles.actionButtonRow}>
          <Pressable
            style={styles.actionButtonOutline}
            onPress={() => navigation.navigate({ name: 'CourseDetail', courseId: course.id })}
          >
            <Text style={styles.actionButtonOutlineText}>상세 강의평 보기</Text>
          </Pressable>
          <Pressable
            style={styles.actionButtonFill}
            onPress={() => navigation.navigate({ name: 'ReviewWrite', courseId: course.id })}
          >
            <Text style={styles.actionButtonFillText}>강의평 쓰기</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  icon,
  active = false,
  onPress,
}: {
  label: string;
  icon: 'link' | 'down' | 'info';
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.actionItem} onPress={onPress}>
      <View style={[styles.actionIconCircle, active ? styles.actionIconCircleActive : null]}>
        {icon === 'link' ? <View style={styles.linkIcon} /> : null}
        {icon === 'down' ? <Text style={styles.actionGlyph}>+</Text> : null}
        {icon === 'info' ? <Text style={[styles.actionGlyph, active ? styles.actionGlyphActive : null]}>i</Text> : null}
      </View>
      <Text style={[styles.actionLabel, active ? styles.actionLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function ReviewExhibitCard({
  item,
  index,
  width,
  height,
  course,
}: {
  item: ExhibitionItem;
  index: number;
  width: number;
  height: number;
  course: Course;
}) {
  const theme = CARD_NEWS_THEMES[index % CARD_NEWS_THEMES.length];
  const metrics =
    item.kind === 'signal'
      ? item.signals
      : [
          { label: '평점', value: Math.round(item.rating) },
          { label: '리뷰', value: Math.min(course.reviewCount || 1, 5) },
          { label: '학점', value: Math.min(course.credits || 3, 5) },
          { label: '난이도', value: metricToScore(course.difficulty) },
        ];
  const cardNews = getCardNewsCopy(item, course);

  return (
    <View style={[styles.exhibitCard, { width, height }]}>
      <View style={[styles.cardNewsCanvas, { backgroundColor: theme.paper }]}>
        <View style={styles.cardNewsHeader}>
          <View style={[styles.cardNewsIssue, { backgroundColor: theme.accent }]}>
            <Text style={styles.cardNewsIssueText}>ISSUE {String(index + 1).padStart(2, '0')}</Text>
          </View>
          <Text style={styles.cardNewsType}>{cardNews.kicker}</Text>
        </View>

        <View style={styles.cardNewsHero}>
          <Text style={[styles.cardNewsKicker, { color: theme.accent }]}>{cardNews.label}</Text>
          <Text style={styles.cardNewsHeadline} numberOfLines={3}>
            {cardNews.headline}
          </Text>
          <Text style={styles.cardNewsCourse} numberOfLines={2}>
            {course.name}
          </Text>
        </View>

        <View style={[styles.cardNewsQuoteBox, { borderColor: theme.line }]}>
          <Text style={styles.cardNewsBody} numberOfLines={5}>
            {cardNews.body}
          </Text>
        </View>

        <View style={styles.cardNewsFeatureArea}>
          {item.kind === 'mood' ? (
            <View style={styles.cardNewsOverviewPanel}>
              <View style={[styles.cardNewsBigStat, { backgroundColor: theme.accent }]}>
                <Text style={styles.cardNewsBigStatValue}>{item.rating.toFixed(1)}</Text>
                <Text style={styles.cardNewsBigStatLabel}>STAR RATING</Text>
              </View>
              <View style={styles.cardNewsSummaryStack}>
                <Text style={styles.cardNewsSummaryLabel}>전체 분위기</Text>
                <Text style={styles.cardNewsSummaryText} numberOfLines={3}>{item.title}</Text>
              </View>
            </View>
          ) : null}

          {item.kind === 'signal' ? (
            <View style={styles.cardNewsSignalList}>
              {item.signals.map((signal) => (
                <View key={`${item.id}-signal-${signal.label}`} style={styles.cardNewsSignalRow}>
                  <Text style={styles.cardNewsSignalLabel}>{signal.label}</Text>
                  <View style={styles.cardNewsSignalTrack}>
                    {Array.from({ length: 5 }).map((_, signalIndex) => (
                      <View
                        key={`${item.id}-${signal.label}-${signalIndex}`}
                        style={[
                          styles.cardNewsSignalBar,
                          {
                            backgroundColor: signalIndex < signal.value ? theme.accent : theme.line,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {item.kind === 'fit' ? (
            <View style={styles.cardNewsFitGrid}>
              {item.fits.slice(0, 4).map((fit, fitIndex) => (
                <View key={`${item.id}-fit-${fit}`} style={[styles.cardNewsFitCard, { borderColor: theme.line }]}>
                  <Text style={[styles.cardNewsFitIndex, { color: theme.accent }]}>
                    {String(fitIndex + 1).padStart(2, '0')}
                  </Text>
                  <Text style={styles.cardNewsFitText} numberOfLines={2}>{fit}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {item.kind === 'quote' ? (
            <View style={[styles.cardNewsQuotePanel, { borderColor: theme.line }]}>
              <Text style={[styles.cardNewsQuoteMark, { color: theme.accent }]}>“</Text>
              <Text style={styles.cardNewsQuoteText} numberOfLines={5}>{item.body}</Text>
            </View>
          ) : null}

          {item.kind === 'keywords' ? (
            <View style={styles.cardNewsChipGrid}>
              {item.keywords.slice(0, 6).map((keyword) => (
                <Text key={`${item.id}-keyword-${keyword}`} style={[styles.cardNewsChip, { borderColor: theme.line }]}>
                  {keyword}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.cardNewsFooter}>
          {metrics.slice(0, 4).map((metric) => (
            <View key={`${item.id}-${metric.label}`} style={[styles.cardNewsMetric, { borderColor: theme.line }]}>
              <Text style={styles.cardNewsMetricLabel}>{metric.label}</Text>
              <Text style={styles.cardNewsMetricValue}>{metric.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardNewsMetaRow}>
          <Text style={styles.cardNewsMeta} numberOfLines={1}>
            {course.professor} · {course.department}
          </Text>
          <Text style={styles.cardNewsMeta}>{course.credits || 3}학점</Text>
        </View>
      </View>
    </View>
  );
}

function SignalArtwork({
  item,
  color,
}: {
  item: Extract<ExhibitionItem, { kind: 'signal' }>;
  color: string;
}) {
  return (
    <View style={styles.signalBoard}>
      {item.signals.map((signal) => (
        <View key={signal.label} style={styles.signalRow}>
          <Text style={[styles.signalRowLabel, { color }]}>{signal.label}</Text>
          <View style={styles.signalBlocks}>
            {Array.from({ length: 5 }).map((_, index) => (
              <View
                key={`${signal.label}-${index}`}
                style={[
                  styles.signalBlock,
                  { backgroundColor: index < signal.value ? color : 'rgba(255,255,255,0.20)' },
                ]}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function FitArtwork({
  item,
  color,
  accent,
}: {
  item: Extract<ExhibitionItem, { kind: 'fit' }>;
  color: string;
  accent: string;
}) {
  return (
    <View style={styles.fitBoard}>
      {item.fits.slice(0, 4).map((fit, index) => (
        <View key={fit} style={styles.fitFigure}>
          <View style={[styles.fitHead, { backgroundColor: index === 0 ? accent : color }]} />
          <View style={[styles.fitBody, { backgroundColor: index === 0 ? accent : color }]} />
          <Text style={[styles.fitText, { color }]} numberOfLines={1}>{fit}</Text>
        </View>
      ))}
    </View>
  );
}

function KeywordArtwork({
  item,
  color,
  accent,
}: {
  item: Extract<ExhibitionItem, { kind: 'keywords' }>;
  color: string;
  accent: string;
}) {
  return (
    <View style={styles.keywordBoard}>
      {item.keywords.slice(0, 8).map((keyword, index) => (
        <View
          key={keyword}
          style={[
            styles.keywordTile,
            {
              backgroundColor: index % 2 === 0 ? color : accent,
              transform: [{ rotate: `${index % 2 === 0 ? -3 : 3}deg` }],
            },
          ]}
        >
          <Text style={styles.keywordTileText} numberOfLines={1}>{keyword}</Text>
        </View>
      ))}
    </View>
  );
}

function getExhibitLabel(kind: ExhibitionItem['kind']) {
  switch (kind) {
    case 'mood':
      return '강의 분위기';
    case 'signal':
      return '수강 신호';
    case 'fit':
      return '추천 대상';
    case 'quote':
      return '대표 후기';
    case 'keywords':
      return '핵심 키워드';
    default:
      return '큐레이터 노트';
  }
}

function getCardNewsCopy(item: ExhibitionItem, course: Course) {
  if (item.kind === 'mood') {
    return {
      kicker: 'OVERVIEW',
      label: '전체 분위기',
      headline: `${course.name}는 ${item.title}`,
      title: item.title,
      body: item.body,
    };
  }

  if (item.kind === 'signal') {
    return {
      kicker: 'CHECK POINT',
      label: '수강 체크포인트',
      headline: '수강 전 먼저 볼 네 가지 신호',
      title: '과제, 출결, 시험, 학점',
      body: '후기에서 자주 확인하는 기준을 한 장에 모았습니다.',
    };
  }

  if (item.kind === 'fit') {
    return {
      kicker: 'WHO FITS',
      label: '추천 대상',
      headline: '이런 학생에게 더 잘 맞아요',
      title: item.fits.slice(0, 2).join(' · '),
      body: item.fits.join(', '),
    };
  }

  if (item.kind === 'quote') {
    return {
      kicker: 'REVIEW LINE',
      label: '대표 후기',
      headline: item.title,
      title: '대표 후기',
      body: item.body,
    };
  }

  return {
    kicker: 'KEYWORDS',
    label: '핵심 키워드',
    headline: '후기에서 뽑은 핵심 키워드',
    title: item.keywords.slice(0, 3).join(' · '),
    body: item.keywords.join(', '),
  };
}

function getCourseMood(course: Course, reviews: Review[]) {
  const text = `${course.difficulty} ${course.workload} ${course.attendance} ${reviews.map((review) => review.content).join(' ')}`.toLowerCase();

  if (text.includes('hard') || text.includes('heavy') || text.includes('많') || text.includes('어렵')) {
    return {
      label: '성장형',
      summary: '부담은 있지만 듣고 나면 남는 게 많다는 신호가 강해요.',
    };
  }

  if (course.type.includes('교양')) {
    return {
      label: '교양 컬렉션',
      summary: '가볍게 볼 수 있지만 취향에 맞는지 확인하면 좋은 강의예요.',
    };
  }

  if (course.rating >= 4.2) {
    return {
      label: '추천작',
      summary: '만족도와 후기 흐름이 좋아 먼저 열어볼 만한 강의예요.',
    };
  }

  return {
    label: '균형형',
    summary: '난이도, 과제, 출결을 함께 보고 판단하기 좋은 강의예요.',
  };
}

function collectKeywords(course: Course, reviews: Review[]) {
  const keywords = new Set<string>();

  for (const review of reviews) {
    review.examKeywords?.forEach((keyword) => keywords.add(keyword));
    review.recommendFor?.forEach((keyword) => keywords.add(keyword));
  }

  if (keywords.size === 0) {
    keywords.add(course.workload);
    keywords.add(course.attendance);
    keywords.add(course.difficulty);
    keywords.add(course.grading);
  }

  return [...keywords].filter(Boolean).slice(0, 8);
}

function getFitLabels(course: Course, reviews: Review[]) {
  const labels = reviews.flatMap((review) => review.recommendFor ?? []).filter(Boolean);

  if (labels.length > 0) {
    return [...new Set(labels)].slice(0, 4);
  }

  if (course.type.includes('교양')) {
    return ['교양 탐색', '부담 조절', '학점 관리', '취향 확인'];
  }

  return ['전공 감각', '성실형', '복습형', '성장 지향'];
}

function metricToScore(value?: string | null) {
  const normalized = `${value ?? ''}`.toLowerCase();

  if (normalized.includes('easy') || normalized.includes('낮') || normalized.includes('적')) {
    return 2;
  }

  if (normalized.includes('hard') || normalized.includes('heavy') || normalized.includes('높') || normalized.includes('많')) {
    return 4;
  }

  return 3;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9fd',
  },
  screen: {
    flex: 1,
    gap: 12,
  },
  stateSafeArea: {
    flex: 1,
    backgroundColor: '#f7f9fd',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.related,
    paddingHorizontal: spacing.page,
  },
  stateText: {
    color: '#66748a',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.group,
    justifyContent: 'space-between',
    gap: spacing.related,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16499a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  roundButtonText: {
    color: '#121826',
    fontSize: 30,
    fontWeight: '500',
    marginTop: -3,
  },
  infoButtonText: {
    color: '#121826',
    fontSize: 18,
    fontWeight: '900',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(18,24,38,0.18)',
  },
  viewerTitleBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.section,
    gap: 3,
  },
  collectionTitle: {
    color: '#121826',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  collectionSubtitle: {
    color: '#85858d',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  viewerScroll: {
    flex: 1,
  },
  viewerRail: {
    gap: 16,
    alignItems: 'center',
  },
  exhibitCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: 12,
    shadowColor: '#16499a',
    shadowOpacity: 0.10,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
  },
  cardNewsCanvas: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  cardNewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.related,
  },
  cardNewsIssue: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cardNewsIssueText: {
    color: '#ffffff',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  cardNewsType: {
    color: 'rgba(18,24,38,0.46)',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  cardNewsHero: {
    gap: 9,
    paddingTop: 18,
  },
  cardNewsKicker: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  cardNewsHeadline: {
    color: '#121826',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1.45,
  },
  cardNewsCourse: {
    color: 'rgba(18,24,38,0.58)',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  cardNewsQuoteBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 18,
    marginTop: 6,
  },
  cardNewsBody: {
    color: '#384152',
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  cardNewsFeatureArea: {
    minHeight: 128,
    justifyContent: 'center',
  },
  cardNewsOverviewPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardNewsSummaryStack: {
    flex: 1,
    gap: 6,
  },
  cardNewsSummaryLabel: {
    color: 'rgba(18,24,38,0.48)',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  cardNewsSummaryText: {
    color: '#121826',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  cardNewsSignalList: {
    gap: 12,
  },
  cardNewsSignalRow: {
    gap: 7,
  },
  cardNewsSignalLabel: {
    color: '#121826',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  cardNewsSignalTrack: {
    flexDirection: 'row',
    gap: 6,
  },
  cardNewsSignalBar: {
    flex: 1,
    height: 12,
    borderRadius: 999,
  },
  cardNewsChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  cardNewsFitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  cardNewsFitCard: {
    width: '48%',
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.52)',
  },
  cardNewsFitIndex: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  cardNewsFitText: {
    color: '#121826',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  cardNewsChip: {
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    color: '#121826',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  cardNewsQuotePanel: {
    borderLeftWidth: 3,
    paddingLeft: 16,
    paddingVertical: 4,
    gap: 2,
  },
  cardNewsQuoteMark: {
    fontSize: 42,
    lineHeight: 38,
    fontWeight: '900',
  },
  cardNewsQuoteText: {
    color: '#121826',
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  cardNewsBigStat: {
    alignSelf: 'flex-start',
    minWidth: 142,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  cardNewsBigStatValue: {
    color: '#ffffff',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  cardNewsBigStatLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  cardNewsFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  cardNewsMetric: {
    flex: 1,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  cardNewsMetricLabel: {
    color: 'rgba(18,24,38,0.48)',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
  },
  cardNewsMetricValue: {
    marginTop: 4,
    color: '#121826',
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  cardNewsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardNewsMeta: {
    flexShrink: 1,
    color: 'rgba(18,24,38,0.48)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  exhibitCanvas: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#e8e5df',
    overflow: 'hidden',
    padding: 10,
    gap: 10,
  },
  sheetTop: {
    height: 236,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#d1bfb7',
  },
  sheetGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetGridVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '25%',
    width: 1,
    backgroundColor: 'rgba(18,24,38,0.36)',
  },
  sheetGridVerticalAlt: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '55%',
    width: 1,
    backgroundColor: 'rgba(18,24,38,0.28)',
  },
  sheetGridHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '36%',
    height: 1,
    backgroundColor: 'rgba(18,24,38,0.34)',
  },
  sheetGridHorizontalAlt: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '68%',
    height: 1,
    backgroundColor: 'rgba(18,24,38,0.26)',
  },
  courseNeedleWrap: {
    position: 'absolute',
    left: '30%',
    bottom: 48,
    width: 94,
    height: 128,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  courseNeedleBase: {
    position: 'absolute',
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  courseNeedle: {
    position: 'absolute',
    bottom: 14,
    width: 52,
    height: 112,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    transform: [{ scaleX: 0.72 }],
  },
  courseNeedleArm: {
    position: 'absolute',
    bottom: 24,
    width: 4,
    height: 110,
    borderRadius: 999,
    transform: [{ rotate: '23deg' }],
  },
  courseTitlePanel: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    right: 94,
    borderRadius: 12,
    backgroundColor: 'rgba(225,213,207,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  coursePanelKicker: {
    color: 'rgba(18,24,38,0.54)',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  coursePanelTitle: {
    marginTop: 3,
    color: '#111827',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  coursePanelMeta: {
    marginTop: 5,
    color: 'rgba(18,24,38,0.62)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  sideControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 70,
    gap: 8,
  },
  levelPanel: {
    height: 92,
    borderRadius: 7,
    backgroundColor: '#c3aa6c',
    paddingHorizontal: 9,
    paddingVertical: 7,
    justifyContent: 'space-between',
  },
  levelSign: {
    color: '#171717',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '500',
  },
  levelTicks: {
    alignItems: 'flex-end',
    gap: 7,
  },
  levelTick: {
    width: 17,
    height: 1,
    backgroundColor: 'rgba(18,24,38,0.58)',
  },
  swingPanel: {
    height: 48,
    borderRadius: 6,
    backgroundColor: '#9ebed0',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  swingLabel: {
    color: '#121826',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  swingValue: {
    color: '#121826',
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '300',
    letterSpacing: -0.6,
  },
  keyPanel: {
    height: 56,
    borderRadius: 8,
    backgroundColor: '#d64a20',
    paddingHorizontal: 9,
    justifyContent: 'center',
  },
  keyLabel: {
    color: '#421103',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  keyValue: {
    color: '#421103',
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '300',
  },
  sheetBottom: {
    flex: 1,
    minHeight: 290,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#d8d1c6',
  },
  mosaicBlock: {
    position: 'absolute',
    padding: 12,
    overflow: 'hidden',
  },
  mosaicLarge: {
    left: 0,
    top: 0,
    width: '39%',
    height: '63%',
  },
  mosaicTall: {
    right: 0,
    top: 0,
    width: '61%',
    height: '49%',
  },
  mosaicSmall: {
    left: '39%',
    top: '49%',
    width: '43%',
    height: '15%',
  },
  mosaicBottom: {
    left: 0,
    bottom: 0,
    width: '82%',
    height: '37%',
  },
  mosaicSide: {
    right: 0,
    bottom: 0,
    width: '18%',
    height: '51%',
  },
  mosaicKicker: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  mosaicTitle: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  mosaicVerticalText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  mosaicSmallText: {
    color: '#4a3d21',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  mosaicBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  mosaicSideText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    transform: [{ rotate: '90deg' }],
  },
  metricsOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 7,
  },
  metricMini: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(18,24,38,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  metricMiniLabel: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
  },
  metricMiniValue: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '900',
  },
  artworkFrame: {
    minHeight: 420,
    padding: spacing.group,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  artworkDepth: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
  },
  artCircleLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -54,
    top: 36,
    opacity: 0.23,
  },
  artCircleSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -38,
    bottom: 52,
    opacity: 0.18,
  },
  artLine: {
    position: 'absolute',
    width: 140,
    height: 2,
    left: 18,
    top: 86,
    opacity: 0.4,
  },
  artGrid: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.34,
  },
  artGridCell: {
    width: '33.333%',
    height: 46,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridMark: {
    width: 24,
    height: 8,
    borderRadius: 999,
  },
  artworkTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.related,
  },
  artworkMeta: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  ratingPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.related,
    paddingVertical: 8,
  },
  ratingPillText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  artworkTitle: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: -1.4,
  },
  signalBoard: {
    gap: spacing.group,
  },
  signalRow: {
    gap: 7,
  },
  signalRowLabel: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  signalBlocks: {
    flexDirection: 'row',
    gap: 7,
  },
  signalBlock: {
    flex: 1,
    height: 18,
    borderRadius: 5,
  },
  fitBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.related,
    paddingBottom: spacing.tight,
  },
  fitFigure: {
    width: '46%',
    alignItems: 'center',
    gap: 7,
  },
  fitHead: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  fitBody: {
    width: 58,
    height: 42,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  fitText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  keywordBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.related,
    alignContent: 'center',
    paddingBottom: 8,
  },
  keywordTile: {
    borderRadius: 16,
    paddingHorizontal: spacing.related,
    paddingVertical: 13,
    maxWidth: '47%',
  },
  keywordTileText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  labelPlate: {
    paddingHorizontal: spacing.group,
    paddingTop: spacing.group,
    paddingBottom: spacing.group,
    gap: spacing.tight,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
  },
  labelTitle: {
    color: '#121826',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  labelBody: {
    color: '#3f4758',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  labelMeta: {
    color: '#85858d',
    fontSize: 12,
    fontWeight: '800',
  },
  dotRail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#c3c3c8',
  },
  dotActive: {
    width: 8,
    height: 8,
    backgroundColor: '#121826',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.related,
    paddingHorizontal: spacing.page,
  },
  actionItem: {
    alignItems: 'center',
    gap: spacing.tight,
    width: 58,
  },
  actionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eeeeef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconCircleActive: {
    backgroundColor: '#16499a',
  },
  actionLabel: {
    color: '#8f8f95',
    fontSize: 11,
    fontWeight: '800',
  },
  actionLabelActive: {
    color: '#16499a',
  },
  actionGlyph: {
    color: '#121826',
    fontSize: 24,
    fontWeight: '500',
    marginTop: -2,
  },
  actionGlyphActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  linkIcon: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#121826',
    transform: [{ rotate: '-35deg' }],
  },
  playAction: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#767676',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    marginBottom: 18,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 18,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ffffff',
    marginLeft: 4,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  actionButtonOutline: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#c8c8cc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  actionButtonOutlineText: {
    color: '#121826',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  actionButtonFill: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonFillText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
