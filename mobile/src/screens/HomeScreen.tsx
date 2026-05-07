import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoursePosterCard } from '../components/CoursePosterCard';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllCourses,
  getFamousCourses,
  getGrowthCourses,
  getHoneyGeCourses,
  getVerifiedCourses,
} from '../lib/api/courses';
import { getReviewsByCourseId } from '../lib/api/reviews';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

type CourseWithPreview = Course & {
  latestReviewContent?: string;
};

type HomeFeedItem =
  | { type: 'section'; id: string; title: string; caption: string }
  | { type: 'row'; id: string; sectionId: string; courses: CourseWithPreview[] };

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const [recentCourses, setRecentCourses] = useState<CourseWithPreview[]>([]);
  const [famousCourses, setFamousCourses] = useState<Course[]>([]);
  const [honeyCourses, setHoneyCourses] = useState<Course[]>([]);
  const [verifiedCourses, setVerifiedCourses] = useState<Course[]>([]);
  const [growthCourses, setGrowthCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadHighlights = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [allCourses, famous, honey, verified, growth] = await Promise.all([
          getAllCourses(),
          getFamousCourses(),
          getHoneyGeCourses(),
          getVerifiedCourses(),
          getGrowthCourses(),
        ]);

        const recent = allCourses.slice(0, 6);
        const recentWithPreview = await Promise.all(
          recent.map(async (course) => {
            const reviews = await getReviewsByCourseId(course.id);
            return {
              ...course,
              latestReviewContent: reviews[0]?.content,
            };
          }),
        );

        if (!isActive) {
          return;
        }

        setRecentCourses(recentWithPreview);
        setFamousCourses(famous.slice(0, 4));
        setHoneyCourses(honey.slice(0, 4));
        setVerifiedCourses(verified.slice(0, 4));
        setGrowthCourses(growth.slice(0, 4));
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('메인 피드를 불러오지 못했습니다.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadHighlights();

    return () => {
      isActive = false;
    };
  }, []);

  const discoveryCourses = useMemo(() => {
    const seen = new Set<number>();
    const merged = [
      ...recentCourses,
      ...famousCourses,
      ...honeyCourses,
      ...verifiedCourses,
      ...growthCourses,
    ].filter((course) => {
      if (seen.has(course.id)) {
        return false;
      }
      seen.add(course.id);
      return true;
    });

    return merged.slice(0, 18);
  }, [famousCourses, growthCourses, honeyCourses, recentCourses, verifiedCourses]);

  const feedItems = useMemo(
    () => buildHomeFeed(discoveryCourses, user?.department),
    [discoveryCourses, user?.department],
  );
  const userDepartmentLabel = user?.department ?? '학과 미설정';
  const userName = isAuthenticated && user ? user.nickname : '선웅';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <FlatList
        data={isLoading || errorMessage ? [] : feedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={[styles.collectionHeader, { paddingTop: insets.top + spacing.group }]}>
              <View style={styles.homeIdentity}>
                <View style={styles.identityCopy}>
                  <Text style={styles.issueLabel}>{userName}님</Text>
                  <Text style={styles.collectionTitle}>인하평</Text>
                  <Text style={styles.collectionMeta}>@{userName}, {userDepartmentLabel}</Text>
                </View>
                <View style={styles.logoMark}>
                  <Text style={styles.logoText}>인하평</Text>
                  <View style={styles.logoRule} />
                </View>
              </View>
            </View>

            {isLoading ? <LoadingBlock /> : null}
            {!isLoading && errorMessage ? <ErrorBlock message={errorMessage} /> : null}

          </>
        }
        ListFooterComponent={null}
        renderItem={({ item, index }) => {
          if (item.type === 'section') {
            return (
              <View style={styles.sectionIntro}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
                <Text style={styles.sectionCaption}>{item.caption}</Text>
              </View>
            );
          }

          return (
            <View style={styles.galleryRow}>
              {item.courses.map((course, columnIndex) => {
                const absoluteIndex = index + columnIndex;
                return (
                  <View key={course.id} style={styles.galleryCell}>
                    <CoursePosterCard
                      course={course}
                      preview={course.latestReviewContent}
                      variant="medium"
                      index={absoluteIndex}
                      userDepartment={user?.department}
                      onPress={() => navigation.navigate({ name: 'CourseCollection', courseId: course.id })}
                    />
                  </View>
                );
              })}
            </View>
          );
        }}
        onScroll={(event) => navigation.onTabScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function LoadingBlock() {
  return (
    <View style={styles.stateBlock}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateText}>메인 피드를 정리하는 중입니다.</Text>
    </View>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <View style={[styles.stateBlock, styles.errorBlock]}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function buildHomeFeed(courses: CourseWithPreview[], userDepartment?: string): HomeFeedItem[] {
  const seen = new Set<number>();
  const items: HomeFeedItem[] = [];
  const byHotScore = (a: CourseWithPreview, b: CourseWithPreview) => getHotScore(b) - getHotScore(a);
  const isGeneralCourse = (course: CourseWithPreview) => course.type.includes('교양') || course.department.includes('교양');
  const isMajorCourse = (course: CourseWithPreview) =>
    !!userDepartment && course.department === userDepartment && !isGeneralCourse(course);
  const exactMajorCourses = [...courses].filter(isMajorCourse).sort(byHotScore);
  const fallbackMajorCourses = [...courses]
    .filter((course) => !isGeneralCourse(course) && (course.category.includes('전공') || course.type.includes('전공')))
    .sort(byHotScore);
  const majorCourses = (exactMajorCourses.length > 0 ? exactMajorCourses : fallbackMajorCourses).slice(0, 4);
  const hasExactMajor = exactMajorCourses.length > 0;

  const addSection = (id: string, title: string, caption: string, sectionCourses: CourseWithPreview[]) => {
    const uniqueCourses = sectionCourses.filter((course) => {
      if (seen.has(course.id)) {
        return false;
      }
      seen.add(course.id);
      return true;
    });

    if (uniqueCourses.length === 0) {
      return;
    }

    items.push({ type: 'section', id: `section-${id}`, title, caption });
    for (let index = 0; index < uniqueCourses.length; index += 1) {
      items.push({
        type: 'row',
        id: `row-${id}-${index}`,
        sectionId: id,
        courses: uniqueCourses.slice(index, index + 1),
      });
    }
  };

  addSection(
    'major-hot',
    hasExactMajor && userDepartment ? `${userDepartment}에서 많이 보는 강의` : '전공에서 많이 보는 강의',
    hasExactMajor && userDepartment
      ? '내 학과 기준으로 평점과 리뷰 수가 좋은 강의입니다.'
      : '학과 데이터가 적을 때는 평점 흐름이 좋은 전공 후보를 먼저 보여줍니다.',
    majorCourses,
  );

  addSection(
    'general-hot',
    '교양에서 뜨는 강의',
    '리뷰가 많고 평점 흐름이 좋은 교양 강의를 먼저 모았습니다.',
    [...courses].filter(isGeneralCourse).sort(byHotScore).slice(0, 4),
  );

  addSection(
    'recommended',
    '추천할 만한 강의',
    '전공 구분 없이 평점과 강의평 수가 좋은 강의를 골랐습니다.',
    [...courses].sort(byHotScore).slice(0, 6),
  );

  return items;
}

function getHotScore(course: Course) {
  const reviewWeight = Math.min(course.reviewCount, 40) * 1.7;
  const ratingWeight = course.rating * 16;
  const workloadPenalty = `${course.workload}`.toLowerCase().includes('hard') ? 3 : 0;
  return ratingWeight + reviewWeight - workloadPenalty;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9fd',
  },
  content: {
    paddingBottom: 104,
    gap: 8,
  },
  collectionHeader: {
    paddingHorizontal: spacing.page,
    paddingBottom: 0,
    alignItems: 'flex-start',
    gap: 0,
  },
  homeIdentity: {
    width: '100%',
    minHeight: 126,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  identityCopy: {
    flex: 1,
    gap: 5,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    marginLeft: 16,
  },
  logoText: {
    color: '#16499a',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoRule: {
    display: 'none',
  },
  heroBanner: {
    width: '100%',
    minHeight: 236,
    borderRadius: 32,
    backgroundColor: '#111827',
    overflow: 'hidden',
    padding: 22,
    justifyContent: 'space-between',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 5,
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  heroPatternColumn: {
    position: 'absolute',
    right: 78,
    top: -30,
    width: 82,
    height: 310,
    backgroundColor: 'rgba(215,173,77,0.28)',
    transform: [{ rotate: '16deg' }],
  },
  heroPatternColumnSoft: {
    position: 'absolute',
    right: -28,
    top: 44,
    width: 96,
    height: 230,
    backgroundColor: 'rgba(255,255,255,0.09)',
    transform: [{ rotate: '-11deg' }],
  },
  heroPatternCircle: {
    position: 'absolute',
    right: 30,
    bottom: -42,
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: 'rgba(22,73,154,0.45)',
  },
  heroContent: {
    maxWidth: 248,
    gap: 9,
  },
  issueLabel: {
    color: '#16499a',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  collectionTitle: {
    color: '#121826',
    fontSize: 37,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -1.6,
    textAlign: 'left',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  collectionMeta: {
    overflow: 'hidden',
    borderRadius: 999,
    color: '#65738a',
    alignSelf: 'flex-start',
    fontSize: 13,
    lineHeight: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  heroVisualShelf: {
    alignSelf: 'flex-end',
    width: 162,
    height: 78,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  heroMiniCardPrimary: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#fffdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMiniScore: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  heroMiniLabel: {
    color: '#9aa2af',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
  },
  heroMiniStack: {
    flex: 1,
    gap: 8,
  },
  heroMiniBar: {
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  heroMiniBarShort: {
    width: '72%',
  },
  heroMiniBarSoft: {
    width: '48%',
    backgroundColor: 'rgba(215,173,77,0.78)',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBubble: {
    minWidth: 52,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    paddingHorizontal: 13,
  },
  filterBubbleText: {
    fontSize: 12,
    fontWeight: '900',
  },
  collectionDescription: {
    color: '#65738a',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: -0.45,
    maxWidth: 320,
  },
  editorPick: {
    marginHorizontal: spacing.page,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.58)',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
  },
  editorPickVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  editorPickPoster: {
    width: 78,
    height: 78,
    borderRadius: 18,
    backgroundColor: '#d7ad4d',
  },
  editorPickInfo: {
    flex: 1,
    gap: 7,
  },
  editorPickTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorPickKicker: {
    color: '#16499a',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  editorPickCount: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    color: '#16499a',
    fontSize: 10,
    fontWeight: '900',
  },
  editorPickTitle: {
    color: '#121826',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  editorPickMeta: {
    color: '#65738a',
    fontSize: 11,
    fontWeight: '800',
  },
  editorPickAction: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 13,
    paddingVertical: 8,
    color: '#16499a',
    fontSize: 12,
    fontWeight: '900',
  },
  shelfSection: {
    gap: 10,
  },
  shelfTitleRow: {
    paddingHorizontal: spacing.page,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  shelfTitle: {
    color: '#121826',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  shelfMeta: {
    color: '#9aa2af',
    fontSize: 11,
    fontWeight: '800',
  },
  shelfRail: {
    paddingHorizontal: spacing.page,
    gap: 10,
  },
  shelfCard: {
    width: 186,
    minHeight: 126,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: 16,
    gap: 7,
  },
  shelfCardActive: {
    backgroundColor: 'rgba(238,244,255,0.78)',
    borderColor: 'rgba(22,73,154,0.18)',
  },
  shelfKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  shelfCardTitle: {
    color: '#121826',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  shelfCardDescription: {
    color: '#65738a',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionIntro: {
    paddingHorizontal: spacing.page,
    gap: 3,
    paddingTop: 18,
    paddingBottom: 4,
  },
  sectionTitle: {
    color: '#121826',
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  sectionCaption: {
    color: '#7b8492',
    fontSize: 11,
    fontWeight: '600',
  },
  galleryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
    paddingHorizontal: spacing.page,
  },
  galleryCell: {
    flex: 1,
  },
  galleryGhost: {
    flex: 1,
  },
  stateBlock: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: spacing.related,
  },
  stateText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBlock: {
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.16)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
