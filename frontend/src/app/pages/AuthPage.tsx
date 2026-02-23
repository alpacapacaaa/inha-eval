import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { departments } from '../data/mockData';
import { userService } from '../api/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
        toast.success('로그인되었습니다');
        navigate('/');
      } else {
        if (!email.endsWith('@inha.ac.kr')) {
          toast.error('인하대 이메일(@inha.ac.kr)을 사용해주세요');
          setIsLoading(false);
          return;
        }
        if (!email || !password || !nickname || !department) {
          toast.error('모든 항목을 입력해주세요');
          setIsLoading(false);
          return;
        }
        
        // Mock signup
        await userService.signup({ email, nickname, department });
        toast.success('회원가입이 완료되었습니다! 로그인해주세요.');
        navigate('/auth?mode=login');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isLogin ? '로그인' : '회원가입'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder={isLogin ? '이메일' : 'example@inha.ac.kr'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nickname">닉네임</Label>
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="닉네임"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">학과</Label>
                  <Select value={department} onValueChange={setDepartment} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="학과를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.filter((d) => d !== '전체').map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                isLogin ? '로그인' : '회원가입'
              )}
            </Button>

            <div className="text-center text-sm">
              {isLogin ? (
                <>
                  <span className="text-gray-600">계정이 없으신가요? </span>
                  <button
                    type="button"
                    onClick={() => navigate('/auth?mode=signup')}
                    className="text-blue-600 hover:underline"
                    disabled={isLoading}
                  >
                    회원가입
                  </button>
                </>
              ) : (
                <>
                  <span className="text-gray-600">이미 계정이 있으신가요? </span>
                  <button
                    type="button"
                    onClick={() => navigate('/auth?mode=login')}
                    className="text-blue-600 hover:underline"
                    disabled={isLoading}
                  >
                    로그인
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
