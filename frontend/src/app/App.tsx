import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { ReviewWritePage } from './pages/ReviewWritePage';
import { MyPage } from './pages/MyPage';
import { AuthPage } from './pages/AuthPage';
import { userService } from './api/api';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await userService.getCurrentUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await userService.logout();
    setIsLoggedIn(false);
  };

  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/course/:id" element={<CourseDetailPage />} />
          <Route path="/review/write/:courseId" element={isLoggedIn ? <ReviewWritePage /> : <Navigate to="/auth?mode=login" />} />
          <Route path="/mypage" element={isLoggedIn ? <MyPage /> : <Navigate to="/auth?mode=login" />} />
          <Route path="/auth" element={<AuthPage onLogin={handleLogin} />} />
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
