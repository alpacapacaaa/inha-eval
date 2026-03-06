import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { departments } from '../data/mockData';
import { userService } from '../api/api';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, GraduationCap, Building2, ArrowRight, Smartphone, CheckCircle2 } from 'lucide-react';

interface AuthPageProps {
  onLogin?: () => void;
}

type AuthMode = 'login' | 'signup' | 'find-password';

export function AuthPage({ onLogin }: AuthPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = (searchParams.get('mode') as AuthMode) || 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Verification states for signup
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isEmailCodeSent, setIsEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState('');

  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isPhoneCodeSent, setIsPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');

  // Password recovery states
  const [findPwdStep, setFindPwdStep] = useState(1); // 1: input info, 2: verify phone, 3: reset password
  const [newPassword, setNewPassword] = useState('');

  // Signup step state
  const [signupStep, setSignupStep] = useState(1); // 1: Verification, 2: Info input

  const isLogin = initialMode === 'login';
  const isSignup = initialMode === 'signup';
  const isFindPwd = initialMode === 'find-password';

  const resetStates = () => {
    setIsEmailVerified(false);
    setIsEmailCodeSent(false);
    setEmailCode('');
    setIsPhoneVerified(false);
    setIsPhoneCodeSent(false);
    setPhoneCode('');
    setFindPwdStep(1);
    setSignupStep(1);
    setEmail('');
    setPassword('');
    setPhone('');
    setNickname('');
    setDepartment('');
  };

  const changeMode = (mode: AuthMode) => {
    resetStates();
    navigate(`/auth?mode=${mode}`);
  };

  // --- Handlers for Signup ---

  const handleSendEmailCode = async () => {
    if (!email.endsWith('@inha.ac.kr')) {
      toast.error('인하대 이메일(@inha.ac.kr) 형식이 아닙니다.');
      return;
    }
    setIsLoading(true);
    try {
      await userService.sendVerificationEmail(email);
      setIsEmailCodeSent(true);
      toast.success('인증 코드가 발송되었습니다. 메일을 확인해주세요. (코드: 123456)');
    } catch (error: any) {
      toast.error(error.message || '인증 코드 발송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    setIsLoading(true);
    try {
      await userService.verifyEmailCode(email, emailCode);
      setIsEmailVerified(true);
      toast.success('이메일 인증에 성공했습니다.');
    } catch (error: any) {
      toast.error(error.message || '인증 코드가 틀렸습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPhoneCode = async () => {
    if (phone.length < 10) {
      toast.error('올바른 전화번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      await userService.sendVerificationPhone(phone);
      setIsPhoneCodeSent(true);
      toast.success('SMS 인증 코드가 발송되었습니다. (코드: 111111)');
    } catch (error: any) {
      toast.error(error.message || '인증 코드 발송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    setIsLoading(true);
    try {
      await userService.verifyPhoneCode(phone, phoneCode);
      setIsPhoneVerified(true);
      toast.success('전화번호 인증에 성공했습니다.');
    } catch (error: any) {
      toast.error(error.message || '인증 코드가 틀렸습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers for Find Password ---

  const handleFindPassword = async () => {
    setIsLoading(true);
    try {
      await userService.findPassword(email, phone);
      await userService.sendVerificationPhone(phone);
      setFindPwdStep(2);
      toast.success('회원 정보 확인 완료! 휴대폰 인증을 진행해주세요. (코드: 111111)');
    } catch (error: any) {
      toast.error(error.message || '일치하는 회원 정보가 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindPwdVerifyPhone = async () => {
    setIsLoading(true);
    try {
      await userService.verifyPhoneCode(phone, phoneCode);
      setFindPwdStep(3);
      toast.success('인증 성공! 새로운 비밀번호를 설정해주세요.');
    } catch (error: any) {
      toast.error(error.message || '인증 코드가 틀렸습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 4) {
      toast.error('비밀번호는 4자리 이상이어야 합니다.');
      return;
    }
    setIsLoading(true);
    try {
      await userService.resetPassword(email, newPassword);
      toast.success('비밀번호가 재설정되었습니다. 다시 로그인해주세요.');
      changeMode('login');
    } catch (error: any) {
      toast.error(error.message || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Final Submit Handler ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignup && signupStep === 1) {
      if (isEmailVerified && isPhoneVerified) {
        setSignupStep(2);
      } else {
        toast.error('본인 인증을 완료해주세요.');
      }
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) {
          toast.error('이메일과 비밀번호를 입력해주세요');
          setIsLoading(false);
          return;
        }
        await userService.login(email, password);
        if (onLogin) onLogin();
        toast.success('환영합니다!');
        navigate('/');
      } else if (isSignup) {
        if (!email || !password || !nickname || !department || !phone) {
          toast.error('모든 항목을 입력해주세요');
          setIsLoading(false);
          return;
        }
        await userService.signup({ email, nickname, department, hasPass: false });
        toast.success('회원가입이 완료되었습니다!');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 blur-3xl opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-purple-100 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-indigo-100 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 lg:p-10 border border-gray-100">

        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-3 shadow-lg shadow-indigo-100">
            {isFindPwd ? <Lock className="w-7 h-7 text-white" /> : <GraduationCap className="w-7 h-7 text-white" />}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isLogin ? '다시 만나서 반가워요' : isSignup ? (signupStep === 1 ? '인하대생 인증하기' : '기본 정보 입력') : '비밀번호 찾기'}
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            {isLogin ? '서비스를 이용하려면 로그인해주세요' : isSignup ? (signupStep === 1 ? '학교 이메일과 휴대폰으로 인증을 진행해주세요' : '가입을 위해 필요한 정보를 입력해주세요') : '등록된 정보로 본인임을 확인해주세요'}
          </p>
        </div>

        {/* Progress Stepper for Signup */}
        {isSignup && (
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${signupStep === 1 ? 'bg-indigo-600 text-white shadow-md ring-4 ring-indigo-50' : 'bg-emerald-100 text-emerald-600'}`}>
              {signupStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <div className={`h-0.5 w-10 transition-all ${signupStep > 1 ? 'bg-emerald-200' : 'bg-slate-100'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${signupStep === 2 ? 'bg-indigo-600 text-white shadow-md ring-4 ring-indigo-50' : 'bg-slate-100 text-slate-400'}`}>
              2
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isFindPwd ? (e) => e.preventDefault() : handleSubmit} className="space-y-6">
          <div className="space-y-4">

            {/* --- FIND PASSWORD FLOW --- */}
            {isFindPwd && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-5">
                {findPwdStep === 1 && (
                  <>
                    <div className="space-y-1.5 font-bold">
                      <Label htmlFor="find-email" className="text-sm text-slate-700 ml-1">이메일</Label>
                      <Input
                        id="find-email"
                        type="email"
                        placeholder="example@inha.ac.kr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-50 border-gray-200 rounded-xl h-12 px-4 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5 font-bold">
                      <Label htmlFor="find-phone" className="text-sm text-slate-700 ml-1">전화번호</Label>
                      <Input
                        id="find-phone"
                        type="tel"
                        placeholder="010-1234-5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-gray-50 border-gray-200 rounded-xl h-12 px-4 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <Button
                      onClick={handleFindPassword}
                      disabled={isLoading}
                      className="w-full h-12 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all mt-2"
                    >
                      {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : '다음 단계로'}
                    </Button>
                  </>
                )}

                {findPwdStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-xs text-center text-slate-500 font-bold bg-slate-50 py-3 rounded-xl">휴대폰({phone})으로 전송된<br />인증번호 6자리를 입력해주세요.</p>
                    <div className="space-y-1.5 font-bold">
                      <Input
                        type="text"
                        placeholder="인증코드 6자리"
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                        className="bg-white/50 border-slate-200 rounded-xl h-12 text-center text-lg tracking-widest font-black"
                      />
                    </div>
                    <Button
                      onClick={handleFindPwdVerifyPhone}
                      disabled={isLoading}
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100"
                    >
                      인증하기
                    </Button>
                  </div>
                )}

                {findPwdStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5 font-bold">
                      <Label className="text-sm text-slate-700 ml-1">새 비밀번호 설정</Label>
                      <Input
                        type="password"
                        placeholder="새 비밀번호 입력"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-white/50 border-slate-200 rounded-xl h-12 px-4"
                      />
                    </div>
                    <Button
                      onClick={handleResetPassword}
                      disabled={isLoading}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-100"
                    >
                      비밀번호 변경 완료
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* --- LOGIN FLOW --- */}
            {isLogin && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-bold text-slate-700 ml-1">이메일</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@inha.ac.kr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="pl-11 bg-gray-50 border-gray-200 focus:border-indigo-600 focus:ring-indigo-500/20 focus:ring-2 transition-all rounded-xl h-12 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <Label htmlFor="password" className="text-sm font-bold text-slate-700">비밀번호</Label>
                    <button
                      type="button"
                      onClick={() => changeMode('find-password')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="pl-11 bg-gray-50 border-gray-200 focus:border-indigo-600 focus:ring-indigo-500/20 focus:ring-2 transition-all rounded-xl h-12 font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- SIGNUP FLOW (Step by Step) --- */}
            {isSignup && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">

                {signupStep === 1 && (
                  <>
                    {/* 1. Email Verification */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                        학교 이메일 인증
                        {isEmailVerified && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="example@inha.ac.kr"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isEmailVerified || isLoading}
                          className="flex-1 bg-white/50 border-slate-200 rounded-xl h-12 font-medium px-4"
                        />
                        {!isEmailVerified && (
                          <Button
                            type="button"
                            onClick={handleSendEmailCode}
                            disabled={isLoading || !email}
                            className="bg-slate-900 text-white rounded-xl h-12 px-4 text-xs font-bold shrink-0 shadow-sm"
                          >
                            {isEmailCodeSent ? '재발송' : '인증발송'}
                          </Button>
                        )}
                      </div>
                      {isEmailCodeSent && !isEmailVerified && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                          <Input
                            placeholder="인증코드 6자리"
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value)}
                            className="flex-1 bg-indigo-50/50 border-indigo-100 rounded-xl h-12 px-4 font-bold text-center tracking-widest"
                          />
                          <Button
                            type="button"
                            onClick={handleVerifyEmailCode}
                            className="bg-indigo-600 text-white rounded-xl h-12 px-4 text-xs font-bold"
                          >
                            코드확인
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* 2. Phone Verification */}
                    <div className={`space-y-1.5 transition-all duration-500 ${!isEmailVerified ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                      <Label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                        휴대폰 본인 확인
                        {isPhoneVerified && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="tel"
                          placeholder="010-1234-5678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={isPhoneVerified || isLoading || !isEmailVerified}
                          className="flex-1 bg-white/50 border-slate-200 rounded-xl h-12 font-medium px-4"
                        />
                        {!isPhoneVerified && (
                          <Button
                            type="button"
                            onClick={handleSendPhoneCode}
                            disabled={isLoading || !phone || !isEmailVerified}
                            className="bg-slate-900 text-white rounded-xl h-12 px-4 text-xs font-bold shrink-0 shadow-sm"
                          >
                            {isPhoneCodeSent ? '재발송' : '인증발송'}
                          </Button>
                        )}
                      </div>
                      {isPhoneCodeSent && !isPhoneVerified && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                          <Input
                            placeholder="인증코드 6자리"
                            value={phoneCode}
                            onChange={(e) => setPhoneCode(e.target.value)}
                            className="flex-1 bg-indigo-50/50 border-indigo-100 rounded-xl h-12 px-4 font-bold text-center tracking-widest"
                          />
                          <Button
                            type="button"
                            onClick={handleVerifyPhoneCode}
                            className="bg-indigo-600 text-white rounded-xl h-12 px-4 text-xs font-bold"
                          >
                            코드확인
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {signupStep === 2 && (
                  <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-2"
                    >
                      <ArrowRight className="w-3 h-3 rotate-180" /> 이전 인증 단계로
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="password-signup" className="text-sm font-bold text-slate-700 ml-1">비밀번호</Label>
                        <Input
                          id="password-signup"
                          type="password"
                          placeholder="4자리 이상"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-white/50 border-slate-200 rounded-xl h-12 px-4 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="nickname" className="text-sm font-bold text-slate-700 ml-1">닉네임</Label>
                        <Input
                          id="nickname"
                          type="text"
                          placeholder="익명학생"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="bg-white/50 border-slate-200 rounded-xl h-12 px-4 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="department" className="text-sm font-bold text-slate-700 ml-1">소속 학과</Label>
                      <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger className="bg-white/50 border-slate-200 rounded-xl h-12 px-4 w-full font-medium focus:ring-2 focus:ring-indigo-500 text-left">
                          <SelectValue placeholder="학과를 선택해주세요" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] rounded-2xl shadow-xl border-slate-200">
                          {departments.filter((d) => d !== '전체').map((dept) => (
                            <SelectItem key={dept} value={dept} className="font-medium">
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit/Next Button */}
          {(isLogin || isSignup) && (
            <Button
              type="submit"
              disabled={isLoading || (isSignup && signupStep === 1 && (!isEmailVerified || !isPhoneVerified))}
              className={`w-full h-14 mt-4 text-white rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 disabled:opacity-50 ${isSignup && signupStep === 1 ? 'bg-slate-900 hover:bg-black shadow-slate-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  처리 중...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isLogin ? '로그인하기' : (signupStep === 1 ? '다음 단계로' : '가입 완료하기')}
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          )}

          {/* Footer Navigation */}
          <div className="text-center pt-4 border-t border-slate-100">
            {isLogin ? (
              <p className="text-sm text-slate-600 font-semibold">
                아직 회원이 아니신가요?{' '}
                <button
                  type="button"
                  onClick={() => changeMode('signup')}
                  className="text-indigo-600 font-bold hover:underline underline-offset-4 ml-1"
                >
                  새로 가입하기
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-600 font-semibold">
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => changeMode('login')}
                  className="text-indigo-600 font-bold hover:underline underline-offset-4 ml-1"
                >
                  로그인하기
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
