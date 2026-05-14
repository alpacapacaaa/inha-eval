import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/ui';
import { getNotices } from '../lib/api/notices';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { NoticeItem } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

type FilterKey = 'all' | 'notice' | 'important';

const FILTERS: { key: FilterKey; label: string; color: string; bg: string }[] = [
  { key: 'all', label: '전체', color: colors.primary, bg: colors.primarySoft },
  { key: 'important', label: '중요 공지', color: '#a66be4', bg: '#f5edff' },
  { key: 'notice', label: '공지사항', color: '#23A9FF', bg: '#EBF3FF' },
];

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  useEffect(() => {
    setError(false);
    getNotices()
      .then(setNotices)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = notices.filter((n) => {
    if (activeFilter === 'important') return n.isImportant;
    if (activeFilter === 'notice') return !n.isImportant;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>알림 · 공지</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <PressableScale
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key ? { backgroundColor: f.bg } : styles.filterChipInactive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterChipText, { color: activeFilter === f.key ? f.color : '#8f9caf' }]}>
              {f.label}
            </Text>
          </PressableScale>
        ))}
      </View>

      {!loading && error ? (
        <View style={styles.emptyWrap}>
          <View style={styles.bellCircle}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>공지를 불러오지 못했어요</Text>
          <Text style={styles.emptyDesc}>
            네트워크 연결을 확인하고{'\n'}잠시 후 다시 시도해주세요.
          </Text>
        </View>
      ) : !loading && filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.bellCircle}>
            <Ionicons name="notifications-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>아직 공지사항이 없어요</Text>
          <Text style={styles.emptyDesc}>
            서비스 업데이트나 중요 공지가{'\n'}생기면 여기에 표시돼요.
          </Text>
          <View style={styles.settingsHint}>
            <View style={styles.hintDot} />
            <Text style={styles.hintText}>알림 설정은 설정 {'>'} 앱 설정에서 변경할 수 있어요.</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <NoticeCard notice={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function NoticeCard({ notice }: { notice: NoticeItem }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(notice.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <PressableScale style={styles.noticeCard} onPress={() => setExpanded((v) => !v)}>
      <View style={styles.noticeCardHeader}>
        <View style={styles.noticeMeta}>
          {notice.isImportant && (
            <View style={styles.importantBadge}>
              <Text style={styles.importantBadgeText}>중요</Text>
            </View>
          )}
          <Text style={styles.noticeDate}>{date}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#8f9caf" />
      </View>
      <Text style={styles.noticeTitle}>{notice.title}</Text>
      {expanded && <Text style={styles.noticeContent}>{notice.content}</Text>}
    </PressableScale>
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.page,
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EEF1F4',
  },
  filterChipInactive: {
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  listContent: {
    paddingHorizontal: spacing.page,
    paddingTop: 4,
    gap: 8,
  },
  noticeCard: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  noticeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noticeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importantBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#f5edff',
  },
  importantBadgeText: {
    color: '#a66be4',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  noticeDate: {
    color: '#9aa5b8',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  noticeTitle: {
    color: '#111318',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  noticeContent: {
    color: '#5E6E85',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: -0.25,
    marginTop: 4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
    marginTop: -48,
  },
  bellCircle: {
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
  settingsHint: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  hintDot: {
    marginTop: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  hintText: {
    flex: 1,
    color: '#5E6E85',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: -0.25,
  },
});
