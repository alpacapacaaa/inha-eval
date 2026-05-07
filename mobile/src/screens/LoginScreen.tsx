import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { AppNavigation } from '../navigation/AppNavigator';
import {
  resetPassword,
  sendPasswordResetSms,
  sendSignupPhoneCode,
  sendVerificationEmail,
  verifyPasswordResetCode,
  verifySignupPhoneCode,
} from '../lib/api/auth';
import { departments } from '../lib/departments';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type AuthMode = 'login' | 'signup' | 'reset';

interface Props {
  navigation: AppNavigation;
}

const modeTabs: Array<{ value: AuthMode; label: string; copy: string }> = [
  { value: 'login', label: '로그인', copy: '저장된 계정으로 바로 강의 탐색 피드에 진입해요.' },
  { value: 'signup', label: '회원가입', copy: '메일과 휴대폰 인증을 거쳐 계정을 만들어요.' },
  { value: 'reset', label: '비밀번호 재설정', copy: '번호 인증 후 새 비밀번호로 안전하게 바꿔요.' },
];

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [nickname, setNickname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingPhone, setIsSendingPhone] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [isSendingResetSms, setIsSendingResetSms] = useState(false);
  const [isVerifyingResetCode, setIsVerifyingResetCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSignupPhoneVerified, setIsSignupPhoneVerified] = useState(false);
  const [isResetCodeVerified, setIsResetCodeVerified] = useState(false);

  const currentTab = modeTabs.find((tab) => tab.value === mode) ?? modeTabs[0];

  const resetFeedback = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage('');
    setSuccessMessage('');
    setSignupCode('');
    setResetCode('');
    setIsSignupPhoneVerified(false);
    setIsResetCodeVerified(false);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    resetFeedback();

    try {
      await signIn(email.trim(), password);
      navigation.switchTab('Home');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!email.trim()) {
      setErrorMessage('인증 메일을 받을 인하대 이메일을 입력해주세요.');
      return;
    }

    setIsSendingEmail(true);
    resetFeedback();

    try {
      await sendVerificationEmail(email.trim());
      setSuccessMessage('인증 메일을 보냈습니다. 메일함에서 링크를 눌러주세요.');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('이메일 인증 요청에 실패했습니다.');
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendSignupPhoneCode = async () => {
    if (!phoneNumber.trim()) {
      setErrorMessage('휴대폰 번호를 입력해주세요.');
      return;
    }

    setIsSendingPhone(true);
    resetFeedback();

    try {
      await sendSignupPhoneCode(phoneNumber.trim());
      setSuccessMessage('휴대폰 인증번호를 보냈습니다.');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('휴대폰 인증번호 요청에 실패했습니다.');
      }
    } finally {
      setIsSendingPhone(false);
    }
  };

  const handleVerifySignupPhoneCode = async () => {
    if (!phoneNumber.trim() || !signupCode.trim()) {
      setErrorMessage('휴대폰 번호와 인증번호를 모두 입력해주세요.');
      return;
    }

    setIsVerifyingPhone(true);
    resetFeedback();

    try {
      await verifySignupPhoneCode(phoneNumber.trim(), signupCode.trim());
      setIsSignupPhoneVerified(true);
      setSuccessMessage('휴대폰 인증이 완료되었습니다.');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('휴대폰 인증 확인에 실패했습니다.');
      }
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim() || !department.trim() || !nickname.trim() || !phoneNumber.trim()) {
      setErrorMessage('회원가입에 필요한 항목을 모두 입력해주세요.');
      return;
    }

    if (!isSignupPhoneVerified) {
      setErrorMessage('휴대폰 인증을 먼저 완료해주세요.');
      return;
    }

    setIsSubmitting(true);
    resetFeedback();

    try {
      await signUp({
        email: email.trim(),
        password,
        department: department.trim(),
        nickname: nickname.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      setSuccessMessage('회원가입이 완료되었습니다. 홈 피드로 이동합니다.');
      navigation.switchTab('Home');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetSms = async () => {
    if (!email.trim() || !phoneNumber.trim()) {
      setErrorMessage('이메일과 휴대폰 번호를 모두 입력해주세요.');
      return;
    }

    setIsSendingResetSms(true);
    resetFeedback();

    try {
      await sendPasswordResetSms(email.trim(), phoneNumber.trim());
      setSuccessMessage('비밀번호 재설정용 인증번호를 보냈습니다.');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('재설정 인증번호 요청에 실패했습니다.');
      }
    } finally {
      setIsSendingResetSms(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!phoneNumber.trim() || !resetCode.trim()) {
      setErrorMessage('휴대폰 번호와 인증번호를 모두 입력해주세요.');
      return;
    }

    setIsVerifyingResetCode(true);
    resetFeedback();

    try {
      await verifyPasswordResetCode(phoneNumber.trim(), resetCode.trim());
      setIsResetCodeVerified(true);
      setSuccessMessage('인증번호 확인이 완료되었습니다.');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('인증번호 확인에 실패했습니다.');
      }
    } finally {
      setIsVerifyingResetCode(false);
    }
  };

  const handleResetPassword = async () => {
    if (!phoneNumber.trim() || !newPassword.trim() || !newPasswordConfirm.trim()) {
      setErrorMessage('새 비밀번호 항목을 모두 입력해주세요.');
      return;
    }

    if (!isResetCodeVerified) {
      setErrorMessage('인증번호 확인을 먼저 완료해주세요.');
      return;
    }

    setIsSubmitting(true);
    resetFeedback();

    try {
      await resetPassword(phoneNumber.trim(), newPassword, newPasswordConfirm);
      setSuccessMessage('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.');
      handleModeChange('login');
      setPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('비밀번호 재설정 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.related, paddingBottom: spacing.section }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroShell}>
          <View style={styles.heroOrbLarge} />
          <View style={styles.heroOrbSmall} />
          <Text style={styles.heroEyebrow}>계정 입장</Text>
          <Text style={styles.heroTitle}>계정도 같은 결로{"\n"}매끄럽게 들어오게</Text>
          <Text style={styles.heroBody}>
            인하평의 탐색 흐름을 끊지 않도록, 인증 화면도 입력폼이 아니라 제품의 한 장면처럼 다듬었습니다.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRail}>
          {modeTabs.map((tab) => {
            const active = mode === tab.value;
            return (
              <Pressable
                key={tab.value}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.modeChip,
                  active ? styles.modeChipActive : null,
                  pressed ? styles.buttonPressed : null,
                ]}
                onPress={() => handleModeChange(tab.value)}
              >
                <Text style={[styles.modeChipTitle, active ? styles.modeChipTitleActive : null]}>
                  {tab.label}
                </Text>
                <Text style={[styles.modeChipCopy, active ? styles.modeChipCopyActive : null]}>
                  {tab.copy}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetEyebrow}>{currentTab.label}</Text>
            <Text style={styles.sheetTitle}>{currentTab.copy}</Text>
          </View>

          <View style={styles.formStack}>
            {mode === 'login' ? (
              <>
                <Field label="이메일" value={email} onChangeText={setEmail} placeholder="inha@inha.edu" autoCapitalize="none" keyboardType="email-address" />
                <Field label="비밀번호" value={password} onChangeText={setPassword} placeholder="비밀번호를 입력하세요" secureTextEntry />
                <PrimaryButton
                  label="로그인하고 피드 보기"
                  onPress={handleLogin}
                  loading={isSubmitting}
                />
              </>
            ) : null}

            {mode === 'signup' ? (
              <>
                <Field label="인하대 이메일" value={email} onChangeText={setEmail} placeholder="inha@inha.edu" autoCapitalize="none" keyboardType="email-address" />
                <ActionCard
                  title="이메일 인증"
                  body="메일함에서 인증 링크를 눌러야 회원가입이 마무리됩니다."
                  buttonLabel={isSendingEmail ? '전송 중' : '인증 메일 보내기'}
                  onPress={handleSendVerificationEmail}
                  disabled={isSendingEmail}
                />
                <Field label="휴대폰 번호" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="01012345678" keyboardType="number-pad" />
                <ActionCard
                  title="휴대폰 인증"
                  body={isSignupPhoneVerified ? '휴대폰 인증이 완료되었습니다.' : '인증번호를 받은 뒤 확인까지 진행해주세요.'}
                  buttonLabel={isSendingPhone ? '전송 중' : '인증번호 보내기'}
                  onPress={handleSendSignupPhoneCode}
                  disabled={isSendingPhone}
                />
                <InlineVerifyRow
                  value={signupCode}
                  onChangeText={setSignupCode}
                  buttonLabel={isVerifyingPhone ? '확인 중' : isSignupPhoneVerified ? '인증 완료' : '인증 확인'}
                  onPress={handleVerifySignupPhoneCode}
                  disabled={isVerifyingPhone}
                />
                <Field label="비밀번호" value={password} onChangeText={setPassword} placeholder="영문과 숫자를 포함해 8자 이상" secureTextEntry />
                <Field label="닉네임" value={nickname} onChangeText={setNickname} placeholder="앱에서 표시될 닉네임" />
                <DepartmentSelector value={department} onChange={setDepartment} />
                <PrimaryButton
                  label="회원가입 완료하고 시작하기"
                  onPress={handleSignup}
                  loading={isSubmitting}
                />
              </>
            ) : null}

            {mode === 'reset' ? (
              <>
                <Field label="이메일" value={email} onChangeText={setEmail} placeholder="inha@inha.edu" autoCapitalize="none" keyboardType="email-address" />
                <Field label="휴대폰 번호" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="01012345678" keyboardType="number-pad" />
                <ActionCard
                  title="재설정 인증번호"
                  body="이메일과 번호가 일치하면 인증번호를 보냅니다."
                  buttonLabel={isSendingResetSms ? '전송 중' : '인증번호 보내기'}
                  onPress={handleSendResetSms}
                  disabled={isSendingResetSms}
                />
                <InlineVerifyRow
                  value={resetCode}
                  onChangeText={setResetCode}
                  buttonLabel={isVerifyingResetCode ? '확인 중' : isResetCodeVerified ? '확인 완료' : '인증 확인'}
                  onPress={handleVerifyResetCode}
                  disabled={isVerifyingResetCode}
                />
                <Field label="새 비밀번호" value={newPassword} onChangeText={setNewPassword} placeholder="영문과 숫자를 포함해 8자 이상" secureTextEntry />
                <Field label="새 비밀번호 확인" value={newPasswordConfirm} onChangeText={setNewPasswordConfirm} placeholder="한 번 더 입력해주세요" secureTextEntry />
                <PrimaryButton
                  label="새 비밀번호로 변경하기"
                  onPress={handleResetPassword}
                  loading={isSubmitting}
                />
              </>
            ) : null}
          </View>

          {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable style={styles.secondaryBackdoor} onPress={() => navigation.switchTab('Home')}>
            <Text style={styles.secondaryBackdoorText}>둘러보기로 돌아가기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad';
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#8d95a5"
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function DepartmentSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.departmentBlock}>
      <View style={styles.departmentHeader}>
        <Text style={styles.fieldLabel}>소속 학과</Text>
        <Text style={styles.departmentHint}>{value || '전공 추천의 기준이 됩니다'}</Text>
      </View>
      <View style={styles.departmentGrid}>
        {departments.map((department) => {
          const active = value === department;
          return (
            <Pressable
              key={department}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.departmentChip,
                active ? styles.departmentChipActive : null,
                pressed ? styles.buttonPressed : null,
              ]}
              onPress={() => onChange(department)}
            >
              <Text style={[styles.departmentChipText, active ? styles.departmentChipTextActive : null]}>
                {department}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ActionCard({
  title,
  body,
  buttonLabel,
  onPress,
  disabled,
}: {
  title: string;
  body: string;
  buttonLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.actionCard}>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionBody}>{body}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.actionButton,
          disabled ? styles.actionButtonDisabled : null,
          pressed && !disabled ? styles.buttonPressed : null,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={styles.actionButtonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

function InlineVerifyRow({
  value,
  onChangeText,
  buttonLabel,
  onPress,
  disabled,
}: {
  value: string;
  onChangeText: (value: string) => void;
  buttonLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.inlineRow}>
      <TextInput
        placeholder="인증번호 6자리"
        placeholderTextColor="#8d95a5"
        style={styles.inlineInput}
        keyboardType="number-pad"
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.inlineButton,
          disabled ? styles.actionButtonDisabled : null,
          pressed && !disabled ? styles.buttonPressed : null,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={styles.inlineButtonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primaryButton,
        loading ? styles.primaryButtonDisabled : null,
        pressed && !loading ? styles.buttonPressed : null,
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9fd',
  },
  content: {
    paddingHorizontal: spacing.page,
    gap: spacing.section,
  },
  heroShell: {
    borderRadius: 36,
    backgroundColor: '#0f1729',
    padding: spacing.page,
    overflow: 'hidden',
    gap: spacing.related,
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    right: -48,
    top: -48,
    backgroundColor: 'rgba(59,130,246,0.24)',
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    left: -28,
    bottom: -32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroEyebrow: {
    color: '#8db9ff',
    fontSize: 12,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.4,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    maxWidth: '90%',
  },
  modeRail: {
    gap: spacing.related,
    paddingRight: spacing.page,
  },
  modeChip: {
    width: 180,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.58)',
    padding: spacing.group,
    gap: spacing.tight,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    shadowColor: '#16499a',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  modeChipActive: {
    backgroundColor: '#0d3ea9',
    borderColor: '#0d3ea9',
  },
  modeChipTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  modeChipTitleActive: {
    color: '#ffffff',
  },
  modeChipCopy: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  modeChipCopyActive: {
    color: 'rgba(255,255,255,0.72)',
  },
  sheet: {
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    padding: spacing.page,
    gap: spacing.group,
    shadowColor: '#16499a',
    shadowOpacity: 0.09,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  sheetHeader: {
    gap: spacing.tight,
  },
  sheetEyebrow: {
    color: '#4d78d0',
    fontSize: 12,
    fontWeight: '800',
  },
  sheetTitle: {
    color: '#121722',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  formStack: {
    gap: spacing.group,
  },
  fieldBlock: {
    gap: spacing.tight,
  },
  fieldLabel: {
    color: '#53627e',
    fontSize: 12,
    fontWeight: '800',
  },
  fieldInput: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  departmentBlock: {
    gap: spacing.tight,
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.related,
  },
  departmentHint: {
    color: '#8d95a5',
    fontSize: 11,
    fontWeight: '800',
  },
  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  departmentChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  departmentChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  departmentChipText: {
    color: '#53627e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.15,
  },
  departmentChipTextActive: {
    color: '#ffffff',
  },
  actionCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.74)',
    padding: spacing.group,
    gap: spacing.related,
  },
  actionCopy: {
    gap: 4,
  },
  actionTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  actionBody: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 16,
    backgroundColor: 'rgba(223,234,252,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.68)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#0d3ea9',
    fontSize: 13,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.985 }],
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.related,
  },
  inlineInput: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  inlineButton: {
    minWidth: 104,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  inlineButtonText: {
    color: '#0d3ea9',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 22,
    backgroundColor: 'rgba(13,62,169,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 56,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  successText: {
    color: '#2f6f3e',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  secondaryBackdoor: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryBackdoorText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
  },
});
