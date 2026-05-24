import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, PressableScale } from '../components/ui';
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
import { getDepartments } from '../lib/api/courses';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type AuthScreen =
  | 'landing'
  | 'login-email'
  | 'login-password'
  | 'signup-email'
  | 'signup-phone'
  | 'signup-password'
  | 'signup-nickname'
  | 'signup-department'
  | 'signup-complete'
  | 'reset-request'
  | 'reset-verify'
  | 'reset-new-password';

const SIGNUP_SCREENS: AuthScreen[] = [
  'signup-email',
  'signup-phone',
  'signup-password',
  'signup-nickname',
  'signup-department',
  'signup-complete',
];

const LOGIN_SCREENS: AuthScreen[] = ['login-email', 'login-password'];

const BACK_MAP: Partial<Record<AuthScreen, AuthScreen>> = {
  'login-email': 'landing',
  'login-password': 'login-email',
  'signup-email': 'landing',
  'signup-phone': 'signup-email',
  'signup-password': 'signup-phone',
  'signup-nickname': 'signup-password',
  'signup-department': 'signup-nickname',
  'signup-complete': 'signup-department',
  'reset-request': 'login-password',
  'reset-verify': 'reset-request',
  'reset-new-password': 'reset-verify',
};

interface Props {
  navigation: AppNavigation;
}

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [screen, setScreen] = useState<AuthScreen>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [department, setDepartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [deptList, setDeptList] = useState<string[]>([]);
  const [deptQuery, setDeptQuery] = useState('');

  useEffect(() => {
    getDepartments().then(setDeptList).catch(() => {});
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingPhone, setIsSendingPhone] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [isSendingResetSms, setIsSendingResetSms] = useState(false);
  const [isVerifyingReset, setIsVerifyingReset] = useState(false);
  const [isSignupEmailSent, setIsSignupEmailSent] = useState(false);
  const [isSignupPhoneVerified, setIsSignupPhoneVerified] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearFeedback = () => {
    setError('');
    setSuccess('');
  };

  const goTo = (next: AuthScreen) => {
    clearFeedback();
    setScreen(next);
  };

  const goBack = () => {
    const prev = BACK_MAP[screen];
    if (prev) goTo(prev);
  };

  const handleLogin = async () => {
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    clearFeedback();
    try {
      await signIn(email.trim(), password);
      navigation.switchTab('Home');
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    setIsSendingEmail(true);
    clearFeedback();
    try {
      await sendVerificationEmail(email.trim());
      setIsSignupEmailSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '이메일 전송에 실패했습니다.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendSignupPhoneCode = async () => {
    if (!phoneNumber.trim()) {
      setError('휴대폰 번호를 입력해주세요.');
      return;
    }
    setIsSendingPhone(true);
    clearFeedback();
    try {
      await sendSignupPhoneCode(phoneNumber.trim());
      setSuccess('인증번호를 보냈습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증번호 전송에 실패했습니다.');
    } finally {
      setIsSendingPhone(false);
    }
  };

  const handleVerifySignupPhoneCode = async () => {
    if (!phoneNumber.trim() || !signupCode.trim()) {
      setError('번호와 인증번호를 모두 입력해주세요.');
      return;
    }
    setIsVerifyingPhone(true);
    clearFeedback();
    try {
      await verifySignupPhoneCode(phoneNumber.trim(), signupCode.trim());
      setIsSignupPhoneVerified(true);
      setSuccess('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증번호가 올바르지 않습니다.');
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleSignup = async () => {
    if (!password.trim() || !signupPasswordConfirm.trim()) {
      setError('비밀번호를 모두 입력해주세요.');
      return;
    }

    if (password !== signupPasswordConfirm) {
      setError('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    clearFeedback();
    try {
      await signUp({
        email: email.trim(),
        password,
        department,
        nickname: nickname.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      goTo('signup-complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetSms = async () => {
    if (!email.trim() || !phoneNumber.trim()) {
      setError('이메일과 번호를 모두 입력해주세요.');
      return;
    }
    setIsSendingResetSms(true);
    clearFeedback();
    try {
      await sendPasswordResetSms(email.trim(), phoneNumber.trim());
      setSuccess('인증번호를 보냈습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '전송에 실패했습니다.');
    } finally {
      setIsSendingResetSms(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!resetCode.trim()) {
      setError('인증번호를 입력해주세요.');
      return;
    }
    setIsVerifyingReset(true);
    clearFeedback();
    try {
      await verifyPasswordResetCode(phoneNumber.trim(), resetCode.trim());
      goTo('reset-new-password');
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증번호가 올바르지 않습니다.');
    } finally {
      setIsVerifyingReset(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !newPasswordConfirm.trim()) {
      setError('새 비밀번호를 모두 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    clearFeedback();
    try {
      await resetPassword(phoneNumber.trim(), newPassword, newPasswordConfirm);
      goTo('login-email');
      setPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '비밀번호 재설정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Landing ---
  if (screen === 'landing') {
    return (
      <SafeAreaView style={styles.landingSafe} edges={['left', 'right', 'top']}>
        <View style={[styles.landingInner, { paddingBottom: insets.bottom + spacing.group }]}>
          <View style={styles.coveringTopBar}>
            <View style={styles.coveringBackGhost} />
            <Text style={styles.coveringTopTitle}>인하평 시작하기</Text>
            <PressableScale style={styles.coveringHelpButton} onPress={() => navigation.navigate({ name: 'Inquiry' })}>
              <Text style={styles.coveringHelpText}>문의하기</Text>
            </PressableScale>
          </View>

          <View style={styles.coveringIntro}>
            <View style={styles.coveringMascot}>
              <View style={styles.coveringMascotBoard}>
                <Text style={styles.coveringMascotText}>A+</Text>
              </View>
              <View style={styles.coveringMascotBook} />
            </View>
            <View style={styles.coveringIntroCopy}>
              <Text style={styles.coveringIntroTitle}>
                인하대 강의평을{'\n'}확인하려면 인증이 필요해요
              </Text>
              <Text style={styles.coveringIntroBody}>
                학교 이메일과 휴대폰 인증으로 안전하게 시작합니다.
              </Text>
            </View>
          </View>

          <View style={styles.landingActions}>
            <View style={styles.coveringNoticeCard}>
              <View style={styles.coveringNoticeIcon}>
                <Text style={styles.coveringNoticeIconText}>✓</Text>
              </View>
              <View style={styles.metricCopy}>
                <Text style={styles.metricCaption}>인하대 학생 인증</Text>
                <Text style={styles.metricValueText}>인증 후 강의평 작성과 저장이 가능해요</Text>
              </View>
            </View>

            <PressableScale style={styles.landingPrimaryButton} onPress={() => goTo('login-email')}>
              <Text style={styles.landingPrimaryButtonText}>로그인하기</Text>
            </PressableScale>
            <PressableScale style={styles.landingSecondaryButton} onPress={() => goTo('signup-email')}>
              <Text style={styles.landingSecondaryButtonText}>회원가입</Text>
            </PressableScale>
            <PressableScale style={styles.skipButton} onPress={() => navigation.switchTab('Home')}>
              <Text style={styles.skipText}>먼저 둘러보기</Text>
              <View style={styles.skipChevron} />
            </PressableScale>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- Step screens ---
  const signupStepIndex = SIGNUP_SCREENS.indexOf(screen);
  const isSignupStep = signupStepIndex !== -1;
  const loginStepIndex = LOGIN_SCREENS.indexOf(screen);
  const isLoginStep = loginStepIndex !== -1;
  const stepIndex = isSignupStep ? signupStepIndex : loginStepIndex;
  const totalSteps = isSignupStep ? SIGNUP_SCREENS.length : isLoginStep ? LOGIN_SCREENS.length : 0;
  const showProgress = stepIndex >= 0 && totalSteps > 0;

  const screenTitle = (() => {
    switch (screen) {
      case 'login-email': return '이메일을\n입력해주세요';
      case 'login-password': return '비밀번호를\n입력해주세요';
      case 'signup-email': return '이메일을\n입력해주세요';
      case 'signup-phone': return '휴대폰 번호를 입력해 주세요';
      case 'signup-password': return '비밀번호를\n설정해주세요';
      case 'signup-nickname': return '닉네임을\n설정해주세요';
      case 'signup-department': return '학과를\n선택해주세요';
      case 'signup-complete': return '환영해요!';
      case 'reset-request': return '비밀번호를\n재설정할게요';
      case 'reset-verify': return '인증번호를\n입력해주세요';
      case 'reset-new-password': return '새 비밀번호를\n설정해주세요';
      default: return '';
    }
  })();

  const screenSubtitle = (() => {
    switch (screen) {
      case 'login-email': return '인하대 이메일로 로그인해요.';
      case 'login-password': return email;
      case 'signup-email': return '인하대 학생 인증을 위해 이메일을 입력해주세요.';
      case 'signup-phone': return '';
      case 'signup-password': return '안전한 계정 사용을 위해 비밀번호를 설정해주세요.';
      case 'signup-nickname': return '다른 학생들에게 표시될 닉네임을 입력해주세요.';
      case 'signup-department': return '맞춤 강의 큐레이션을 위해 학과 정보를 알려주세요.';
      case 'signup-complete': return '모든 설정이 완료되었어요. 이제 나에게 맞는 강의를 찾아볼까요?';
      case 'reset-request': return '가입할 때 사용한 이메일과 휴대폰 번호를 입력해주세요.';
      case 'reset-verify': return '문자로 받은 6자리 인증번호를 입력해주세요.';
      case 'reset-new-password': return '이전과 다른 비밀번호를 사용해주세요.';
      default: return '';
    }
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <PressableScale style={styles.backBtn} onPress={goBack}>
            <View style={styles.chevron} />
          </PressableScale>
          <Text style={styles.stepTopTitle}>{isSignupStep ? '회원가입' : isLoginStep ? '로그인' : '계정 찾기'}</Text>
          <PressableScale style={styles.stepHelpButton} onPress={() => navigation.navigate({ name: 'Inquiry' })}>
            <Text style={styles.stepHelpText}>문의하기</Text>
          </PressableScale>
        </View>

        {showProgress ? <StepProgress current={stepIndex + 1} total={totalSteps} /> : null}

        {/* Content */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleArea}>
            <Text style={styles.screenTitle}>{screenTitle}</Text>
            {screenSubtitle ? (
              <Text
                style={
                  screen === 'login-password'
                    ? styles.subtitleEmail
                    : styles.screenSubtitle
                }
              >
                {screenSubtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.inputArea}>
            {/* login-email */}
            {screen === 'login-email' && (
              <LabelInput
                label="이메일"
                value={email}
                onChangeText={(v) => { setEmail(v); clearFeedback(); }}
                placeholder="inha@inha.edu"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}

            {/* login-password */}
            {screen === 'login-password' && (
              <LabelInput
                label="비밀번호"
                value={password}
                onChangeText={(v) => { setPassword(v); clearFeedback(); }}
                placeholder="비밀번호를 입력하세요"
                secureTextEntry
              />
            )}

            {/* signup-email */}
            {screen === 'signup-email' && (
              <>
                <LabelInput
                  label="학교 이메일"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setIsSignupEmailSent(false);
                    clearFeedback();
                  }}
                  placeholder="inha@inha.edu"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.actionLink, isSendingEmail && styles.disabled]}
                  onPress={handleSendVerificationEmail}
                  disabled={isSendingEmail}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionLinkText}>
                    {isSendingEmail
                      ? '전송 중...'
                      : isSignupEmailSent
                      ? '메일 다시 보내기'
                      : '인증 메일 보내기 →'}
                  </Text>
                </TouchableOpacity>
                {isSignupEmailSent && (
                  <View style={styles.infoBadge}>
                    <View style={styles.infoDot} />
                    <Text style={styles.infoText}>
                      메일을 보냈어요. 링크를 확인하고 다음으로 넘어가세요.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* signup-phone */}
            {screen === 'signup-phone' && (
              <>
                <View style={styles.rowInput}>
                  <View style={styles.rowInputFlex}>
                    <LabelInput
                      label="휴대폰 번호"
                      value={phoneNumber}
                      onChangeText={(v) => {
                        setPhoneNumber(v);
                        setIsSignupPhoneVerified(false);
                        clearFeedback();
                      }}
                      placeholder="01012345678"
                      keyboardType="number-pad"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.sideBtn, isSendingPhone && styles.disabled]}
                    onPress={handleSendSignupPhoneCode}
                    disabled={isSendingPhone}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sideBtnText}>
                      {isSendingPhone ? '전송' : '인증번호'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {!isSignupPhoneVerified && (
                  <View style={styles.rowInput}>
                    <View style={styles.rowInputFlex}>
                      <LabelInput
                        label="인증번호"
                        value={signupCode}
                        onChangeText={(v) => { setSignupCode(v); clearFeedback(); }}
                        placeholder="6자리 입력"
                        keyboardType="number-pad"
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.sideBtn, isVerifyingPhone && styles.disabled]}
                      onPress={handleVerifySignupPhoneCode}
                      disabled={isVerifyingPhone}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sideBtnText}>
                        {isVerifyingPhone ? '확인 중' : '확인'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isSignupPhoneVerified && (
                  <View style={styles.successBadge}>
                    <Text style={styles.successBadgeText}>✓  휴대폰 인증 완료</Text>
                  </View>
                )}
              </>
            )}

            {/* signup-nickname */}
            {screen === 'signup-nickname' && (
              <LabelInput
                label="닉네임"
                value={nickname}
                onChangeText={(v) => { setNickname(v); clearFeedback(); }}
                placeholder="2~10자로 입력해주세요"
              />
            )}

            {/* signup-password */}
            {screen === 'signup-password' && (
              <>
                <LabelInput
                  label="비밀번호"
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearFeedback(); }}
                  placeholder="영문, 숫자 조합 8자 이상"
                  secureTextEntry
                />
                <LabelInput
                  label="비밀번호 확인"
                  value={signupPasswordConfirm}
                  onChangeText={(v) => { setSignupPasswordConfirm(v); clearFeedback(); }}
                  placeholder="비밀번호를 다시 입력해주세요"
                  secureTextEntry
                />
              </>
            )}

            {/* signup-department */}
            {screen === 'signup-department' && (
              <>
                <TextInput
                  style={styles.deptSearchInput}
                  placeholder="학과 검색..."
                  placeholderTextColor="#9aa5b8"
                  value={deptQuery}
                  onChangeText={setDeptQuery}
                  returnKeyType="search"
                />
                <ScrollView style={styles.deptList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {deptList
                    .filter((d) => d.toLowerCase().includes(deptQuery.trim().toLowerCase()))
                    .map((dept) => {
                      const selected = department === dept;
                      return (
                        <TouchableOpacity
                          key={dept}
                          style={[styles.deptRow, selected && styles.deptRowActive]}
                          onPress={() => { setDepartment(dept); clearFeedback(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.deptRowText, selected && styles.deptRowTextActive]}>
                            {dept}
                          </Text>
                          <View style={selected ? styles.deptCheckOn : styles.deptCheckOff}>
                            {selected && <View style={styles.deptCheckTick} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            )}

            {/* signup-complete */}
            {screen === 'signup-complete' && (
              <View style={styles.completeStage}>
                <View style={styles.completeBadge}>
                  <View style={styles.capBoard} />
                  <View style={styles.capBase} />
                  <View style={styles.capBook} />
                </View>
                <Text style={styles.completeTitle}>인하평에 오신 걸 환영합니다.</Text>
                <Text style={styles.completeBody}>
                  이제 전공과 관심사에 맞는 강의평을 탐색할 수 있어요.
                </Text>
              </View>
            )}

            {/* reset-request */}
            {screen === 'reset-request' && (
              <>
                <LabelInput
                  label="이메일"
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearFeedback(); }}
                  placeholder="inha@inha.edu"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <LabelInput
                  label="휴대폰 번호"
                  value={phoneNumber}
                  onChangeText={(v) => { setPhoneNumber(v); clearFeedback(); }}
                  placeholder="01012345678"
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  style={[styles.actionLink, isSendingResetSms && styles.disabled]}
                  onPress={handleSendResetSms}
                  disabled={isSendingResetSms}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionLinkText}>
                    {isSendingResetSms ? '전송 중...' : '인증번호 받기 →'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* reset-verify */}
            {screen === 'reset-verify' && (
              <LabelInput
                label="인증번호"
                value={resetCode}
                onChangeText={(v) => { setResetCode(v); clearFeedback(); }}
                placeholder="6자리"
                keyboardType="number-pad"
              />
            )}

            {/* reset-new-password */}
            {screen === 'reset-new-password' && (
              <>
                <LabelInput
                  label="새 비밀번호"
                  value={newPassword}
                  onChangeText={(v) => { setNewPassword(v); clearFeedback(); }}
                  placeholder="8자 이상"
                  secureTextEntry
                />
                <LabelInput
                  label="새 비밀번호 확인"
                  value={newPasswordConfirm}
                  onChangeText={(v) => { setNewPasswordConfirm(v); clearFeedback(); }}
                  placeholder="한 번 더 입력해주세요"
                  secureTextEntry
                />
              </>
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}
        </ScrollView>

        {/* Bottom action bar */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + spacing.related },
          ]}
        >
          {screen === 'login-email' && (
            <Button
              label="다음"
              style={styles.stepButton}
              onPress={() => {
                if (!email.trim()) { setError('이메일을 입력해주세요.'); return; }
                goTo('login-password');
              }}
            />
          )}
          {screen === 'login-password' && (
            <>
              <Button label="로그인" style={styles.stepButton} onPress={handleLogin} loading={isSubmitting} />
              <PressableScale style={styles.textLink} onPress={() => goTo('reset-request')}>
                <Text style={styles.textLinkText}>비밀번호를 잊으셨나요?</Text>
              </PressableScale>
            </>
          )}
          {screen === 'signup-email' && (
            <Button
              label="다음"
              disabled={!isSignupEmailSent}
              style={styles.stepButton}
              onPress={() => goTo('signup-phone')}
            />
          )}
          {screen === 'signup-phone' && (
            <Button
              label="다음"
              disabled={!isSignupPhoneVerified}
              style={styles.stepButton}
              onPress={() => goTo('signup-password')}
            />
          )}
          {screen === 'signup-password' && (
            <Button
              label="다음"
              style={styles.stepButton}
              onPress={() => {
                if (!password.trim() || !signupPasswordConfirm.trim()) {
                  setError('비밀번호를 모두 입력해주세요.');
                  return;
                }
                if (password !== signupPasswordConfirm) {
                  setError('비밀번호가 서로 일치하지 않습니다.');
                  return;
                }
                goTo('signup-nickname');
              }}
            />
          )}
          {screen === 'signup-nickname' && (
            <Button
              label="다음"
              style={styles.stepButton}
              onPress={() => {
                if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return; }
                goTo('signup-department');
              }}
            />
          )}
          {screen === 'signup-department' && (
            <Button
              label="가입 완료"
              disabled={!department}
              style={styles.stepButton}
              onPress={handleSignup}
              loading={isSubmitting}
            />
          )}
          {screen === 'signup-complete' && (
            <Button
              label="시작하기"
              style={styles.stepButton}
              onPress={() => navigation.switchTab('Home')}
            />
          )}
          {screen === 'reset-request' && (
            <Button label="인증번호 확인하러 가기" style={styles.stepButton} onPress={() => goTo('reset-verify')} />
          )}
          {screen === 'reset-verify' && (
            <Button label="확인" style={styles.stepButton} onPress={handleVerifyResetCode} loading={isVerifyingReset} />
          )}
          {screen === 'reset-new-password' && (
            <Button
              label="비밀번호 변경하기"
              style={styles.stepButton}
              onPress={handleResetPassword}
              loading={isSubmitting}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressSegmentRow}>
        {Array.from({ length: total }).map((_, index) => {
          const active = index < current;
          return (
            <View key={index} style={styles.progressSegment}>
              {active ? <View style={styles.progressSegmentFill} /> : null}
            </View>
          );
        })}
      </View>
      <Text style={styles.stepCount}>{current} / {total}</Text>
    </View>
  );
}

function LabelInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad';
}) {
  return (
    <View style={inputStyles.wrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <TextInput
        style={inputStyles.field}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#b0bac8"
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: {
    gap: 7,
  },
  label: {
    color: '#111318',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  field: {
    minHeight: 48,
    backgroundColor: '#F4F7FA',
    borderRadius: 8,
    borderWidth: 0,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '500',
    color: '#111318',
  },
});

const styles = StyleSheet.create({
  backdropOrbLarge: {
    position: 'absolute',
    width: 390,
    height: 390,
    borderRadius: 195,
    backgroundColor: 'rgba(22,73,154,0.14)',
    top: 74,
    right: -160,
  },
  backdropOrbLargeSubtle: {
    top: 74,
    right: -176,
    backgroundColor: 'rgba(61,121,218,0.13)',
  },
  backdropOrbSmall: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(226,181,70,0.18)',
    left: -90,
    bottom: 130,
  },
  backdropOrbSmallSubtle: {
    backgroundColor: 'rgba(255,255,255,0.34)',
    bottom: 96,
  },
  backdropPaperPlane: {
    position: 'absolute',
    width: 620,
    height: 210,
    backgroundColor: 'rgba(255,255,255,0.54)',
    left: -120,
    top: 378,
    transform: [{ rotate: '-7deg' }],
  },

  // Landing
  landingSafe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  landingInner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingTop: 0,
  },
  coveringTopBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coveringBackGhost: {
    width: 58,
  },
  coveringTopTitle: {
    color: '#111318',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  coveringHelpButton: {
    width: 58,
    minHeight: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  coveringHelpText: {
    color: '#6E7A88',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  coveringIntro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    paddingBottom: 18,
  },
  coveringMascot: {
    width: 132,
    height: 132,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coveringMascotBoard: {
    width: 74,
    height: 62,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  coveringMascotText: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
  },
  coveringMascotBook: {
    width: 82,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DDE6F0',
    marginTop: -8,
  },
  coveringIntroCopy: {
    alignItems: 'center',
    gap: 10,
  },
  coveringIntroTitle: {
    color: '#111318',
    fontSize: 23,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  coveringIntroBody: {
    color: '#7A8594',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
  },
  landingActions: {
    gap: 10,
  },
  coveringNoticeCard: {
    minHeight: 58,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
  },
  landingMetricCard: {
    minHeight: 58,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySoft,
  },
  coveringNoticeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coveringNoticeIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  metricCopy: {
    flex: 1,
    gap: 2,
  },
  metricCaption: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  metricValueText: {
    color: '#5C6A7D',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  landingPrimaryButton: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  landingPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  landingSecondaryButton: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EBF1',
  },
  landingSecondaryButtonText: {
    color: '#111318',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 14,
    paddingBottom: 2,
  },
  skipText: {
    color: '#7b8798',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  skipChevron: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: '#8b96a8',
    transform: [{ rotate: '45deg' }],
  },

  // Step screen shell
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 52,
    borderBottomWidth: 0,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#0f1b2d',
    transform: [{ rotate: '45deg' }, { translateX: 2 }],
  },
  stepTopTitle: {
    position: 'absolute',
    left: 80,
    right: 80,
    color: '#111318',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepHelpButton: {
    minWidth: 60,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHelpText: {
    color: '#6E7A88',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  stepCount: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Progress
  progressWrap: {
    paddingHorizontal: spacing.page,
    gap: 7,
    marginBottom: 18,
  },
  progressSegmentRow: {
    flexDirection: 'row',
    gap: 5,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: '#EAEDF2',
  },
  progressSegmentFill: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: spacing.page,
    paddingTop: 4,
    paddingBottom: spacing.section,
    gap: 18,
  },

  // Title
  titleArea: {
    gap: 8,
    paddingTop: 2,
  },
  screenTitle: {
    color: '#111318',
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    color: '#8A96A8',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 4,
  },
  subtitleEmail: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },

  // Input area
  inputArea: {
    gap: 13,
  },

  // Inline action link
  actionLink: {
    paddingVertical: 4,
  },
  actionLinkText: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },

  // Info / sent badge
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  infoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  infoText: {
    flex: 1,
    color: colors.primary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  // Phone row input
  rowInput: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  rowInputFlex: {
    flex: 1,
  },
  sideBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  sideBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Verified
  successBadge: {
    backgroundColor: '#ebfff3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  successBadgeText: {
    color: '#1a8a4a',
    fontSize: 14,
    fontWeight: '600',
  },

  // Department list
  deptSearchInput: {
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: '#F4F7FA',
    borderWidth: 0,
    color: '#0f1b2d',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  deptList: {
    gap: 8,
    maxHeight: 280,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E8EF',
  },
  deptRowActive: {
    backgroundColor: '#E0F0FF',
    borderColor: '#23A9FF',
  },
  deptRowText: {
    color: '#0f1b2d',
    fontSize: 15,
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

  // Feedback
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  successText: {
    color: '#1a8a4a',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  completeStage: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  completeBadge: {
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: 'rgba(22,73,154,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  capBoard: {
    width: 78,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#7da7f2',
    transform: [{ rotate: '-8deg' }],
  },
  capBase: {
    width: 58,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    marginTop: -8,
  },
  capBook: {
    width: 62,
    height: 18,
    borderRadius: 8,
    backgroundColor: '#e8eef8',
    marginTop: -4,
  },
  completeTitle: {
    color: '#0f1b2d',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  completeBody: {
    maxWidth: 260,
    color: '#7b8798',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.35,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
  },
  stepButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  textLinkText: {
    color: '#8d99b0',
    fontSize: 13,
    fontWeight: '700',
  },
});
