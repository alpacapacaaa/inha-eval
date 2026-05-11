import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, PressableScale, StatePanel } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { getPointHistory } from '../lib/api/points';
import { getMyReviews } from '../lib/api/reviews';
import { TIMETABLE_BY_COURSE_ID, TIMETABLE_DAYS, TimetableSlot } from '../lib/timetableData';
import { loadSelectedTimetableIds, loadTimetableCartIds } from '../lib/storage/timetableStorage';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { PointHistoryItem, Review } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

const FAVORITES = [
  { key: 'saved', label: '담은 강의', tone: '#2f6edb' },
  { key: 'reviews', label: '작성한 리뷰', tone: '#39aa78' },
  { key: 'questions', label: '문의/답변', tone: '#a66be4' },
  { key: 'points', label: '포인트 내역', tone: '#f2b94d' },
] as const;

export function MyPageScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [pointHistory, setPointHistory] = useState<PointHistoryItem[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [selectedTimetableIds, setSelectedTimetableIds] = useState<string[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMyData = async () => {
    if (!user) {
      setPointHistory([]);
      setMyReviews([]);
      setSelectedTimetableIds([]);
      setCartIds([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const [history, reviews, selectedIds, storedCartIds] = await Promise.all([
        getPointHistory(),
        getMyReviews(),
        loadSelectedTimetableIds(),
        loadTimetableCartIds(),
      ]);
      setPointHistory(history);
      setMyReviews(reviews);
      setSelectedTimetableIds(selectedIds);
      setCartIds(storedCartIds);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '내 정보를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMyData();
  }, [user]);

  const selectedSlots = useMemo(
    () => selectedTimetableIds.flatMap((id) => TIMETABLE_BY_COURSE_ID[id] ?? []),
    [selectedTimetableIds],
  );

  const timetableSummary = useMemo(() => {
    const credits = Math.max(selectedTimetableIds.length * 3, 0);
    const hasFriday = selectedSlots.some((slot) => slot.day === '금');
    const mondayEmpty = !selectedSlots.some((slot) => slot.day === '월');
    const thursdayAfternoon = selectedSlots.some((slot) => slot.day === '목' && slot.startPeriod >= 5);

    const notes = [
      `${credits || 0}학점`,
      hasFriday ? '금요일 수업 있음' : '금요일 여유',
      mondayEmpty ? '월 공강' : '월 수업 있음',
      thursdayAfternoon ? '목 오후 수업' : '목 오후 여유',
    ];

    return notes.join(' · ');
  }, [selectedSlots, selectedTimetableIds.length]);

  const recentReview = myReviews[0];
  const usefulAnswers = pointHistory.filter((item) => item.points > 0).length;

  const handleLogout = () => {
    Alert.alert('로그아웃', '현재 계정에서 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.replace({ name: 'Login' });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 22 }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => navigation.onTabScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleGroup}>
            <Text style={styles.pageTitle}>마이페이지</Text>
            <Text style={styles.pageSubtitle}>내 활동과 정보를 한눈에 확인하세요.</Text>
          </View>

          <View style={styles.headerActions}>
            <PressableScale
              style={styles.roundIcon}
              onPress={() => navigation.navigate({ name: 'Notifications' })}
            >
              <BellIcon />
            </PressableScale>
            <PressableScale
              style={styles.roundIcon}
              onPress={() => navigation.navigate({ name: 'Settings' })}
            >
              <GearIcon />
            </PressableScale>
          </View>
        </View>

        {!user ? (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>로그인이 필요해요</Text>
            <Text style={styles.guestText}>내 강의평, 시간표, 포인트 활동을 보려면 먼저 로그인해주세요.</Text>
            <Button label="로그인하기" onPress={() => navigation.navigate({ name: 'Login' })} />
          </View>
        ) : (
          <>
            <ProfileCard
              nickname={user.nickname}
              department={user.department}
              points={user.points}
              reviewCount={myReviews.length}
              usefulAnswers={usefulAnswers}
              savedCount={cartIds.length}
              onEditProfile={() => navigation.navigate({ name: 'Settings', section: 'account' })}
            />

            {isLoading ? (
              <StatePanel label="마이페이지를 정리하는 중입니다." loading />
            ) : errorMessage ? (
              <StatePanel label={errorMessage} error />
            ) : (
              <>
                <SectionHeader
                  title="내 시간표"
                  actionLabel="전체 보기"
                  onPress={() => navigation.switchTab('Timetable')}
                />
                <View style={styles.timetableCard}>
                  <View style={styles.timetableCopy}>
                    <View style={[styles.sectionIconCircle, { backgroundColor: '#eaf2ff' }]}>
                      <CalendarIcon />
                    </View>
                    <View style={styles.timetableTextGroup}>
                      <Text style={styles.timetableTitle}>이번 학기 시간표</Text>
                      <Text style={styles.timetableMeta}>{timetableSummary}</Text>
                      <PressableScale style={styles.miniPill} onPress={() => navigation.switchTab('Timetable')}>
                        <Text style={styles.miniPillText}>시간표 보기</Text>
                        <ChevronIcon />
                      </PressableScale>
                    </View>
                  </View>
                  <TimetablePreview slots={selectedSlots} />
                </View>

                <SectionHeader title="즐겨찾기" />
                <View style={styles.favoriteGrid}>
                  {FAVORITES.map((item) => (
                    <FavoriteCard
                      key={item.key}
                      label={item.label}
                      count={getFavoriteCount(item.key, cartIds.length, myReviews.length, usefulAnswers)}
                      tone={item.tone}
                      onPress={getFavoriteAction(item.key, navigation)}
                    />
                  ))}
                </View>

                <SectionHeader title="내 활동" />
                <View style={styles.listCard}>
                  <ActivityRow
                    tone="#2f6edb"
                    title="내가 작성한 리뷰"
                    description={recentReview ? `${recentReview.courseName} 외 ${Math.max(myReviews.length - 1, 0)}개` : '내가 남긴 강의 리뷰를 확인해보세요.'}
                    onPress={() => {
                      if (recentReview) {
                        navigation.navigate({ name: 'CourseCollection', courseId: recentReview.courseId });
                      }
                    }}
                  />
                  <ActivityRow
                    tone="#39aa78"
                    title="내가 작성한 문의"
                    description="내가 남긴 질문과 답변을 확인해보세요."
                    onPress={() => navigation.navigate({ name: 'Inquiry' })}
                  />
                  <ActivityRow
                    tone="#a66be4"
                    title="도움이 된 리뷰"
                    description="내 리뷰가 좋아요 받은 내역을 확인해보세요."
                    onPress={() => navigation.navigate({ name: 'Notifications' })}
                  />
                  <ActivityRow
                    tone="#f2b94d"
                    title="알림 내역"
                    description="서비스 알림을 확인해보세요."
                    onPress={() => navigation.navigate({ name: 'Notifications' })}
                    isLast
                  />
                </View>

                <SectionHeader title="설정" />
                <View style={styles.listCard}>
                  <SettingRow title="계정 정보" description={user.email} onPress={() => navigation.navigate({ name: 'Settings', section: 'account' })} />
                  <SettingRow title="개인정보 및 보안" description="학교 이메일과 휴대폰 인증 정보를 관리해요." onPress={() => navigation.navigate({ name: 'Settings', section: 'privacy' })} />
                  <SettingRow title="앱 설정" description="알림, 화면, 서비스 환경을 조정해요." onPress={() => navigation.navigate({ name: 'Settings', section: 'app' })} />
                  <SettingRow title="로그아웃" description="현재 계정에서 나갑니다." danger onPress={handleLogout} isLast />
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileCard({
  nickname,
  department,
  points,
  reviewCount,
  usefulAnswers,
  savedCount,
  onEditProfile,
}: {
  nickname: string;
  department?: string;
  points: number;
  reviewCount: number;
  usefulAnswers: number;
  savedCount: number;
  onEditProfile: () => void;
}) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.avatarColumn}>
        <View style={styles.avatarBubble}>
          <View style={styles.mascotFace}>
            <View style={styles.mascotEarLeft} />
            <View style={styles.mascotEarRight} />
            <View style={styles.mascotEyeLeft} />
            <View style={styles.mascotEyeRight} />
            <View style={styles.mascotNose} />
            <View style={styles.mascotMouth} />
          </View>
          <View style={styles.cameraBadge}>
            <CameraIcon />
          </View>
        </View>
      </View>

      <View style={styles.profileMain}>
        <PressableScale style={styles.profileNameRow} onPress={onEditProfile}>
          <Text style={styles.profileName}>{nickname}님</Text>
          <View style={styles.schoolBadge}>
            <Text style={styles.schoolBadgeText}>인하대학교</Text>
          </View>
          <ChevronIcon />
        </PressableScale>
        <Text style={styles.profileMeta}>{department ?? '학과 미설정'} · {points}P 보유</Text>
        <Text style={styles.profileGreeting}>{getGreetingMessage()}</Text>

        <View style={styles.profileStats}>
          <ProfileStat value={savedCount} label="담은 강의" />
          <View style={styles.statDivider} />
          <ProfileStat value={reviewCount} label="작성한 리뷰" />
          <View style={styles.statDivider} />
          <ProfileStat value={usefulAnswers} label="도움이 된 답변" />
        </View>
      </View>
    </View>
  );
}

function ProfileStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onPress,
}: {
  title: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <PressableScale style={styles.sectionAction} onPress={onPress}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <ChevronIcon />
        </PressableScale>
      ) : null}
    </View>
  );
}

function TimetablePreview({ slots }: { slots: TimetableSlot[] }) {
  if (slots.length === 0) {
    return (
      <View style={styles.timetableEmpty}>
        <Text style={styles.timetableEmptyText}>시간표를 아직 담지 않았어요</Text>
      </View>
    );
  }

  const previewSlots = slots.slice(0, 7);

  return (
    <View style={styles.timetablePreview}>
      <View style={styles.previewDays}>
        {TIMETABLE_DAYS.map((day) => (
          <Text key={day} style={styles.previewDay}>{day}</Text>
        ))}
      </View>
      <View style={styles.previewGrid}>
        {TIMETABLE_DAYS.map((day, dayIndex) => (
          <View key={`column-${day}`} style={styles.previewColumn}>
            {[0, 1, 2, 3].map((row) => (
              <View key={`${day}-${row}`} style={styles.previewCell} />
            ))}
            {previewSlots
              .filter((slot) => slot.day === day)
              .map((slot, index) => (
                <View
                  key={`${slot.day}-${slot.startPeriod}-${index}`}
                  style={[
                    styles.previewBlock,
                    {
                      top: getPreviewTop(slot.startPeriod),
                      height: Math.max((slot.endPeriod - slot.startPeriod + 1) * 17, 18),
                      backgroundColor: PREVIEW_COLORS[(dayIndex + index) % PREVIEW_COLORS.length],
                    },
                  ]}
                />
              ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function FavoriteCard({
  label,
  count,
  tone,
  onPress,
}: {
  label: string;
  count: number;
  tone: string;
  onPress?: () => void;
}) {
  return (
    <PressableScale style={styles.favoriteCard} onPress={onPress}>
      <View style={[styles.favoriteIcon, { backgroundColor: `${tone}18` }]}>
        <MiniSymbol tone={tone} />
      </View>
      <Text style={styles.favoriteLabel}>{label}</Text>
      <Text style={styles.favoriteCount}>{count}개</Text>
    </PressableScale>
  );
}

function ActivityRow({
  tone,
  title,
  description,
  onPress,
  isLast,
}: {
  tone: string;
  title: string;
  description: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <PressableScale style={[styles.listRow, isLast ? styles.listRowLast : null]} onPress={onPress}>
      <View style={[styles.rowIconCircle, { backgroundColor: `${tone}16` }]}>
        <MiniSymbol tone={tone} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <ChevronIcon />
    </PressableScale>
  );
}

function SettingRow({
  title,
  description,
  danger,
  onPress,
  isLast,
}: {
  title: string;
  description: string;
  danger?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <PressableScale style={[styles.listRow, isLast ? styles.listRowLast : null]} onPress={onPress}>
      <View style={[styles.settingIcon, danger ? styles.settingIconDanger : null]}>
        <View style={[styles.settingIconLine, danger ? styles.settingIconLineDanger : null]} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, danger ? styles.dangerText : null]}>{title}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <ChevronIcon />
    </PressableScale>
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

function GearIcon() {
  return (
    <View style={styles.gearIcon}>
      <View style={styles.gearCenter} />
      <View style={[styles.gearTooth, styles.gearToothTop]} />
      <View style={[styles.gearTooth, styles.gearToothBottom]} />
      <View style={[styles.gearTooth, styles.gearToothLeft]} />
      <View style={[styles.gearTooth, styles.gearToothRight]} />
    </View>
  );
}

function CalendarIcon() {
  return (
    <View style={styles.calendarIcon}>
      <View style={styles.calendarTop} />
      <View style={styles.calendarRingLeft} />
      <View style={styles.calendarRingRight} />
    </View>
  );
}

function CameraIcon() {
  return (
    <View style={styles.cameraIcon}>
      <View style={styles.cameraLens} />
    </View>
  );
}

function ChevronIcon() {
  return <Text style={styles.chevron}>›</Text>;
}

function MiniSymbol({ tone }: { tone: string }) {
  return (
    <View style={styles.miniSymbol}>
      <View style={[styles.miniSymbolCore, { backgroundColor: tone }]} />
      <View style={[styles.miniSymbolTail, { backgroundColor: tone }]} />
    </View>
  );
}

function getFavoriteCount(
  key: (typeof FAVORITES)[number]['key'],
  savedCount: number,
  reviewCount: number,
  usefulAnswers: number,
) {
  switch (key) {
    case 'saved':
      return savedCount;
    case 'reviews':
      return reviewCount;
    case 'questions':
      return usefulAnswers;
    case 'points':
      return usefulAnswers;
    default:
      return 0;
  }
}

function getFavoriteAction(
  key: (typeof FAVORITES)[number]['key'],
  navigation: AppNavigation,
): () => void {
  switch (key) {
    case 'saved':
      return () => navigation.navigate({ name: 'CartFull' });
    case 'reviews':
      return () => navigation.navigate({ name: 'Inquiry' });
    case 'questions':
      return () => navigation.navigate({ name: 'Inquiry' });
    case 'points':
      return () => navigation.navigate({ name: 'PointHistory' });
    default:
      return () => {};
  }
}

function getGreetingMessage() {
  const hour = new Date().getHours();
  if (hour < 12) return '좋은 아침이에요! 오늘 수강신청 준비됐나요?';
  if (hour < 18) return '오늘도 좋은 하루 보내고 있나요?';
  return '오늘 하루도 수고했어요!';
}


function getPreviewTop(period: number) {
  return Math.max((period - 1) * 17, 0);
}

const PREVIEW_COLORS = ['#dfe9ff', '#efe1ff', '#e1f5ea', '#fff0cf', '#dce9ff'];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.page,
    paddingBottom: 132,
    gap: 22,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.group,
  },
  pageTitleGroup: {
    gap: 8,
  },
  pageTitle: {
    color: '#101827',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -1.1,
  },
  pageSubtitle: {
    color: '#6f7b8f',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  roundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16499a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  profileCard: {
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.78)',
    padding: spacing.group,
    flexDirection: 'row',
    gap: spacing.group,
    shadowColor: '#16499a',
    shadowOpacity: 0.10,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    borderWidth: 1,
    borderColor: 'rgba(230,236,247,0.9)',
  },
  avatarColumn: {
    paddingTop: 6,
  },
  avatarBubble: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#dfeaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotFace: {
    width: 70,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f7fbff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotEarLeft: {
    position: 'absolute',
    left: 4,
    top: 15,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#f7fbff',
  },
  mascotEarRight: {
    position: 'absolute',
    right: 4,
    top: 15,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#f7fbff',
  },
  mascotEyeLeft: {
    position: 'absolute',
    left: 23,
    top: 28,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1e3a68',
  },
  mascotEyeRight: {
    position: 'absolute',
    right: 23,
    top: 28,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1e3a68',
  },
  mascotNose: {
    width: 7,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#1e3a68',
    marginTop: 12,
  },
  mascotMouth: {
    width: 18,
    height: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a68',
    borderRadius: 9,
    marginTop: 2,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 33,
    height: 33,
    borderRadius: 16.5,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16499a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cameraIcon: {
    width: 17,
    height: 13,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1d355d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLens: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1d355d',
  },
  profileMain: {
    flex: 1,
    gap: 8,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    color: '#101827',
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  schoolBadge: {
    borderRadius: 999,
    backgroundColor: '#eef4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  schoolBadgeText: {
    color: '#3b6dcc',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
  },
  profileMeta: {
    color: '#59677c',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
  profileGreeting: {
    color: '#758195',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  profileStats: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  profileStatValue: {
    color: '#101827',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  profileStatLabel: {
    color: '#718098',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#dfe6f2',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#101827',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionActionText: {
    color: '#7c879a',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  timetableCard: {
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.78)',
    padding: spacing.group,
    flexDirection: 'row',
    gap: spacing.group,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230,236,247,0.9)',
    shadowColor: '#16499a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  timetableCopy: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.related,
    alignItems: 'center',
  },
  sectionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timetableTextGroup: {
    flex: 1,
    gap: 5,
  },
  timetableTitle: {
    color: '#101827',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  timetableMeta: {
    color: '#718098',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  miniPill: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: '#eef4ff',
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  miniPillText: {
    color: '#2f6edb',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  timetablePreview: {
    width: 142,
    gap: 5,
  },
  timetableEmpty: {
    width: 142,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timetableEmptyText: {
    color: '#9aa5b8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  previewDays: {
    flexDirection: 'row',
  },
  previewDay: {
    flex: 1,
    color: '#101827',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  previewGrid: {
    height: 76,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#e7edf7',
    overflow: 'hidden',
  },
  previewColumn: {
    flex: 1,
    position: 'relative',
  },
  previewCell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e7edf7',
  },
  previewBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(91,116,150,0.08)',
  },
  favoriteGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  favoriteCard: {
    flex: 1,
    minHeight: 118,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(230,236,247,0.9)',
    paddingHorizontal: 13,
    paddingVertical: 15,
    gap: 9,
    shadowColor: '#16499a',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
  },
  favoriteIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteLabel: {
    color: '#101827',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  favoriteCount: {
    color: '#718098',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
  },
  listCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(230,236,247,0.9)',
    paddingHorizontal: spacing.group,
    shadowColor: '#16499a',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  listRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.related,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  rowIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: '#101827',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  rowDesc: {
    color: '#718098',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDanger: {
    backgroundColor: 'rgba(216,79,65,0.10)',
  },
  settingIconLine: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#8a96aa',
  },
  settingIconLineDanger: {
    borderColor: colors.danger,
  },
  dangerText: {
    color: colors.danger,
  },
  guestCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(230,236,247,0.9)',
    padding: spacing.page,
    gap: spacing.related,
  },
  guestTitle: {
    color: '#101827',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.9,
  },
  guestText: {
    color: '#6f7b8f',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  chevron: {
    color: '#8a96aa',
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '400',
    marginTop: -2,
  },
  bellIcon: {
    width: 21,
    height: 24,
    alignItems: 'center',
  },
  bellBody: {
    width: 15,
    height: 17,
    borderWidth: 2,
    borderColor: '#101827',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  bellClapper: {
    width: 6,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#101827',
    marginTop: 2,
  },
  gearIcon: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearCenter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#101827',
  },
  gearTooth: {
    position: 'absolute',
    width: 4,
    height: 7,
    borderRadius: 2,
    backgroundColor: '#101827',
  },
  gearToothTop: {
    top: 0,
  },
  gearToothBottom: {
    bottom: 0,
  },
  gearToothLeft: {
    left: 0,
    transform: [{ rotate: '90deg' }],
  },
  gearToothRight: {
    right: 0,
    transform: [{ rotate: '90deg' }],
  },
  calendarIcon: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2f6edb',
    overflow: 'hidden',
  },
  calendarTop: {
    height: 6,
    backgroundColor: '#2f6edb',
  },
  calendarRingLeft: {
    position: 'absolute',
    top: -2,
    left: 5,
    width: 2,
    height: 7,
    backgroundColor: '#2f6edb',
  },
  calendarRingRight: {
    position: 'absolute',
    top: -2,
    right: 5,
    width: 2,
    height: 7,
    backgroundColor: '#2f6edb',
  },
  miniSymbol: {
    width: 17,
    height: 18,
    alignItems: 'center',
  },
  miniSymbolCore: {
    width: 13,
    height: 13,
    borderRadius: 4,
  },
  miniSymbolTail: {
    width: 7,
    height: 7,
    borderRadius: 2,
    marginTop: -4,
    transform: [{ rotate: '45deg' }],
  },
});
