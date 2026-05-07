import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getPointHistory } from '../lib/api/points';
import { deleteReview, getMyReviews } from '../lib/api/reviews';
import { departments } from '../lib/departments';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { PointHistoryItem, Review } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

const archiveFilters = [
  { key: 'reviews', label: '리뷰', color: '#121826' },
  { key: 'points', label: '포인트', color: '#16499a' },
  { key: 'profile', label: '계정', color: '#226d68' },
] as const;

export function MyPageScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut, updateProfile } = useAuth();
  const [pointHistory, setPointHistory] = useState<PointHistoryItem[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [activeFilter, setActiveFilter] = useState<(typeof archiveFilters)[number]['key']>('reviews');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(user?.department ?? '');
  const [isUpdatingDepartment, setIsUpdatingDepartment] = useState(false);

  const loadMyData = async () => {
    if (!user) {
      setPointHistory([]);
      setMyReviews([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const [history, reviews] = await Promise.all([getPointHistory(), getMyReviews()]);
      setPointHistory(history);
      setMyReviews(reviews);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '내 정보를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMyData();
  }, [user]);

  useEffect(() => {
    setSelectedDepartment(user?.department ?? '');
  }, [user?.department]);

  const reviewRows = useMemo(() => {
    const rows: Review[][] = [];
    for (let index = 0; index < myReviews.length; index += 2) {
      rows.push(myReviews.slice(index, index + 2));
    }
    return rows;
  }, [myReviews]);

  const handleLogout = async () => {
    await signOut();
    navigation.switchTab('Home');
  };

  const handleDeleteReview = (reviewId: number) => {
    Alert.alert('강의평 삭제', '이 강의평을 내 전시관에서 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReview(reviewId);
            await loadMyData();
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : '강의평 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleSaveDepartment = async () => {
    if (!selectedDepartment) {
      setErrorMessage('학과를 선택해주세요.');
      return;
    }

    setIsUpdatingDepartment(true);
    setErrorMessage('');

    try {
      await updateProfile({ department: selectedDepartment });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '학과 수정에 실패했습니다.');
    } finally {
      setIsUpdatingDepartment(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.group }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => navigation.onTabScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View style={styles.collectionHeader}>
          <Text style={styles.collectionTitle}>내 전시관</Text>
          <Text style={styles.collectionMeta}>
            @{user?.nickname ?? 'guest'} · {user?.department ?? '학과 미설정'}
          </Text>

          <View style={styles.identityCluster}>
            <View style={styles.avatarFrame}>
              <Text style={styles.avatarText}>{getInitial(user?.nickname)}</Text>
            </View>
            <View style={styles.identityCopy}>
              <Text style={styles.identityLabel}>Curated by</Text>
              <Text style={styles.identityName}>{user ? `${user.nickname} 큐레이터` : '게스트 큐레이터'}</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {archiveFilters.map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.filterBubble,
                    {
                      backgroundColor: active ? filter.color : 'rgba(255,255,255,0.58)',
                      borderColor: active ? filter.color : 'rgba(255,255,255,0.78)',
                    },
                    pressed ? styles.buttonPressed : null,
                  ]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text style={[styles.filterBubbleText, { color: active ? '#ffffff' : filter.color }]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.collectionDescription}>
            내가 남긴 강의평과 포인트 흐름을 전시 기록처럼 모았습니다. 좋은 강의를 찾기 위해 남긴 흔적들이 여기서 하나의 컬렉션이 됩니다.
          </Text>
        </View>

        {!user ? (
          <GuestGallery navigation={navigation} />
        ) : (
          <>
            <View style={styles.curatorStrip}>
              <View style={styles.curatorMetric}>
                <Text style={styles.curatorMetricValue}>{myReviews.length}</Text>
                <Text style={styles.curatorMetricLabel}>소장 리뷰</Text>
              </View>
              <View style={styles.curatorMetricDivider} />
              <View style={styles.curatorMetric}>
                <Text style={styles.curatorMetricValue}>{user.points}P</Text>
                <Text style={styles.curatorMetricLabel}>보유 포인트</Text>
              </View>
              <View style={styles.curatorMetricDivider} />
              <View style={styles.curatorMetric}>
                <Text style={styles.curatorMetricValue}>{pointHistory.length}</Text>
                <Text style={styles.curatorMetricLabel}>활동 기록</Text>
              </View>
            </View>

            {isLoading ? (
              <StateBlock label="내 전시관을 정리하는 중입니다." loading />
            ) : errorMessage ? (
              <StateBlock label={errorMessage} error />
            ) : (
              <>
                {activeFilter === 'reviews' ? (
                  <ReviewGallery
                    reviews={myReviews}
                    rows={reviewRows}
                    navigation={navigation}
                    onDelete={handleDeleteReview}
                  />
                ) : null}

                {activeFilter === 'points' ? <PointArchive pointHistory={pointHistory} /> : null}

                {activeFilter === 'profile' ? (
                  <ProfileArchive
                    userEmail={user.email}
                    userDepartment={user.department}
                    selectedDepartment={selectedDepartment}
                    isUpdatingDepartment={isUpdatingDepartment}
                    onSelectDepartment={setSelectedDepartment}
                    onSaveDepartment={handleSaveDepartment}
                    onLogout={handleLogout}
                  />
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GuestGallery({ navigation }: { navigation: AppNavigation }) {
  return (
    <View style={styles.guestGallery}>
      <Text style={styles.guestTitle}>로그인하면 개인 전시관이 열립니다.</Text>
      <Text style={styles.guestBody}>
        내가 남긴 강의평, 포인트 변화, 전공 기반 큐레이션을 한 장의 컬렉션처럼 확인할 수 있어요.
      </Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}
        onPress={() => navigation.navigate({ name: 'Login' })}
      >
        <Text style={styles.primaryButtonText}>로그인하고 전시관 열기</Text>
      </Pressable>
    </View>
  );
}

function ReviewGallery({
  reviews,
  rows,
  navigation,
  onDelete,
}: {
  reviews: Review[];
  rows: Review[][];
  navigation: AppNavigation;
  onDelete: (reviewId: number) => void;
}) {
  if (reviews.length === 0) {
    return (
      <StateBlock label="아직 소장된 강의평이 없습니다. 마음에 남는 강의를 발견하면 첫 작품으로 걸어둘 수 있어요." />
    );
  }

  return (
    <View style={styles.gallerySection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Review collection</Text>
        <Text style={styles.sectionTitle}>내가 남긴 강의평</Text>
      </View>

      {rows.map((row, rowIndex) => (
        <View key={`review-row-${rowIndex}`} style={styles.reviewRow}>
          {row.map((review, columnIndex) => {
            const index = rowIndex * 2 + columnIndex;
            return (
              <ReviewExhibitCard
                key={review.id}
                review={review}
                index={index}
                onOpen={() => navigation.navigate({ name: 'CourseCollection', courseId: review.courseId })}
                onDelete={() => onDelete(review.id)}
              />
            );
          })}
          {row.length === 1 ? <View style={styles.reviewCellGhost} /> : null}
        </View>
      ))}
    </View>
  );
}

function ReviewExhibitCard({
  review,
  index,
  onOpen,
  onDelete,
}: {
  review: Review;
  index: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const palette = getReviewPalette(review, index);

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.reviewCard,
        { backgroundColor: palette.background },
        pressed ? styles.buttonPressed : null,
      ]}
      onPress={onOpen}
    >
      <View style={[styles.reviewHalo, { backgroundColor: palette.haloA }]} />
      <View style={[styles.reviewHaloSmall, { backgroundColor: palette.haloB }]} />
      <View style={styles.reviewCardInner}>
        <View style={styles.reviewCardTop}>
          <Text style={[styles.reviewBadge, { color: palette.accent }]}>{getReviewMood(review)}</Text>
          <Text style={[styles.reviewRating, { color: palette.text }]}>{review.rating.toFixed(1)}</Text>
        </View>

        <Text style={[styles.reviewCourse, { color: palette.text }]} numberOfLines={3}>
          {review.courseName}
        </Text>
        <Text style={[styles.reviewMeta, { color: palette.subtle }]} numberOfLines={1}>
          {review.professorName} 교수님 · {review.semester}
        </Text>

        <Text style={[styles.reviewExcerpt, { color: palette.text }]} numberOfLines={5}>
          {review.oneLineTip || review.content}
        </Text>

        <View style={styles.reviewTags}>
          <View style={[styles.reviewTag, { backgroundColor: palette.tag }]}>
            <Text style={[styles.reviewTagText, { color: palette.text }]}>{review.difficulty || '난이도 미상'}</Text>
          </View>
          <View style={[styles.reviewTag, { backgroundColor: palette.tag }]}>
            <Text style={[styles.reviewTagText, { color: palette.text }]}>{review.workload || '과제 미상'}</Text>
          </View>
        </View>

        <View style={styles.reviewActions}>
          <Text style={[styles.reviewDate, { color: palette.subtle }]}>{formatShortDate(review.createdAt)}</Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: palette.tag },
              pressed ? styles.buttonPressed : null,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Text style={[styles.deleteButtonText, { color: palette.text }]}>삭제</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function PointArchive({ pointHistory }: { pointHistory: PointHistoryItem[] }) {
  return (
    <View style={styles.gallerySection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Accession log</Text>
        <Text style={styles.sectionTitle}>포인트 수장고</Text>
      </View>

      <View style={styles.pointArchive}>
        {pointHistory.length === 0 ? (
          <Text style={styles.emptyText}>포인트 내역이 아직 없습니다.</Text>
        ) : (
          pointHistory.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.pointRow}>
              <View style={[styles.pointDot, item.points > 0 ? styles.pointDotPositive : styles.pointDotNegative]} />
              <View style={styles.pointCopy}>
                <Text style={styles.pointTitle}>{item.description}</Text>
                <Text style={styles.pointDate}>{formatHistoryDate(item.date)}</Text>
              </View>
              <Text style={[styles.pointValue, item.points > 0 ? styles.pointValuePositive : styles.pointValueNegative]}>
                {item.points > 0 ? '+' : ''}
                {item.points}P
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function ProfileArchive({
  userEmail,
  userDepartment,
  selectedDepartment,
  isUpdatingDepartment,
  onSelectDepartment,
  onSaveDepartment,
  onLogout,
}: {
  userEmail: string;
  userDepartment?: string;
  selectedDepartment: string;
  isUpdatingDepartment: boolean;
  onSelectDepartment: (department: string) => void;
  onSaveDepartment: () => void;
  onLogout: () => void;
}) {
  const hasDepartmentChange = !!selectedDepartment && selectedDepartment !== userDepartment;

  return (
    <View style={styles.gallerySection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Curator profile</Text>
        <Text style={styles.sectionTitle}>계정 전시 정보</Text>
      </View>

      <View style={styles.profilePanel}>
        <InfoLine label="이메일" value={userEmail} />
        <InfoLine label="학과" value={userDepartment ?? '학과 미설정'} />
        <InfoLine label="큐레이션 기준" value="강의평, 포인트, 전공 기반 탐색" />
        <View style={styles.departmentEditPanel}>
          <View style={styles.departmentEditHeader}>
            <Text style={styles.infoLabel}>내 전공 추천 기준</Text>
            <Text style={styles.departmentEditValue}>{selectedDepartment || '학과 선택'}</Text>
          </View>
          <View style={styles.departmentChipWrap}>
            {departments.map((department) => {
              const active = selectedDepartment === department;
              return (
                <Pressable
                  key={department}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.departmentChip,
                    active ? styles.departmentChipActive : null,
                    pressed ? styles.buttonPressed : null,
                  ]}
                  onPress={() => onSelectDepartment(department)}
                >
                  <Text style={[styles.departmentChipText, active ? styles.departmentChipTextActive : null]}>
                    {department}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveDepartmentButton,
              !hasDepartmentChange ? styles.saveDepartmentButtonDisabled : null,
              pressed && hasDepartmentChange ? styles.buttonPressed : null,
            ]}
            onPress={onSaveDepartment}
            disabled={!hasDepartmentChange || isUpdatingDepartment}
          >
            {isUpdatingDepartment ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveDepartmentButtonText}>학과 저장</Text>
            )}
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.logoutButton, pressed ? styles.buttonPressed : null]}
          onPress={onLogout}
        >
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </Pressable>
      </View>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StateBlock({
  label,
  error = false,
  loading = false,
}: {
  label: string;
  error?: boolean;
  loading?: boolean;
}) {
  return (
    <View style={[styles.stateBlock, error ? styles.stateBlockError : null]}>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Text style={[styles.stateText, error ? styles.stateTextError : null]}>{label}</Text>
    </View>
  );
}

function getInitial(name?: string) {
  return name?.trim().slice(0, 1) || '인';
}

function getReviewMood(review: Review) {
  if (review.rating >= 4.3) {
    return '추천 작품';
  }
  if (review.workload.includes('많') || review.difficulty.includes('어려')) {
    return '주의 깊게 보기';
  }
  if (review.attendance.includes('엄격')) {
    return '출석 체크';
  }
  return '수강 기록';
}

function getReviewPalette(review: Review, index: number) {
  const isHighRated = review.rating >= 4;
  const isHeavy = review.workload.includes('많') || review.difficulty.includes('어려');
  const palettes = [
    {
      background: '#101827',
      text: '#ffffff',
      subtle: 'rgba(255,255,255,0.68)',
      accent: '#8cb9ff',
      tag: 'rgba(255,255,255,0.14)',
      haloA: 'rgba(84,132,206,0.38)',
      haloB: 'rgba(255,255,255,0.10)',
    },
    {
      background: '#f3efe6',
      text: '#121826',
      subtle: '#74716b',
      accent: '#9d5537',
      tag: 'rgba(18,24,38,0.07)',
      haloA: 'rgba(216,79,65,0.12)',
      haloB: 'rgba(18,24,38,0.06)',
    },
    {
      background: '#173e42',
      text: '#ffffff',
      subtle: 'rgba(255,255,255,0.68)',
      accent: '#9ad8c9',
      tag: 'rgba(255,255,255,0.15)',
      haloA: 'rgba(154,216,201,0.24)',
      haloB: 'rgba(255,255,255,0.10)',
    },
  ];

  if (isHeavy) {
    return palettes[1];
  }

  if (isHighRated) {
    return palettes[2];
  }

  return palettes[index % palettes.length];
}

function formatShortDate(value: string) {
  const [date] = value.split('T');
  return date?.slice(2).replace(/-/g, '.') ?? '';
}

function formatHistoryDate(value: string) {
  return value.replace('T', ' ').slice(0, 16);
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9fd',
  },
  content: {
    paddingBottom: 112,
    gap: spacing.section,
  },
  collectionHeader: {
    paddingHorizontal: spacing.page,
    alignItems: 'center',
    gap: spacing.related,
  },
  collectionTitle: {
    color: '#121826',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  collectionMeta: {
    color: '#96969d',
    fontSize: 14,
    fontWeight: '800',
  },
  identityCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  avatarFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
  },
  avatarText: {
    color: '#121826',
    fontSize: 18,
    fontWeight: '900',
  },
  identityCopy: {
    alignItems: 'flex-start',
  },
  identityLabel: {
    color: '#a0a0a7',
    fontSize: 11,
    fontWeight: '800',
  },
  identityName: {
    color: '#121826',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.related,
    marginTop: spacing.tight,
  },
  filterBubble: {
    minWidth: 58,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 2,
  },
  filterBubbleText: {
    fontSize: 13,
    fontWeight: '900',
  },
  collectionDescription: {
    color: '#121826',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.45,
    maxWidth: 336,
  },
  curatorStrip: {
    marginHorizontal: spacing.page,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#16499a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  curatorMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  curatorMetricValue: {
    color: '#121826',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  curatorMetricLabel: {
    color: '#7b879a',
    fontSize: 10,
    fontWeight: '800',
  },
  curatorMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#dfe7f5',
  },
  gallerySection: {
    gap: spacing.related,
  },
  sectionHeader: {
    paddingHorizontal: spacing.page,
    gap: 4,
  },
  sectionLabel: {
    color: '#16499a',
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#121826',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.related,
    paddingHorizontal: spacing.page,
  },
  reviewCellGhost: {
    flex: 1,
  },
  reviewCard: {
    flex: 1,
    minHeight: 284,
    borderRadius: 28,
    overflow: 'hidden',
  },
  reviewHalo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    right: -42,
    top: 28,
  },
  reviewHaloSmall: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 999,
    left: -32,
    bottom: 50,
  },
  reviewCardInner: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 28,
  },
  reviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewBadge: {
    fontSize: 11,
    fontWeight: '900',
  },
  reviewRating: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  reviewCourse: {
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  reviewMeta: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
  reviewExcerpt: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  reviewTagText: {
    fontSize: 10,
    fontWeight: '900',
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reviewDate: {
    fontSize: 10,
    fontWeight: '800',
  },
  deleteButton: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  deleteButtonText: {
    fontSize: 10,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.985 }],
  },
  pointArchive: {
    marginHorizontal: spacing.page,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: spacing.page,
    gap: spacing.related,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.related,
  },
  pointDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  pointDotPositive: {
    backgroundColor: '#226d68',
  },
  pointDotNegative: {
    backgroundColor: colors.danger,
  },
  pointCopy: {
    flex: 1,
    gap: 3,
  },
  pointTitle: {
    color: '#121826',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  pointDate: {
    color: '#7b879a',
    fontSize: 11,
    fontWeight: '700',
  },
  pointValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  pointValuePositive: {
    color: '#226d68',
  },
  pointValueNegative: {
    color: colors.danger,
  },
  profilePanel: {
    marginHorizontal: spacing.page,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: spacing.page,
    gap: spacing.group,
  },
  departmentEditPanel: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.50)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.74)',
    padding: spacing.group,
    gap: spacing.related,
  },
  departmentEditHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.related,
  },
  departmentEditValue: {
    flexShrink: 1,
    color: '#121826',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  departmentChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  departmentChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  departmentChipActive: {
    backgroundColor: '#121826',
    borderColor: '#121826',
  },
  departmentChipText: {
    color: '#65738a',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: -0.15,
  },
  departmentChipTextActive: {
    color: '#ffffff',
  },
  saveDepartmentButton: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(34,109,104,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  saveDepartmentButtonDisabled: {
    opacity: 0.38,
  },
  saveDepartmentButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  infoLine: {
    gap: 5,
  },
  infoLabel: {
    color: '#96969d',
    fontSize: 11,
    fontWeight: '900',
  },
  infoValue: {
    color: '#121826',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  logoutButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(18,24,38,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    paddingVertical: 14,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  guestGallery: {
    marginHorizontal: spacing.page,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: spacing.page,
    gap: spacing.related,
  },
  guestTitle: {
    color: '#121826',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  guestBody: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(18,24,38,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  stateBlock: {
    minHeight: 150,
    marginHorizontal: spacing.page,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.page,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.related,
  },
  stateBlockError: {
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.16)',
  },
  stateText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateTextError: {
    color: colors.danger,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
});
