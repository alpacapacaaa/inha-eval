import { Link, useNavigate, useLocation } from 'react-router';
import { useState } from 'react';
import { Button } from './ui/button';
import { Search, LayoutGrid } from 'lucide-react';

interface HeaderProps {
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

export function Header({ isLoggedIn = false, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');

  // 메인 페이지(/)에서는 헤더 검색창을 숨깁니다 (메인 중앙 검색창과 중복 방지)
  const isHomePage = location.pathname === '/';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50 backdrop-blur-md bg-white/90">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-8">

          {/* Left Section: Logo + Search Bar */}
          <div className="flex items-center gap-6 flex-1 max-w-2xl">
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-100 shadow-lg group-hover:scale-105 transition-transform duration-300">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-slate-800 tracking-tighter">인하평</span>
            </Link>

            {/* Only show 'Browse Courses' if NOT on the search page */}
            {location.pathname !== '/search' && (
              <Link
                to="/search"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-indigo-600 font-bold text-[14px] transition-all rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>강의 둘러보기</span>
              </Link>
            )}

            {/* Integrated Search Bar (Shown everywhere EXCEPT HomePage) */}
            {!isHomePage && (
              <div className="hidden md:flex items-center gap-4 flex-1">
                {/* Vertical Separator */}
                <div className="w-px h-5 bg-slate-200" />

                {/* Academic Season Badge */}
                <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span className="text-[11px] font-black text-indigo-700 uppercase tracking-tight">수강신청 시즌 (25-1)</span>
                </div>

                {/* Integrated Search Bar */}
                <form onSubmit={handleSearch} className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="강의명, 교수님 성함으로 검색해보세요"
                    className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-200"
                  />
                </form>
              </div>
            )}
          </div>

          {/* Right Section: Auth & MyPage */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link to="/mypage">
                  <Button variant="ghost" className="text-slate-600 font-bold hover:bg-slate-100 rounded-xl h-10 px-4 text-sm">마이페이지</Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={onLogout}
                  className="text-slate-400 font-semibold hover:text-red-500 hover:bg-red-50 rounded-xl h-10 px-4 text-sm"
                >
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth?mode=login">
                  <Button variant="ghost" className="text-slate-600 font-bold hover:bg-slate-100 rounded-xl h-10 px-4 text-sm">로그인</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-xl text-sm shadow-md shadow-indigo-100">회원가입</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
