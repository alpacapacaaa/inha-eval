import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/ui';
import { getMyInquiries, submitInquiry } from '../lib/api/inquiry';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { InquiryItem } from '../types/models';

interface Props {
  navigation: AppNavigation;
}

const INQUIRY_TYPES = [
  { key: 'bug', label: '🐛 버그 신고' },
  { key: 'feature', label: '💡 기능 제안' },
  { key: 'review', label: '📝 강의평 문의' },
  { key: 'account', label: '👤 계정 문의' },
  { key: 'etc', label: '기타' },
] as const;

type InquiryType = (typeof INQUIRY_TYPES)[number]['key'];

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  PENDING: { text: '검토 중', color: '#e09b2d' },
  ANSWERED: { text: '답변 완료', color: '#34c759' },
  CLOSED: { text: '종료', color: '#9aa5b8' },
};

export function InquiryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState<InquiryType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myInquiries, setMyInquiries] = useState<InquiryItem[]>([]);

  useEffect(() => {
    getMyInquiries()
      .then(setMyInquiries)
      .catch(() => {});
  }, []);

  const canSubmit = selectedType !== null && title.trim().length >= 2 && content.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting || !selectedType) return;

    setIsSubmitting(true);
    try {
      const item = await submitInquiry({
        category: selectedType,
        title: title.trim(),
        content: content.trim(),
      });
      setMyInquiries((prev) => [item, ...prev]);
      setSelectedType(null);
      setTitle('');
      setContent('');
      Alert.alert(
        '문의가 접수됐어요',
        '빠른 시일 내에 검토 후 답변드리겠습니다.\n감사합니다!',
        [{ text: '확인' }],
      );
    } catch {
      Alert.alert('오류', '문의 전송에 실패했어요. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
          <View style={styles.backArrow} />
        </PressableScale>
        <Text style={styles.headerTitle}>문의하기</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>문의 유형</Text>
          <View style={styles.typeGrid}>
            {INQUIRY_TYPES.map((type) => (
              <PressableScale
                key={type.key}
                style={[styles.typeChip, selectedType === type.key ? styles.typeChipActive : null]}
                onPress={() => setSelectedType(type.key)}
              >
                <Text style={[styles.typeChipText, selectedType === type.key ? styles.typeChipTextActive : null]}>
                  {type.label}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>제목</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="문의 제목을 입력하세요"
            placeholderTextColor="#9aa5b8"
            value={title}
            onChangeText={(text) => setTitle(text.slice(0, 100))}
            returnKeyType="next"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>문의 내용</Text>
            <Text style={styles.charCount}>{content.length} / 500</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="불편한 점이나 건의사항을 자유롭게 적어주세요. (최소 10자)"
            placeholderTextColor="#9aa5b8"
            value={content}
            onChangeText={(text) => setContent(text.slice(0, 500))}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.hintCard}>
          <View style={styles.hintDot} />
          <Text style={styles.hintText}>
            답변은 가입하신 이메일로 발송돼요. 보통 1–3 영업일 내에 답변드려요.
          </Text>
        </View>

        <PressableScale
          style={[styles.submitButton, !canSubmit ? styles.submitButtonDisabled : null]}
          onPress={handleSubmit}
        >
          <Text style={styles.submitText}>{isSubmitting ? '전송 중...' : '문의 보내기'}</Text>
        </PressableScale>

        {myInquiries.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>내 문의 내역</Text>
            {myInquiries.map((item) => {
              const status = STATUS_LABEL[item.status] ?? { text: item.status, color: '#9aa5b8' };
              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyCardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${status.color}18` }]}>
                      <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyCardContent} numberOfLines={2}>
                    {item.content}
                  </Text>
                  {item.answer ? (
                    <View style={styles.answerBox}>
                      <Text style={styles.answerLabel}>답변</Text>
                      <Text style={styles.answerText}>{item.answer}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  content: {
    paddingHorizontal: spacing.page,
    gap: 20,
    paddingTop: 4,
  },
  section: {
    gap: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  charCount: {
    color: '#9aa5b8',
    fontSize: 12,
    fontWeight: '500',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.94)',
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    color: '#65738a',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  titleInput: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  textArea: {
    minHeight: 160,
    borderRadius: 18,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    color: '#111827',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#c5d9f8',
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
    color: colors.primary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  submitButton: {
    minHeight: 58,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#c8d3e2',
    shadowOpacity: 0,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  historySection: {
    gap: 12,
  },
  historyTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  historyCard: {
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
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyCardTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  historyCardContent: {
    color: '#65738a',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  answerBox: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.primarySoft,
    gap: 4,
  },
  answerLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  answerText: {
    color: '#2d4a7a',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  historyDate: {
    color: '#9aa5b8',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
});
