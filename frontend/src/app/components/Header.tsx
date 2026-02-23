import { Link } from 'react-router';
import { Button } from './ui/button';
import { Search } from 'lucide-react';

interface HeaderProps {
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export function Header({ isLoggedIn = false, onLogout }: HeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">인하평</span>
          </Link>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link to="/mypage">
                  <Button variant="ghost">마이페이지</Button>
                </Link>
                <Button variant="ghost" onClick={onLogout}>
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth?mode=login">
                  <Button variant="ghost">로그인</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button>회원가입</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
