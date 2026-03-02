import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { departments } from '../data/mockData';
import { userService } from '../api/api';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, GraduationCap, Building2, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  onLogin?: () => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') || 'login';
  const isLogin = mode === 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) {
          toast.error('이메일과 비밀번호를 입력해주세요');
          setIsLoading(false);
          return;
        }

        await userService.login(email); // Mock login
        if (onLogin) onLogin();
        toast.success('환영합니다!');
        navigate('/');
      } else {
        if (!email.endsWith('@inha.ac.kr')) {
          toast.error('인하대 이메일(@inha.ac.kr)을 사용해주세요');
          setIsLoading(false);
          return;
        }
        if (!email || !password || !nickname || !studentId || !department) {
          toast.error('모든 항목을 입력해주세요');
          setIsLoading(false);
          return;
        }

        // Mock signup
        await userService.signup({ email, nickname, department });
        toast.success('회원가입이 완료되었습니다! 이메일 인증을 진행해주세요.');
        navigate('/auth?mode=login');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-blue-50">

      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 blur-3xl opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-300 mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-300 mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-purple-300 mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-[440px] bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl shadow-indigo-900/5 rounded-3xl p-8 transition-all duration-500 hover:shadow-indigo-900/10 hover:bg-white/80">

        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 mb-2">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl tracking-tight font-extrabold text-gray-900">
            {isLogin ? '다시 만나서 반가워요' : '인하대생 인증하기'}
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            {isLogin ? '서비스를 이용하려면 로그인해주세요' : '학교 이메일로 안전하게 가입하세요'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">이메일</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder={isLogin ? 'example@inha.ac.kr' : 'example@inha.ac.kr'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all rounded-xl h-11"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">비밀번호</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all rounded-xl h-11"
                />
              </div>
            </div>

            {/* Signup Only Fields */}
            {!isLogin && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4 pt-1">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nickname" className="text-sm font-semibold text-gray-700">닉네임</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="nickname"
                        type="text"
                        placeholder="홍길동"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        disabled={isLoading}
                        className="pl-9 bg-white/50 border-gray-200 rounded-xl h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="studentId" className="text-sm font-semibold text-gray-700">학번</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <GraduationCap className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="studentId"
                        type="text"
                        placeholder="12211234"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        disabled={isLoading}
                        className="pl-9 bg-white/50 border-gray-200 rounded-xl h-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-sm font-semibold text-gray-700">소속 학과</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                      <Building2 className="h-4 w-4 text-gray-400" />
                    </div>
                    <Select value={department} onValueChange={setDepartment} disabled={isLoading}>
                      <SelectTrigger className="pl-9 bg-white/50 border-gray-200 rounded-xl h-11 w-full">
                        <SelectValue placeholder="학과를 선택해주세요" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {departments.filter((d) => d !== '전체').map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                처리 중...
              </>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {isLogin ? '로그인하기' : '가입 완료하기'}
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          {/* Toggle Login/Signup */}
          <div className="text-center pt-2">
            {isLogin ? (
              <p className="text-sm text-gray-600 font-medium">
                아직 회원이 아니신가요?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/auth?mode=signup')}
                  className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                  disabled={isLoading}
                >
                  새로 가입하기
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-600 font-medium">
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/auth?mode=login')}
                  className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                  disabled={isLoading}
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
