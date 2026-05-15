import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DimensionValue } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, PressableScale } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface Props {
  navigation: AppNavigation;
}

type RowItem = {
  title: string;
  badge?: string;
  danger?: boolean;
  onPress: () => void;
};

type GradeLevel = {
  name: string;
  minPoints: number;
  summary: string;
  benefit: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tint: string;
  background: string;
};

const GRADE_LEVELS: GradeLevel[] = [
  {
    name: '씨앗',
    minPoints: 0,
    summary: '강의평 활동을 막 시작한 단계',
    benefit: '기본 포인트 적립과 강의평 탐색',
    icon: 'seed-outline',
    tint: '#5ED36A',
    background: '#EDFBEF',
  },
  {
    name: '새싹',
    minPoints: 100,
    summary: '강의 경험이 차곡차곡 쌓이는 단계',
    benefit: '작성 활동 기록과 추천 신뢰도 상승',
    icon: 'sprout-outline',
    tint: colors.primary,
    background: '#EAF7FF',
  },
  {
    name: '잎새',
    minPoints: 300,
    summary: '여러 강의의 후기를 꾸준히 남긴 단계',
    benefit: '강의 선택에 도움 되는 활동 배지',
    icon: 'leaf',
    tint: '#7A8CA3',
    background: '#F2F5F8',
  },
  {
    name: '나무',
    minPoints: 700,
    summary: '인하평 안에서 신뢰가 높은 단계',
    benefit: '상세한 후기와 비교 정보 기여',
    icon: 'tree-outline',
    tint: '#4E6278',
    background: '#EEF3F8',
  },
  {
    name: '숲',
    minPoints: 1200,
    summary: '강의평 생태계를 풍성하게 만든 단계',
    benefit: '최상위 활동 등급과 특별 표시',
    icon: 'forest-outline',
    tint: '#F5A623',
    background: '#FFF6E5',
  },
];

function getGradeInfo(points: number) {
  const safePoints = Math.max(0, points);
  const currentIndex = GRADE_LEVELS.reduce((current, grade, index) => (
    safePoints >= grade.minPoints ? index : current
  ), 0);
  const current = GRADE_LEVELS[currentIndex];
  const next = GRADE_LEVELS[currentIndex + 1] ?? null;
  const progress = next
    ? Math.min(1, (safePoints - current.minPoints) / (next.minPoints - current.minPoints))
    : 1;

  return {
    current,
    currentIndex,
    next,
    progress,
    remainingPoints: next ? Math.max(0, next.minPoints - safePoints) : 0,
  };
}

export function MyPageScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [isGradeSheetOpen, setIsGradeSheetOpen] = useState(false);

  const displayName = useMemo(() => {
    if (!user?.nickname) return '게스트';
    return user.nickname;
  }, [user?.nickname]);

  const gradeInfo = useMemo(() => getGradeInfo(user?.points ?? 0), [user?.points]);

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

  const primaryRows: RowItem[] = [
    { title: '내 정보 설정', onPress: () => navigation.navigate({ name: 'Settings', section: 'account' }) },
    { title: '앱 설정', onPress: () => navigation.navigate({ name: 'Settings', section: 'app' }) },
    { title: '개인정보', onPress: () => navigation.navigate({ name: 'Settings', section: 'privacy' }) },
  ];

  const secondaryRows: RowItem[] = [
    { title: '공지 사항', onPress: () => navigation.navigate({ name: 'Notifications' }) },
    { title: '포인트 내역', onPress: () => navigation.navigate({ name: 'PointHistory' }) },
    { title: '1:1 문의하기', onPress: () => navigation.navigate({ name: 'Inquiry' }) },
    { title: '로그아웃', danger: true, onPress: handleLogout },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12) + 96 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => navigation.onTabScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {!user ? (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>로그인이 필요해요</Text>
            <Text style={styles.guestText}>내 정보와 활동 내역을 보려면 먼저 로그인해주세요.</Text>
            <Button label="로그인하기" onPress={() => navigation.navigate({ name: 'Login' })} />
          </View>
        ) : (
          <>
            <GradeCard
              name={displayName}
              points={user.points}
              gradeName={gradeInfo.current.name}
              nextGradeName={gradeInfo.next?.name}
              remainingPoints={gradeInfo.remainingPoints}
              progress={gradeInfo.progress}
              onPressGuide={() => setIsGradeSheetOpen(true)}
            />

            <RowGroup rows={primaryRows} />
            <View style={styles.sectionDivider} />
            <RowGroup rows={secondaryRows} />
          </>
        )}
      </ScrollView>

      {user ? (
        <GradeInfoSheet
          visible={isGradeSheetOpen}
          points={user.points}
          onClose={() => setIsGradeSheetOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function GradeCard({
  name,
  points,
  gradeName,
  nextGradeName,
  remainingPoints,
  progress,
  onPressGuide,
}: {
  name: string;
  points: number;
  gradeName: string;
  nextGradeName?: string;
  remainingPoints: number;
  progress: number;
  onPressGuide: () => void;
}) {
  const progressWidth = `${Math.round(progress * 100)}%` as DimensionValue;

  return (
    <PressableScale style={styles.gradeCard} onPress={onPressGuide}>
      <View style={styles.gradeCopy}>
        <Text style={styles.gradeTitle}>
          {name} 님은 현재{'\n'}
          <Text style={styles.gradeTitleAccent}>{gradeName}</Text> 등급이에요
        </Text>
        <Text style={styles.gradeMeta}>
          현재 {points.toLocaleString()}P 보유 중{'\n'}
          {nextGradeName
            ? `다음 ${remainingPoints.toLocaleString()}P 모으면 ${nextGradeName} 등급이에요`
            : '현재 가장 높은 등급이에요'}
        </Text>
        <View style={styles.gradeProgressTrack}>
          <View style={[styles.gradeProgressFill, { width: progressWidth }]} />
        </View>
        <View style={styles.gradeGuideLink}>
          <Text style={styles.gradeGuideText}>등급제 혜택 안내</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primary} />
        </View>
      </View>

      <GradeScene gradeName={gradeName} />
    </PressableScale>
  );
}

function GradeScene({ gradeName }: { gradeName: string }) {
  if (gradeName === '새싹') {
    return (
      <View style={styles.gradeScene} pointerEvents="none">
        <View style={styles.sceneShadow} />
        <View style={styles.sproutStem} />
        <View style={[styles.sproutLeaf, styles.sproutLeafLeft]} />
        <View style={[styles.sproutLeaf, styles.sproutLeafRight]} />
        <View style={styles.sproutDot} />
      </View>
    );
  }

  if (gradeName === '잎새') {
    return (
      <View style={styles.gradeScene} pointerEvents="none">
        <View style={styles.sceneShadow} />
        <View style={[styles.leafCluster, styles.leafClusterBack]} />
        <View style={[styles.leafCluster, styles.leafClusterMiddle]} />
        <View style={[styles.leafCluster, styles.leafClusterFront]} />
      </View>
    );
  }

  if (gradeName === '나무') {
    return (
      <View style={styles.gradeScene} pointerEvents="none">
        <View style={styles.sceneShadow} />
        <View style={styles.treeTrunk} />
        <View style={[styles.treeCrown, styles.treeCrownLeft]} />
        <View style={[styles.treeCrown, styles.treeCrownRight]} />
        <View style={[styles.treeCrown, styles.treeCrownTop]} />
      </View>
    );
  }

  if (gradeName === '숲') {
    return (
      <View style={styles.gradeScene} pointerEvents="none">
        <View style={styles.sceneShadow} />
        <View style={[styles.forestTrunk, styles.forestTrunkLeft]} />
        <View style={[styles.forestTrunk, styles.forestTrunkRight]} />
        <View style={[styles.forestTree, styles.forestTreeBack]} />
        <View style={[styles.forestTree, styles.forestTreeFront]} />
        <View style={[styles.forestTree, styles.forestTreeSide]} />
      </View>
    );
  }

  return (
    <View style={styles.gradeScene} pointerEvents="none">
      <View style={styles.sceneShadow} />
      <View style={styles.seedLeafBack} />
      <View style={styles.seedLeafFront} />
      <View style={styles.seedHighlight} />
    </View>
  );
}

function GradeInfoSheet({
  visible,
  points,
  onClose,
}: {
  visible: boolean;
  points: number;
  onClose: () => void;
}) {
  const gradeInfo = getGradeInfo(points);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.gradeSheetRoot}>
        <Pressable style={styles.gradeSheetBackdrop} onPress={onClose} />
        <View style={styles.gradeSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>등급 안내</Text>
              <Text style={styles.sheetSubtitle}>활동 포인트에 따라 등급이 올라가요</Text>
            </View>
            <PressableScale style={styles.sheetCloseButton} onPress={onClose}>
              <Ionicons name="close" size={18} color="#6E7A88" />
            </PressableScale>
          </View>

          <View style={styles.currentGradeBox}>
            <View style={[styles.currentGradeIcon, { backgroundColor: gradeInfo.current.background }]}>
              <MaterialCommunityIcons
                name={gradeInfo.current.icon}
                size={25}
                color={gradeInfo.current.tint}
              />
            </View>
            <View style={styles.currentGradeCopy}>
              <Text style={styles.currentGradeLabel}>현재 등급</Text>
              <Text style={styles.currentGradeName}>{gradeInfo.current.name}</Text>
              <Text style={styles.currentGradeMeta}>
                {gradeInfo.next
                  ? `${gradeInfo.next.name}까지 ${gradeInfo.remainingPoints.toLocaleString()}P 남았어요`
                  : '인하평의 마지막 등급에 도착했어요'}
              </Text>
            </View>
          </View>

          <View style={styles.sheetProgressTrack}>
            <View
              style={[
                styles.sheetProgressFill,
                { width: `${Math.round(gradeInfo.progress * 100)}%` as DimensionValue },
              ]}
            />
          </View>

          <View style={styles.gradeList}>
            {GRADE_LEVELS.map((grade, index) => {
              const isCurrent = index === gradeInfo.currentIndex;

              return (
                <View
                  key={grade.name}
                  style={[styles.gradeListRow, isCurrent ? styles.gradeListRowActive : null]}
                >
                  <View style={[styles.gradeListIcon, { backgroundColor: grade.background }]}>
                    <MaterialCommunityIcons name={grade.icon} size={19} color={grade.tint} />
                  </View>
                  <View style={styles.gradeListCopy}>
                    <View style={styles.gradeListTitleRow}>
                      <Text style={styles.gradeListName}>{grade.name}</Text>
                      <Text style={styles.gradeListPoint}>
                        {grade.minPoints.toLocaleString()}P 이상
                      </Text>
                    </View>
                    <Text style={styles.gradeListSummary}>{grade.summary}</Text>
                    <Text style={styles.gradeListBenefit}>{grade.benefit}</Text>
                  </View>
                  {isCurrent ? (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>현재</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RowGroup({ rows }: { rows: RowItem[] }) {
  return (
    <View style={styles.rowGroup}>
      {rows.map((row, index) => (
        <PressableScale
          key={row.title}
          style={[styles.menuRow, index === rows.length - 1 ? styles.menuRowLast : null]}
          onPress={row.onPress}
        >
          <View style={styles.menuTitleWrap}>
            <Text style={[styles.menuTitle, row.danger ? styles.menuTitleDanger : null]}>
              {row.title}
            </Text>
            {row.badge ? (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>{row.badge}</Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={16} color="#151A20" />
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    backgroundColor: colors.background,
  },
  gradeCard: {
    marginHorizontal: 0,
    minHeight: 150,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.page,
    paddingBottom: 18,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  gradeCopy: {
    flex: 1,
    minWidth: 0,
  },
  gradeTitle: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  gradeTitleAccent: {
    color: colors.primary,
  },
  gradeMeta: {
    marginTop: 6,
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: -0.15,
  },
  gradeGuideLink: {
    alignSelf: 'flex-start',
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gradeGuideText: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
    letterSpacing: -0.2,
  },
  gradeProgressTrack: {
    width: 146,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.fill,
    marginTop: 10,
    overflow: 'hidden',
  },
  gradeProgressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  gradeScene: {
    width: 92,
    height: 96,
    marginTop: 10,
    marginRight: 4,
    position: 'relative',
  },
  sceneShadow: {
    position: 'absolute',
    left: 27,
    bottom: 18,
    width: 48,
    height: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(55, 171, 76, 0.12)',
    transform: [{ rotate: '-18deg' }],
  },
  sproutStem: {
    position: 'absolute',
    left: 44,
    top: 39,
    width: 8,
    height: 44,
    borderRadius: 99,
    backgroundColor: '#69E46F',
    transform: [{ rotate: '2deg' }],
  },
  sproutLeaf: {
    position: 'absolute',
    width: 42,
    height: 34,
    borderRadius: 28,
    backgroundColor: '#8DEE73',
  },
  sproutLeafLeft: {
    left: 14,
    top: 27,
    transform: [{ rotate: '-30deg' }],
  },
  sproutLeafRight: {
    right: 8,
    top: 23,
    backgroundColor: '#70E36B',
    transform: [{ rotate: '32deg' }],
  },
  sproutDot: {
    position: 'absolute',
    right: 21,
    top: 31,
    width: 13,
    height: 22,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.26)',
    transform: [{ rotate: '32deg' }],
  },
  leafCluster: {
    position: 'absolute',
    borderTopLeftRadius: 42,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 34,
  },
  leafClusterBack: {
    right: 10,
    top: 15,
    width: 46,
    height: 64,
    backgroundColor: '#B4F07F',
    transform: [{ rotate: '22deg' }],
  },
  leafClusterMiddle: {
    left: 20,
    top: 28,
    width: 48,
    height: 54,
    backgroundColor: '#7BE570',
    transform: [{ rotate: '-24deg' }],
  },
  leafClusterFront: {
    right: 22,
    top: 37,
    width: 34,
    height: 43,
    backgroundColor: '#5ED36A',
    transform: [{ rotate: '42deg' }],
  },
  treeTrunk: {
    position: 'absolute',
    left: 42,
    top: 55,
    width: 13,
    height: 30,
    borderRadius: 5,
    backgroundColor: '#8BCB74',
  },
  treeCrown: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: '#75E071',
  },
  treeCrownLeft: {
    left: 15,
    top: 34,
    width: 43,
    height: 43,
    backgroundColor: '#69E46F',
  },
  treeCrownRight: {
    right: 8,
    top: 31,
    width: 45,
    height: 48,
    backgroundColor: '#9AEF78',
  },
  treeCrownTop: {
    left: 29,
    top: 14,
    width: 42,
    height: 47,
    backgroundColor: '#82E96F',
  },
  forestTrunk: {
    position: 'absolute',
    width: 10,
    height: 26,
    borderRadius: 4,
    backgroundColor: '#87C673',
  },
  forestTrunkLeft: {
    left: 30,
    top: 58,
  },
  forestTrunkRight: {
    right: 24,
    top: 54,
  },
  forestTree: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 24,
    borderRightWidth: 24,
    borderBottomWidth: 58,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  forestTreeBack: {
    left: 12,
    top: 24,
    borderBottomColor: '#B4F07F',
    transform: [{ scale: 0.92 }],
  },
  forestTreeFront: {
    right: 11,
    top: 17,
    borderBottomColor: '#70E36B',
  },
  forestTreeSide: {
    left: 36,
    top: 31,
    borderLeftWidth: 18,
    borderRightWidth: 18,
    borderBottomWidth: 45,
    borderBottomColor: '#5ED36A',
  },
  seedLeafBack: {
    position: 'absolute',
    right: 10,
    top: 18,
    width: 45,
    height: 70,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 10,
    backgroundColor: '#9AEF78',
    transform: [{ rotate: '36deg' }],
  },
  seedLeafFront: {
    position: 'absolute',
    right: 30,
    top: 36,
    width: 40,
    height: 50,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 28,
    backgroundColor: '#69E46F',
    transform: [{ rotate: '39deg' }],
  },
  seedHighlight: {
    position: 'absolute',
    right: 31,
    top: 32,
    width: 13,
    height: 39,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '32deg' }],
  },
  noticeBanner: {
    marginTop: 0,
    minHeight: 44,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingVertical: 10,
    gap: 8,
  },
  noticeIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionDivider: {
    height: 10,
    backgroundColor: colors.background,
  },
  rowGroup: {
    marginTop: 0,
    backgroundColor: colors.surface,
  },
  menuRow: {
    height: 56,
    paddingHorizontal: spacing.page,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  menuTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  menuTitleDanger: {
    color: colors.danger,
  },
  menuBadge: {
    borderRadius: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  menuBadgeText: {
    color: colors.primary,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  guestCard: {
    marginTop: spacing.page,
    marginHorizontal: spacing.page,
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    padding: spacing.page,
    gap: 13,
  },
  guestTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  guestText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  gradeSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  gradeSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 32, 0.38)',
  },
  gradeSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.page,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.fillStrong,
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.45,
  },
  sheetSubtitle: {
    marginTop: 3,
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentGradeBox: {
    borderRadius: spacing.radius,
    backgroundColor: colors.background,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentGradeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentGradeCopy: {
    flex: 1,
    minWidth: 0,
  },
  currentGradeLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  currentGradeName: {
    marginTop: 1,
    color: colors.text,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  currentGradeMeta: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sheetProgressTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.fill,
    marginTop: 12,
    overflow: 'hidden',
  },
  sheetProgressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.primary,
  },
  gradeList: {
    marginTop: 18,
    gap: 8,
  },
  gradeListRow: {
    minHeight: 74,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gradeListRowActive: {
    borderColor: '#BDE8FF',
    backgroundColor: '#F7FCFF',
  },
  gradeListIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeListCopy: {
    flex: 1,
    minWidth: 0,
  },
  gradeListTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  gradeListName: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  gradeListPoint: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  gradeListSummary: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  gradeListBenefit: {
    marginTop: 2,
    color: colors.textTertiary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  currentPill: {
    borderRadius: 99,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currentPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
});
