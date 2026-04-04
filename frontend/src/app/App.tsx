import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { Header } from './components/Header';
import { toast } from 'sonner';
import { userService } from './api/api';
import { Loader2 } from 'lucide-react';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';

const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage })),
);
const SearchPage = lazy(() =>
  import('./pages/SearchPage').then((module) => ({ default: module.SearchPage })),
);
const CourseDetailPage = lazy(() =>
  import('./pages/CourseDetailPage').then((module) => ({ default: module.CourseDetailPage })),
);
const ReviewWritePage = lazy(() =>
  import('./pages/ReviewWritePage').then((module) => ({ default: module.ReviewWritePage })),
);
const ReviewWriteConceptPreviewPage = lazy(() =>
  import('./pages/ReviewWriteConceptPreviewPage').then((module) => ({ default: module.ReviewWriteConceptPreviewPage })),
);
const MyPage = lazy(() =>
  import('./pages/MyPage').then((module) => ({ default: module.MyPage })),
);
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })),
);
const EmailVerifyPage = lazy(() =>
  import('./pages/EmailVerifyPage').then((module) => ({ default: module.EmailVerifyPage })),
);
const TimetablePage = lazy(() =>
  import('./pages/TimetablePage').then((module) => ({ default: module.TimetablePage })),
);
const DesignPreviewPage = lazy(() =>
  import('./pages/DesignPreviewPage').then((module) => ({ default: module.DesignPreviewPage })),
);
const FontPreviewPage = lazy(() =>
  import('./pages/FontPreviewPage').then((module) => ({ default: module.FontPreviewPage })),
);

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[calc(100vh-92px)] items-center justify-center bg-transparent">
      <div className="flex items-center gap-3 rounded-full border border-[#005bac]/10 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-600 shadow-[0_16px_40px_rgba(0,91,172,0.08)] backdrop-blur">
        <Loader2 className="h-5 w-5 animate-spin text-[#1084e8]" />
        페이지를 불러오는 중입니다
      </div>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => userService.hasStoredSession());

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await userService.getCurrentUser();
        setIsLoggedIn(!!user);
      } catch (error) {
        console.error('Failed to check auth:', error);
        toast.error('서버 연결에 실패했습니다. 네트워크 상태를 확인해주세요.');
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await userService.logout();
      toast.success('로그아웃 되었습니다.');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setIsLoggedIn(false);
    }
  };

  const handleAccountDeleted = () => {
    setIsLoggedIn(false);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-transparent text-foreground">
        <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/course/:id" element={<CourseDetailPage />} />
            <Route path="/design-preview" element={<DesignPreviewPage />} />
            <Route path="/font-preview" element={<FontPreviewPage />} />
            <Route
              path="/review/write/:courseId"
              element={
                <RouteErrorBoundary>
                  <ReviewWritePage />
                </RouteErrorBoundary>
              }
            />
            <Route
              path="/review/write/:courseId/concepts"
              element={
                <RouteErrorBoundary>
                  <ReviewWriteConceptPreviewPage />
                </RouteErrorBoundary>
              }
            />
            <Route path="/mypage" element={isLoggedIn ? <MyPage onAccountDeleted={handleAccountDeleted} /> : <Navigate to="/auth?mode=login" />} />
            <Route path="/timetable" element={isLoggedIn ? <TimetablePage /> : <Navigate to="/auth?mode=login" />} />
            <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
            <Route path="/auth/email/verify" element={<EmailVerifyPage />} />
          </Routes>
        </Suspense>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
