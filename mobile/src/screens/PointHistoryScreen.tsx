import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatePanel } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { getPointHistory } from '../lib/api/points';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { PointHistoryItem } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

export function PointHistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [history, setHistory] = useState<PointHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPointHistory()
      .then(setHistory)
      .catch((e) => setError(e instanceof Error ? e.message : '포인트 내역을 불러오지 못했어요.'))
      .finally(() => setLoading(false));
  }, []);

  const totalPoints = user?.points ?? 0;
  const earned = history.filter((h) => h.points > 0).reduce((s, h) => s + h.points, 0);
  const spent = history.filter((h) => h.points < 0).reduce((s, h) => s + h.points, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
          <View style={styles.backArrow} />
        </PressableScale>
        <Text style={styles.headerTitle}>포인트 내역</Text>
      </View>

      <FlatList
        data={loading || error ? [] : history}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryMain}>
                <Text style={styles.summaryLabel}>보유 포인트</Text>
                <Text style={styles.summaryPoints}>{totalPoints.toLocaleString()}P</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatLabel}>총 적립</Text>
                  <Text style={[styles.summaryStatValue, styles.earnColor]}>+{earned.toLocaleString()}P</Text>
                </View>
                <View style={styles.summaryStatDivider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatLabel}>총 사용</Text>
                  <Text style={[styles.summaryStatValue, styles.spentColor]}>{spent.toLocaleString()}P</Text>
                </View>
              </View>
            </View>

            {loading ? <StatePanel label="포인트 내역을 불러오는 중입니다." loading /> : null}
            {!loading && error ? <StatePanel label={error} error /> : null}
            {!loading && !error && history.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyCircle}>
                  <CoinIllustration />
                </View>
                <Text style={styles.emptyTitle}>아직 포인트 내역이 없어요</Text>
                <Text style={styles.emptyDesc}>
                  강의평을 작성하거나{'\n'}도움이 된 리뷰로 선정되면 포인트가 적립돼요.
                </Text>
              </View>
            ) : null}
            {!loading && !error && history.length > 0 ? (
              <Text style={styles.listLabel}>전체 내역</Text>
            ) : null}
          </>
        }
        renderItem={({ item, index }) => (
          <HistoryRow item={item} isLast={index === history.length - 1} />
        )}
      />
    </SafeAreaView>
  );
}

function HistoryRow({ item, isLast }: { item: PointHistoryItem; isLast: boolean }) {
  const isEarn = item.points >= 0;
  const date = new Date(item.date).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={[styles.row, isLast ? styles.rowLast : null]}>
      <View style={[styles.rowDot, { backgroundColor: isEarn ? '#dcf5e7' : '#fdecea' }]}>
        <View style={[styles.rowDotCore, { backgroundColor: isEarn ? '#34c759' : colors.danger }]} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowDesc}>{item.description}</Text>
        <Text style={styles.rowDate}>{date}</Text>
      </View>
      <Text style={[styles.rowPoints, isEarn ? styles.earnColor : styles.spentColor]}>
        {isEarn ? '+' : ''}{item.points.toLocaleString()}P
      </Text>
    </View>
  );
}

function CoinIllustration() {
  return (
    <View style={styles.coinWrap}>
      <View style={styles.coinOuter}>
        <View style={styles.coinInner}>
          <Text style={styles.coinText}>P</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingBottom: 16,
    gap: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
  },
  backArrow: {
    width: 9,
    height: 9,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#111827',
    transform: [{ rotate: '45deg' }, { translateX: 2 }],
  },
  headerTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  listContent: {
    paddingHorizontal: spacing.page,
    gap: 0,
    paddingTop: 4,
  },
  summaryCard: {
    borderRadius: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 22,
    marginBottom: 20,
    gap: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  summaryMain: {
    gap: 6,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  summaryPoints: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
    gap: 4,
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  summaryStatValue: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  summaryStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  earnColor: {
    color: '#4cd964',
  },
  spentColor: {
    color: '#ff6b6b',
  },
  listLabel: {
    color: '#65738a',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f8',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowDotCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowDesc: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  rowDate: {
    color: '#9aa5b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rowPoints: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 32,
    gap: 14,
  },
  emptyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  coinWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  emptyDesc: {
    color: '#65738a',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
});
