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

type ActiveModal = 'nickname' | 'department' | 'password' | 'deleteAccount' | null;

export function SettingsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user, updateProfile, deleteAccount } = useAuth();
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

  // delete account modal
  const [deletePw, setDeletePw] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const closeModal = () => {
    setActiveModal(null);
    setNicknameInput('');
    setDepartmentInput('');
    setDeptQuery('');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setDeletePw('');
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

  const handleDeleteAccount = async () => {
    if (!deletePw || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePw);
      closeModal();
      navigation.replace({ name: 'Login' });
    } catch {
      Alert.alert('오류', '탈퇴에 실패했어요. 비밀번호를 확인해주세요.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const SECTIONS = [
    { key: 'account' as const, label: '계정 정보' },
    { key: 'privacy' as const, label: '개인정보' },
    { key: 'app' as const, label: '앱 설정' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
          <View style={styles.backArrow} />
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
              ]}
            />
            <ActionCard
              title="보안"
              items={[
                {
                  label: '로그인 기록 보기',
                  onPress: () => Alert.alert('준비 중', '로그인 기록 기능은 준비 중입니다.'),
                },
                {
                  label: '개인정보 처리방침',
                  onPress: () => Alert.alert('준비 중', '개인정보 처리방침 페이지는 준비 중입니다.'),
                },
              ]}
            />
            <View style={styles.dangerCard}>
              <Text style={styles.dangerTitle}>계정 탈퇴</Text>
              <Text style={styles.dangerDesc}>
                탈퇴 시 모든 리뷰와 활동 내역이 삭제되며 복구가 불가능해요.
              </Text>
              <PressableScale style={styles.dangerButton} onPress={() => openModal('deleteAccount')}>
                <Text style={styles.dangerButtonText}>탈퇴하기</Text>
              </PressableScale>
            </View>
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

      {/* 계정 탈퇴 모달 */}
      <BottomModal visible={activeModal === 'deleteAccount'} onClose={closeModal} title="계정 탈퇴">
        <View style={styles.deleteWarning}>
          <Text style={styles.deleteWarningText}>
            탈퇴하면 모든 리뷰와 활동 내역이 영구 삭제돼요.{'\n'}계속하려면 비밀번호를 입력해주세요.
          </Text>
        </View>
        <Text style={styles.modalLabel}>비밀번호 확인</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="비밀번호를 입력하세요"
          placeholderTextColor="#9aa5b8"
          value={deletePw}
          onChangeText={setDeletePw}
          secureTextEntry
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleDeleteAccount}
        />
        <PressableScale
          style={[styles.modalButtonDanger, !deletePw ? styles.modalButtonDisabled : null]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.modalButtonDangerText}>{deleteLoading ? '탈퇴 중...' : '탈퇴하기'}</Text>
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
            <View style={styles.actionChevron} />
          </PressableScale>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.page,
    gap: 8,
    paddingBottom: 16,
  },
  tab: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: '#65738a',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  content: {
    paddingHorizontal: spacing.page,
    gap: 14,
    paddingTop: 4,
  },
  card: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  cardTitle: {
    color: '#65738a',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f0f3f8',
    marginVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  infoLabel: {
    color: '#65738a',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  infoValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
    flexShrink: 1,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  actionLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  actionChevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: '#8f9caf',
    transform: [{ rotate: '45deg' }],
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
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  toggleDesc: {
    color: '#8fa3bc',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  dangerCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.16)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  dangerTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  dangerDesc: {
    color: '#65738a',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  dangerButton: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.18)',
  },
  dangerButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  modalLabel: {
    color: '#65738a',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalButton: {
    marginTop: 20,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  modalButtonDisabled: {
    backgroundColor: '#c8d3e2',
    shadowOpacity: 0,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  modalButtonDanger: {
    marginTop: 20,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  modalButtonDangerText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  deleteWarning: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  deptSearchInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
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
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(128,143,166,0.18)',
    marginBottom: 8,
  },
  deptRowActive: {
    backgroundColor: '#eef4ff',
    borderColor: 'rgba(22,73,154,0.3)',
  },
  deptRowText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  deptRowTextActive: {
    color: colors.primary,
    fontWeight: '900',
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
