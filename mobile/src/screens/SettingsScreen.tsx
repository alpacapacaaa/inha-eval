import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { changePassword } from '../lib/api/auth';
import { getDepartments } from '../lib/api/courses';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { AppRoute } from '../types/navigation';

interface Props {
  navigation: AppNavigation;
  route: Extract<AppRoute, { name: 'Settings' }>;
}

type ActiveModal = 'nickname' | 'department' | 'password' | null;

type LegalSection = {
  heading: string;
  body: string;
};

const SERVICE_TERMS_SECTIONS: LegalSection[] = [
  {
    heading: '서비스 목적',
    body: '인하평은 인하대학교 학생들이 강의 정보, 시간표 구성, 강의평 요약을 확인하고 직접 강의평을 작성할 수 있도록 돕는 서비스입니다.',
  },
  {
    heading: '회원의 의무',
    body: '회원은 타인의 권리를 침해하거나 허위 정보, 욕설, 광고성 게시물, 개인정보가 포함된 내용을 등록해서는 안 됩니다. 운영상 필요한 경우 부적절한 게시물은 숨김 또는 삭제될 수 있습니다.',
  },
  {
    heading: '강의평 이용',
    body: '강의평은 익명 기반 참고 정보이며 실제 수업 운영, 평가 방식, 담당 교수, 분반 정보는 학기별로 달라질 수 있습니다. 최종 수강 판단은 학교 공식 공지와 수강신청 정보를 함께 확인해야 합니다.',
  },
  {
    heading: '서비스 변경과 중단',
    body: '운영상 필요한 경우 기능, 화면, 제공 정보가 변경될 수 있으며 점검이나 장애가 발생하면 서비스 이용이 일시적으로 제한될 수 있습니다.',
  },
];

const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: '수집하는 개인정보',
    body: '회원가입과 본인 확인을 위해 이메일, 닉네임, 학과, 휴대폰 번호를 처리합니다. 서비스 이용 과정에서 강의평, 문의 내역, 포인트 내역, 접속 기록이 생성될 수 있습니다.',
  },
  {
    heading: '이용 목적',
    body: '개인정보는 회원 식별, 학교 구성원 인증, 맞춤 강의 추천, 문의 응대, 서비스 안정성 확보, 부정 이용 방지, 포인트 적립 내역 관리에 사용됩니다.',
  },
  {
    heading: '보관과 파기',
    body: '회원 정보는 서비스 이용 기간 동안 보관하며 탈퇴 또는 처리 목적 달성 후 지체 없이 파기합니다. 관계 법령에 따라 보관이 필요한 기록은 정해진 기간 동안 분리 보관할 수 있습니다.',
  },
  {
    heading: '이용자의 권리',
    body: '회원은 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 앱 내 설정 또는 1:1 문의를 통해 요청하면 본인 확인 후 필요한 조치를 진행합니다.',
  },
];

export function SettingsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const [notifyReview, setNotifyReview] = useState(true);
  const [notifyPoint, setNotifyPoint] = useState(true);
  const [notifyNotice, setNotifyNotice] = useState(false);

  const initialSection = route.section ?? 'account';
  const [activeSection, setActiveSection] = useState<'account' | 'privacy' | 'app'>(initialSection);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // nickname modal
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameLoading, setNicknameLoading] = useState(false);

  // department picker
  const [deptList, setDeptList] = useState<string[]>([]);
  const [departmentInput, setDepartmentInput] = useState('');
  const [deptQuery, setDeptQuery] = useState('');
  const [departmentLoading, setDepartmentLoading] = useState(false);

  useEffect(() => {
    getDepartments().then(setDeptList).catch(() => {});
  }, []);

  // password modal
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const closeModal = () => {
    setActiveModal(null);
    setNicknameInput('');
    setDepartmentInput('');
    setDeptQuery('');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
  };

  const openModal = (modal: ActiveModal) => {
    if (modal === 'nickname') setNicknameInput(user?.nickname ?? '');
    if (modal === 'department') setDepartmentInput(user?.department ?? '');
    setActiveModal(modal);
  };

  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed || nicknameLoading) return;
    setNicknameLoading(true);
    try {
      await updateProfile({ nickname: trimmed });
      closeModal();
    } catch {
      Alert.alert('오류', '닉네임 변경에 실패했어요. 다시 시도해주세요.');
    } finally {
      setNicknameLoading(false);
    }
  };

  const handleSelectDepartment = async (dept: string) => {
    if (departmentLoading) return;
    setDepartmentLoading(true);
    try {
      await updateProfile({ department: dept });
      closeModal();
    } catch {
      Alert.alert('오류', '학과 변경에 실패했어요. 다시 시도해주세요.');
    } finally {
      setDepartmentLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPw || !newPw || !confirmPw || passwordLoading) return;
    if (newPw !== confirmPw) {
      Alert.alert('오류', '새 비밀번호가 일치하지 않아요.');
      return;
    }
    if (newPw.length < 8) {
      Alert.alert('오류', '새 비밀번호는 8자 이상이어야 해요.');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(currentPw, newPw);
      closeModal();
      Alert.alert('완료', '비밀번호가 변경됐어요.');
    } catch {
      Alert.alert('오류', '비밀번호 변경에 실패했어요. 현재 비밀번호를 확인해주세요.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const SECTIONS = [
    { key: 'account' as const, label: '내 정보' },
    { key: 'app' as const, label: '앱 설정' },
    { key: 'privacy' as const, label: '개인정보' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </PressableScale>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <View style={styles.tabRow}>
        {SECTIONS.map((section) => (
          <PressableScale
            key={section.key}
            style={[styles.tab, activeSection === section.key ? styles.tabActive : null]}
            onPress={() => setActiveSection(section.key)}
          >
            <Text style={[styles.tabText, activeSection === section.key ? styles.tabTextActive : null]}>
              {section.label}
            </Text>
          </PressableScale>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {activeSection === 'account' && (
          <>
            <InfoCard
              title="기본 정보"
              rows={[
                { label: '닉네임', value: user?.nickname ?? '—' },
                { label: '이메일', value: user?.email ?? '—' },
                { label: '학과', value: user?.department ?? '미설정' },
                { label: '포인트', value: `${user?.points ?? 0}P` },
              ]}
            />
            <ActionCard
              title="계정 관리"
              items={[
                { label: '비밀번호 변경', onPress: () => openModal('password') },
                { label: '학과 변경', onPress: () => openModal('department') },
                { label: '닉네임 변경', onPress: () => openModal('nickname') },
              ]}
            />
          </>
        )}

        {activeSection === 'privacy' && (
          <>
            <InfoCard
              title="인증 정보"
              rows={[
                { label: '이메일 인증', value: '완료' },
                { label: '인하대 이메일', value: user?.email ?? '—' },
                { label: '전화번호', value: user?.phoneNumber ?? '미등록' },
              ]}
            />
            <LegalTextCard title="서비스 이용약관" sections={SERVICE_TERMS_SECTIONS} />
            <LegalTextCard title="개인정보 처리방침" sections={PRIVACY_POLICY_SECTIONS} />
          </>
        )}

        {activeSection === 'app' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>알림 설정</Text>
              <ToggleRow
                label="새 강의평 알림"
                description="내가 담은 강의에 새 리뷰가 올라오면 알려드려요."
                value={notifyReview}
                onToggle={setNotifyReview}
              />
              <View style={styles.rowDivider} />
              <ToggleRow
                label="포인트 적립 알림"
                description="리뷰 도움돼요 반응이 쌓이면 알려드려요."
                value={notifyPoint}
                onToggle={setNotifyPoint}
              />
              <View style={styles.rowDivider} />
              <ToggleRow
                label="공지사항 알림"
                description="서비스 업데이트 및 공지를 받아요."
                value={notifyNotice}
                onToggle={setNotifyNotice}
              />
            </View>

            <InfoCard
              title="앱 정보"
              rows={[
                { label: '버전', value: '1.0.0' },
                { label: '빌드', value: '2025.05' },
                { label: '서비스', value: '인하평 (인하대 강의평 서비스)' },
              ]}
            />
          </>
        )}
      </ScrollView>

      {/* 닉네임 변경 모달 */}
      <BottomModal visible={activeModal === 'nickname'} onClose={closeModal} title="닉네임 변경">
        <Text style={styles.modalLabel}>새 닉네임</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="새 닉네임을 입력하세요"
          placeholderTextColor="#9aa5b8"
          value={nicknameInput}
          onChangeText={setNicknameInput}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSaveNickname}
        />
        <PressableScale
          style={[styles.modalButton, !nicknameInput.trim() ? styles.modalButtonDisabled : null]}
          onPress={handleSaveNickname}
        >
          <Text style={styles.modalButtonText}>{nicknameLoading ? '저장 중...' : '저장'}</Text>
        </PressableScale>
      </BottomModal>

      {/* 학과 변경 모달 - 목록 피커 */}
      <Modal visible={activeModal === 'department'} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalScrim} onPress={closeModal} />
          <View style={styles.deptSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>학과 선택</Text>
            <TextInput
              style={styles.deptSearchInput}
              placeholder="학과 검색..."
              placeholderTextColor="#9aa5b8"
              value={deptQuery}
              onChangeText={setDeptQuery}
              autoFocus
              returnKeyType="search"
            />
            <FlatList
              data={deptList.filter((d) =>
                d.toLowerCase().includes(deptQuery.trim().toLowerCase()),
              )}
              keyExtractor={(d) => d}
              style={styles.deptFlatList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item === user?.department;
                return (
                  <PressableScale
                    style={[styles.deptRow, isSelected ? styles.deptRowActive : null]}
                    onPress={() => handleSelectDepartment(item)}
                  >
                    <Text style={[styles.deptRowText, isSelected ? styles.deptRowTextActive : null]}>
                      {item}
                    </Text>
                    {isSelected ? (
                      <View style={styles.deptCheckOn}>
                        <View style={styles.deptCheckTick} />
                      </View>
                    ) : (
                      <View style={styles.deptCheckOff} />
                    )}
                  </PressableScale>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* 비밀번호 변경 모달 */}
      <BottomModal visible={activeModal === 'password'} onClose={closeModal} title="비밀번호 변경">
        <Text style={styles.modalLabel}>현재 비밀번호</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="현재 비밀번호"
          placeholderTextColor="#9aa5b8"
          value={currentPw}
          onChangeText={setCurrentPw}
          secureTextEntry
          autoFocus
          returnKeyType="next"
        />
        <Text style={[styles.modalLabel, { marginTop: 12 }]}>새 비밀번호</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="새 비밀번호 (8자 이상)"
          placeholderTextColor="#9aa5b8"
          value={newPw}
          onChangeText={setNewPw}
          secureTextEntry
          returnKeyType="next"
        />
        <Text style={[styles.modalLabel, { marginTop: 12 }]}>새 비밀번호 확인</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="새 비밀번호 확인"
          placeholderTextColor="#9aa5b8"
          value={confirmPw}
          onChangeText={setConfirmPw}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSavePassword}
        />
        <PressableScale
          style={[
            styles.modalButton,
            (!currentPw || !newPw || !confirmPw) ? styles.modalButtonDisabled : null,
          ]}
          onPress={handleSavePassword}
        >
          <Text style={styles.modalButtonText}>{passwordLoading ? '변경 중...' : '비밀번호 변경'}</Text>
        </PressableScale>
      </BottomModal>
    </SafeAreaView>
  );
}

function BottomModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InfoCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {rows.map((row, index) => (
        <View key={row.label}>
          {index > 0 ? <View style={styles.rowDivider} /> : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text style={styles.infoValue}>{row.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ActionCard({ title, items }: { title: string; items: { label: string; onPress: () => void }[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {items.map((item, index) => (
        <View key={item.label}>
          {index > 0 ? <View style={styles.rowDivider} /> : null}
          <PressableScale style={styles.actionRow} onPress={item.onPress}>
            <Text style={styles.actionLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#a0aabb" />
          </PressableScale>
        </View>
      ))}
    </View>
  );
}

function LegalTextCard({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <View style={styles.legalCard}>
      <Text style={styles.legalTitle}>{title}</Text>
      {sections.map((section, index) => (
        <View key={section.heading} style={index > 0 ? styles.legalSectionSpaced : null}>
          <Text style={styles.legalHeading}>{section.heading}</Text>
          <Text style={styles.legalBody}>{section.body}</Text>
        </View>
      ))}
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#dde2ec', true: colors.primary }}
        thumbColor="#ffffff"
      />
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.page,
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tab: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F4',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: '#5E6E85',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  content: {
    paddingHorizontal: spacing.page,
    gap: 10,
    paddingTop: 8,
  },
  card: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 2,
  },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
    marginBottom: 8,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    gap: 12,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  infoValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
    flexShrink: 1,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  legalCard: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 0,
  },
  legalTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: -0.35,
    marginBottom: 10,
  },
  legalSectionSpaced: {
    marginTop: 11,
  },
  legalHeading: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  legalBody: {
    color: '#5E6E85',
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  toggleDesc: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: -0.25,
  },
  dangerCard: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.16)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  dangerTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dangerDesc: {
    color: '#5E6E85',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.25,
  },
  dangerButton: {
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.18)',
  },
  dangerButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 36,
    gap: 0,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#c8d4e8',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#111318',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  modalLabel: {
    color: '#5E6E85',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    color: '#111318',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  modalButton: {
    marginTop: 20,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  modalButtonDisabled: {
    backgroundColor: '#c8d3e2',
    shadowOpacity: 0,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  modalButtonDanger: {
    marginTop: 20,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  modalButtonDangerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  deleteWarning: {
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.14)',
    marginBottom: 16,
  },
  deleteWarningText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  // department picker
  deptSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  deptSearchInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    color: '#111318',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  deptFlatList: {
    flexGrow: 0,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(128,143,166,0.18)',
    marginBottom: 8,
  },
  deptRowActive: {
    backgroundColor: '#EBF3FF',
    borderColor: 'rgba(22,73,154,0.3)',
  },
  deptRowText: {
    color: '#111318',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  deptRowTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  deptCheckOff: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d0d7e3',
    backgroundColor: 'transparent',
  },
  deptCheckOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptCheckTick: {
    width: 8,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ffffff',
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
});
