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
  { key: 'notice', label: '공지사항', color: '#3976ce', bg: '#eef4ff' },
];

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  useEffect(() => {
    getNotices()
      .then(setNotices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = notices.filter((n) => {
    if (activeFilter === 'important') return n.isImportant;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
          <View style={styles.backArrow} />
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

      {!loading && filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.bellCircle}>
            <BellIllustration />
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
        <View style={[styles.chevron, expanded ? styles.chevronUp : null]} />
      </View>
      <Text style={styles.noticeTitle}>{notice.title}</Text>
      {expanded && <Text style={styles.noticeContent}>{notice.content}</Text>}
    </PressableScale>
  );
}

function BellIllustration() {
  return (
    <View style={styles.bellWrap}>
      <View style={styles.bellBody} />
      <View style={styles.bellTop} />
      <View style={styles.bellBottom} />
      <View style={styles.bellDotLeft} />
      <View style={styles.bellDotRight} />
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.page,
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipInactive: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  listContent: {
    paddingHorizontal: spacing.page,
    paddingTop: 4,
    gap: 10,
  },
  noticeCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f5edff',
  },
  importantBadgeText: {
    color: '#a66be4',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  noticeDate: {
    color: '#9aa5b8',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  chevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#8f9caf',
    transform: [{ rotate: '45deg' }],
  },
  chevronUp: {
    transform: [{ rotate: '-135deg' }],
  },
  noticeTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  noticeContent: {
    color: '#65738a',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.25,
    marginTop: 4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.page,
    gap: 14,
    marginTop: -48,
  },
  bellCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bellWrap: {
    width: 44,
    height: 48,
    alignItems: 'center',
  },
  bellBody: {
    position: 'absolute',
    top: 10,
    width: 36,
    height: 30,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  bellTop: {
    position: 'absolute',
    top: 0,
    width: 10,
    height: 12,
    borderRadius: 5,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  bellBottom: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 8,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  bellDotLeft: {
    position: 'absolute',
    left: 6,
    top: 22,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primarySoft,
  },
  bellDotRight: {
    position: 'absolute',
    right: 6,
    top: 22,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primarySoft,
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
  settingsHint: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
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
    color: '#65738a',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
});
