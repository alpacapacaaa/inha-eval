import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Star, Coins, Calendar, Loader2, User as UserIcon, Building2,
  ChevronDown, ChevronUp, Pencil, Check, X, Lock, Smartphone,
  Send, MessageSquare, Bell, AlertTriangle, Trash2, ArrowRight,
  PenTool, ShieldCheck, Gift, CreditCard, ChevronRight, Megaphone,
  TrendingUp, TrendingDown, History,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { userService, reviewService } from '../api/api';
import { User, Review, PointHistory, Inquiry, Notice } from '../types/types';
import { departments } from '../data/mockData';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

type PointFilter = 'all' | 'earned' | 'spent';

// ─── 포인트 내역 아이콘 매핑 ─────────────────────────
const getPointIcon = (desc: string): React.ReactNode => {
  if (desc.includes('강의평 작성')) return <PenTool className="w-4 h-4 text-indigo-500" />;
  if (desc.includes('열람권')) return <CreditCard className="w-4 h-4 text-red-500" />;
  if (desc.includes('보너스') || desc.includes('추천')) return <Gift className="w-4 h-4 text-amber-500" />;
  return <Coins className="w-4 h-4 text-slate-400" />;
};

export function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointFilter, setPointFilter] = useState<PointFilter>('all');

  // 내 정보 수정 state
  const [editField, setEditField] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [isPhoneCodeSent, setIsPhoneCodeSent] = useState(false);

  // 문의하기 state
  const [inquiryCategory, setInquiryCategory] = useState('');
  const [inquiryTitle, setInquiryTitle] = useState('');
  const [inquiryContent, setInquiryContent] = useState('');
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  // 공지사항 state
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);
  const [showAllNotices, setShowAllNotices] = useState(false);

  // 회원탈퇴 state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePw, setDeletePw] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedUser, fetchedHistory, fetchedReviews, fetchedNotices, fetchedInquiries] = await Promise.all([
          userService.getCurrentUser(),
          userService.getPointHistory(),
          reviewService.getReviewsByUserId('current-user'),
          userService.getNotices(),
          userService.getMyInquiries(),
        ]);
        setUser(fetchedUser);
        setPointHistory(fetchedHistory);
        setUserReviews(fetchedReviews);
        setNotices(fetchedNotices);
        setInquiries(fetchedInquiries);
      } catch (error) {
        console.error('Failed to fetch user data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePurchasePass = async () => {
    try {
      const updatedUser = await userService.purchasePass();
      setUser(updatedUser);
      toast.success('열람권을 구매했습니다!');
      const updatedHistory = await userService.getPointHistory();
      setPointHistory(updatedHistory);
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error('열람권 구매에 실패했습니다.');
    }
  };

  // ─── 정보 수정 핸들러 ──────────────────────────
  const handleSaveNickname = async () => {
    if (!editNickname.trim()) { toast.error('닉네임을 입력해주세요.'); return; }
    setIsSaving(true);
    try {
      const updated = await userService.updateProfile({ nickname: editNickname });
      setUser(updated);
      setEditField(null);
      toast.success('닉네임이 변경되었습니다.');
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSaving(false); }
  };

  const handleSaveDepartment = async () => {
    if (!editDepartment) { toast.error('학과를 선택해주세요.'); return; }
    setIsSaving(true);
    try {
      const updated = await userService.updateProfile({ department: editDepartment });
      setUser(updated);
      setEditField(null);
      toast.success('학과가 변경되었습니다.');
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { toast.error('모든 항목을 입력해주세요.'); return; }
    if (newPw !== newPwConfirm) { toast.error('새 비밀번호 확인이 일치하지 않습니다.'); return; }
    setIsSaving(true);
    try {
      await userService.changePassword(currentPw, newPw);
      setEditField(null);
      setCurrentPw(''); setNewPw(''); setNewPwConfirm('');
      toast.success('비밀번호가 변경되었습니다.');
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSaving(false); }
  };

  const handleSendPhoneCode = async () => {
    if (newPhone.length < 10) { toast.error('올바른 전화번호를 입력해주세요.'); return; }
    try {
      await userService.sendVerificationPhone(newPhone);
      setIsPhoneCodeSent(true);
      toast.success('인증 코드가 발송되었습니다. (코드: 111111)');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleChangePhone = async () => {
    setIsSaving(true);
    try {
      await userService.changePhone(newPhone, phoneCode);
      setEditField(null);
      setNewPhone(''); setPhoneCode(''); setIsPhoneCodeSent(false);
      toast.success('전화번호가 변경되었습니다.');
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSaving(false); }
  };

  // ─── 문의 핸들러 ──────────────────────────────
  const handleSubmitInquiry = async () => {
    if (!inquiryCategory || !inquiryTitle || !inquiryContent) {
      toast.error('모든 항목을 입력해주세요.'); return;
    }
    setIsSaving(true);
    try {
      const newInq = await userService.submitInquiry({
        category: inquiryCategory, title: inquiryTitle, content: inquiryContent,
      });
      setInquiries(prev => [newInq, ...prev]);
      setShowInquiryForm(false);
      setInquiryCategory(''); setInquiryTitle(''); setInquiryContent('');
      toast.success('문의가 접수되었습니다.');
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSaving(false); }
  };

  // ─── 회원탈퇴 핸들러 ──────────────────────────
  const handleDeleteAccount = async () => {
    if (!deletePw) { toast.error('비밀번호를 입력해주세요.'); return; }
    setIsSaving(true);
    try {
      await userService.deleteAccount(deletePw);
      toast.success('회원 탈퇴가 완료되었습니다.');
      navigate('/');
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSaving(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!user) return null;

  const formatDate = (date: Date) => format(date, 'yyyy.MM.dd', { locale: ko });

  const totalEarned = pointHistory.filter(h => h.points > 0).reduce((s, h) => s + h.points, 0);
  const totalSpent = Math.abs(pointHistory.filter(h => h.points < 0).reduce((s, h) => s + h.points, 0));
  const recentHistory = pointHistory.slice(0, 3);

  const filteredHistory = pointHistory.filter(h => {
    if (pointFilter === 'earned') return h.points > 0;
    if (pointFilter === 'spent') return h.points < 0;
    return true;
  });

  const toggleSection = (section: string) => {
    setActiveSection(prev => prev === section ? null : section);
    setEditField(null);
  };

  return (
    <>
      {/* 회원탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">정말로 탈퇴하시겠습니까?</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                탈퇴 시 <strong className="text-red-600">작성한 강의평, 포인트, 열람권</strong> 등<br />
                모든 데이터가 영구적으로 삭제됩니다.
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold text-gray-700">비밀번호 확인</Label>
                <Input
                  type="password"
                  placeholder="현재 비밀번호를 입력하세요"
                  value={deletePw}
                  onChange={(e) => setDeletePw(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <Button
                onClick={handleDeleteAccount}
                disabled={isSaving || !deletePw}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : '탈퇴하기'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowDeleteModal(false); setDeletePw(''); }}
                className="w-full h-10 text-gray-500 font-semibold"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 포인트 전체 내역 모달 */}
      {showPointModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* 모달 헤더 */}
            <div className="p-6 pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-yellow-500" />
                  포인트 전체 내역
                </h2>
                <button
                  onClick={() => { setShowPointModal(false); setPointFilter('all'); }}
                  className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* 요약 통계 바 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">현재</p>
                  <p className="text-lg font-black text-gray-900">{user.points}<span className="text-xs text-gray-400 ml-0.5">P</span></p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />획득
                  </p>
                  <p className="text-lg font-black text-green-600">+{totalEarned}<span className="text-xs text-green-400 ml-0.5">P</span></p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center justify-center gap-1">
                    <TrendingDown className="w-3 h-3" />사용
                  </p>
                  <p className="text-lg font-black text-red-500">-{totalSpent}<span className="text-xs text-red-300 ml-0.5">P</span></p>
                </div>
              </div>

              {/* 필터 탭 */}
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {([
                  { key: 'all' as PointFilter, label: '전체', count: pointHistory.length },
                  { key: 'earned' as PointFilter, label: '획득', count: pointHistory.filter(h => h.points > 0).length },
                  { key: 'spent' as PointFilter, label: '사용', count: pointHistory.filter(h => h.points < 0).length },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setPointFilter(tab.key)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${pointFilter === tab.key
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                      }`}
                  >
                    {tab.label} <span className="text-xs opacity-60">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 모달 내역 리스트 (스크롤) */}
            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <div className="space-y-1">
                {filteredHistory.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-10">해당 내역이 없습니다.</p>
                )}
                {filteredHistory.map((history) => (
                  <div key={history.id} className="flex items-center justify-between py-3 px-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                        {getPointIcon(history.description)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{history.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(history.date)}</p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm shrink-0 ${history.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {history.points > 0 ? '+' : ''}{history.points}P
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* ─── 프로필 카드 ─── */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                  <UserIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    안녕하세요, {user.nickname}님 👋
                  </h1>
                  <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4" />
                    {user.department}
                    <span className="text-gray-300">|</span>
                    <span className="text-xs text-gray-400">{user.email}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ─── 포인트 & 열람권 요약 ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-2xl border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                        <Coins className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">현재 포인트</p>
                        <p className="text-2xl font-black text-gray-900">{user.points}<span className="text-lg text-gray-400 ml-0.5">P</span></p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">열람권</p>
                        <p className={`text-lg font-bold ${user.hasPass ? 'text-green-600' : 'text-gray-400'}`}>
                          {user.hasPass && user.passExpiryDate
                            ? `~${formatDate(user.passExpiryDate)} 까지`
                            : '미보유'}
                        </p>
                      </div>
                    </div>
                    {!user.hasPass && (
                      <Button
                        size="sm"
                        disabled={user.points < 50}
                        onClick={handlePurchasePass}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs h-9 px-4"
                      >
                        구매 -50P
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─── 📢 공지사항 ─── */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500" />
                  공지사항
                </h2>
                {notices.length > 2 && (
                  <button
                    onClick={() => setShowAllNotices(!showAllNotices)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {showAllNotices ? '접기' : '전체보기'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {(showAllNotices ? notices : notices.slice(0, 2)).map((notice) => (
                  <div
                    key={notice.id}
                    className={`rounded-xl border transition-all cursor-pointer ${expandedNotice === notice.id ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                    onClick={() => setExpandedNotice(prev => prev === notice.id ? null : notice.id)}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {notice.isImportant && (
                          <span className="bg-red-100 text-red-600 text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">중요</span>
                        )}
                        <p className="text-sm font-semibold text-gray-800 truncate">{notice.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-xs text-gray-400">{formatDate(notice.createdAt)}</span>
                        {expandedNotice === notice.id
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </div>
                    </div>
                    {expandedNotice === notice.id && (
                      <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{notice.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── 💰 포인트 내역 (최근 3개 미리보기) ─── */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  포인트 내역
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600 font-bold">+{totalEarned}P</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-red-500 font-bold">-{totalSpent}P</span>
                </div>
              </div>
              <div className="space-y-1">
                {recentHistory.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-6">포인트 내역이 없습니다.</p>
                )}
                {recentHistory.map((history) => (
                  <div key={history.id} className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                        {getPointIcon(history.description)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{history.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(history.date)}</p>
                      </div>
                    </div>
                    <p className={`font-bold text-sm ${history.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {history.points > 0 ? '+' : ''}{history.points}P
                    </p>
                  </div>
                ))}
              </div>
              {pointHistory.length > 3 && (
                <button
                  onClick={() => setShowPointModal(true)}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-xl text-sm font-bold text-indigo-600 transition-all flex items-center justify-center gap-2 group"
                >
                  전체 내역 보기
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
              {pointHistory.length > 0 && pointHistory.length <= 3 && (
                <p className="text-center text-xs text-gray-400 mt-3">모든 내역을 표시하고 있습니다.</p>
              )}
            </div>

            {/* ─── ✏️ 내가 쓴 강의평 ─── */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-indigo-500" />
                내가 쓴 강의평 <span className="text-indigo-600">{userReviews.length}</span>
              </h2>
              <div className="space-y-1">
                {userReviews.map((review) => (
                  <Link key={review.id} to={`/course/${review.courseId}`}>
                    <div className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-xl transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {review.courseName} · <span className="text-gray-500 font-medium">{review.professorName}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{review.semester}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
                {userReviews.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-8">아직 작성한 강의평이 없습니다.</p>
                )}
              </div>
            </div>

            {/* ─── ⚙️ 내 정보 수정 ─── */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <button
                onClick={() => toggleSection('profile')}
                className="w-full flex items-center justify-between"
              >
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-slate-500" />
                  내 정보 수정
                </h2>
                {activeSection === 'profile'
                  ? <ChevronUp className="w-5 h-5 text-gray-400" />
                  : <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </button>

              {activeSection === 'profile' && (
                <div className="mt-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {/* 닉네임 */}
                  <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400 font-bold">닉네임</p>
                        {editField === 'nickname' ? (
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={editNickname}
                              onChange={e => setEditNickname(e.target.value)}
                              className="h-9 rounded-lg text-sm w-40"
                              placeholder="새 닉네임"
                            />
                            <Button size="sm" onClick={handleSaveNickname} disabled={isSaving} className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditField(null)} className="h-9 px-3 rounded-lg">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-gray-800">{user.nickname}</p>
                        )}
                      </div>
                    </div>
                    {editField !== 'nickname' && (
                      <button onClick={() => { setEditField('nickname'); setEditNickname(user.nickname); }} className="text-xs font-bold text-indigo-600">수정</button>
                    )}
                  </div>

                  {/* 학과 */}
                  <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400 font-bold">학과</p>
                        {editField === 'department' ? (
                          <div className="flex gap-2 mt-1">
                            <Select value={editDepartment} onValueChange={setEditDepartment}>
                              <SelectTrigger className="h-9 rounded-lg text-sm w-44"><SelectValue placeholder="학과 선택" /></SelectTrigger>
                              <SelectContent>
                                {departments.filter(d => d !== '전체').map(dept => (
                                  <SelectItem key={dept} value={dept} className="text-sm">{dept}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={handleSaveDepartment} disabled={isSaving} className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditField(null)} className="h-9 px-3 rounded-lg">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-gray-800">{user.department}</p>
                        )}
                      </div>
                    </div>
                    {editField !== 'department' && (
                      <button onClick={() => { setEditField('department'); setEditDepartment(user.department); }} className="text-xs font-bold text-indigo-600">수정</button>
                    )}
                  </div>

                  {/* 전화번호 */}
                  <div className="py-3 px-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400 font-bold">전화번호</p>
                          <p className="text-sm font-semibold text-gray-800">010-****-****</p>
                        </div>
                      </div>
                      {editField !== 'phone' && (
                        <button onClick={() => setEditField('phone')} className="text-xs font-bold text-indigo-600">변경</button>
                      )}
                    </div>
                    {editField === 'phone' && (
                      <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex gap-2">
                          <Input
                            type="tel" placeholder="새 전화번호" value={newPhone}
                            onChange={e => setNewPhone(e.target.value)}
                            className="h-9 rounded-lg text-sm flex-1"
                          />
                          <Button size="sm" onClick={handleSendPhoneCode} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold">
                            {isPhoneCodeSent ? '재발송' : '인증'}
                          </Button>
                        </div>
                        {isPhoneCodeSent && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="인증코드 6자리" value={phoneCode}
                              onChange={e => setPhoneCode(e.target.value)}
                              className="h-9 rounded-lg text-sm flex-1 text-center tracking-widest font-bold"
                            />
                            <Button size="sm" onClick={handleChangePhone} disabled={isSaving} className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700">
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <button onClick={() => { setEditField(null); setNewPhone(''); setPhoneCode(''); setIsPhoneCodeSent(false); }} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
                      </div>
                    )}
                  </div>

                  {/* 비밀번호 */}
                  <div className="py-3 px-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400 font-bold">비밀번호</p>
                          <p className="text-sm font-semibold text-gray-800">••••••••</p>
                        </div>
                      </div>
                      {editField !== 'password' && (
                        <button onClick={() => setEditField('password')} className="text-xs font-bold text-indigo-600">변경</button>
                      )}
                    </div>
                    {editField === 'password' && (
                      <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                        <Input type="password" placeholder="현재 비밀번호" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="h-9 rounded-lg text-sm" />
                        <Input type="password" placeholder="새 비밀번호 (4자리 이상)" value={newPw} onChange={e => setNewPw(e.target.value)} className="h-9 rounded-lg text-sm" />
                        <Input type="password" placeholder="새 비밀번호 확인" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)} className="h-9 rounded-lg text-sm" />
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" onClick={handleChangePassword} disabled={isSaving} className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold">
                            비밀번호 변경
                          </Button>
                          <button onClick={() => { setEditField(null); setCurrentPw(''); setNewPw(''); setNewPwConfirm(''); }} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ─── 📩 관리자 문의하기 ─── */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
              <button
                onClick={() => toggleSection('inquiry')}
                className="w-full flex items-center justify-between"
              >
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-teal-500" />
                  관리자 문의하기
                </h2>
                {activeSection === 'inquiry'
                  ? <ChevronUp className="w-5 h-5 text-gray-400" />
                  : <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </button>

              {activeSection === 'inquiry' && (
                <div className="mt-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {/* 문의 작성 폼 */}
                  {showInquiryForm ? (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">카테고리</Label>
                        <Select value={inquiryCategory} onValueChange={setInquiryCategory}>
                          <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="문의 유형 선택" /></SelectTrigger>
                          <SelectContent>
                            {['버그 신고', '건의사항', '강의평 삭제 요청', '기타'].map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">제목</Label>
                        <Input value={inquiryTitle} onChange={e => setInquiryTitle(e.target.value)} placeholder="문의 제목" className="h-10 rounded-lg" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-500">내용</Label>
                        <textarea
                          value={inquiryContent}
                          onChange={e => setInquiryContent(e.target.value)}
                          placeholder="문의 내용을 입력해주세요"
                          rows={4}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSubmitInquiry} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-10 px-5 font-bold text-sm">
                          <Send className="w-4 h-4 mr-1.5" />
                          문의 접수
                        </Button>
                        <Button variant="ghost" onClick={() => setShowInquiryForm(false)} className="h-10 text-gray-500 text-sm">취소</Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowInquiryForm(true)}
                      variant="outline"
                      className="w-full h-12 rounded-xl border-dashed border-gray-300 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 font-bold"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      새 문의 작성하기
                    </Button>
                  )}

                  {/* 기존 문의 내역 */}
                  {inquiries.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">내 문의 내역</p>
                      {inquiries.map(inq => (
                        <div key={inq.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{inq.category}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${inq.status === '답변완료' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {inq.status}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{formatDate(inq.createdAt)}</span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800">{inq.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{inq.content}</p>
                          {inq.answer && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <p className="text-xs font-bold text-blue-700 mb-1">관리자 답변</p>
                              <p className="text-xs text-blue-800">{inq.answer}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── 🔴 회원탈퇴 ─── */}
            <div className="flex justify-center pt-4 pb-8">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-sm text-gray-400 hover:text-red-500 font-medium transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                회원탈퇴
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
