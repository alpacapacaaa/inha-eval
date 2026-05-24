import { Ionicons } from '@expo/vector-icons';
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
          <Ionicons name="chevron-back" size={20} color={colors.text} />
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
                  <Ionicons name="wallet-outline" size={48} color={colors.primary} />
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
          <HistoryRow item={item} isFirst={index === 0} isLast={index === history.length - 1} />
        )}
      />
    </SafeAreaView>
  );
}

function HistoryRow({
  item,
  isFirst,
  isLast,
}: {
  item: PointHistoryItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isEarn = item.points >= 0;
  const date = new Date(item.date).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={[styles.row, isFirst ? styles.rowFirst : null, isLast ? styles.rowLast : null]}>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
    gap: 10,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  listContent: {
    paddingHorizontal: spacing.page,
    gap: 0,
    paddingTop: 16,
  },
  summaryCard: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  summaryMain: {
    gap: 6,
  },
  summaryLabel: {
    color: '#6E7A88',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  summaryPoints: {
    color: '#171A1F',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 35,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#EEF1F4',
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
    color: '#8D98A6',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  summaryStatValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#EEF1F4',
    marginHorizontal: 16,
  },
  earnColor: {
    color: '#1FAE65',
  },
  spentColor: {
    color: colors.danger,
  },
  listLabel: {
    color: '#5E6E85',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
  },
  rowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  rowFirst: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  rowDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowDesc: {
    color: '#111318',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  rowDate: {
    color: '#9aa5b8',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  rowPoints: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 32,
    gap: 14,
  },
  emptyCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#111318',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  emptyDesc: {
    color: '#5E6E85',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
});
