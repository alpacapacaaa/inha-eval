import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import annyongiRunA from '../../assets/annyongi-run-a.png';
import annyongiRunB from '../../assets/annyongi-run-b.png';
import induckiWalkA from '../../assets/inducki-walk-a.png';
import induckiWalkB from '../../assets/inducki-walk-b.png';
import induckiWalkC from '../../assets/inducki-walk-c.png';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { CourseCard } from '../components/CourseCard';
import { CourseCardSkeleton } from '../components/course/CourseSkeleton';
import { courseService, reviewService, userService } from '../api/api';
import { Course, User } from '../types/types';

interface CourseWithReview extends Course {
  latestReviewContent?: string;
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCourses, setRecentCourses] = useState<CourseWithReview[]>([]);
  const [honeyGECourses, setHoneyGECourses] = useState<Course[]>([]);
  const [majorCourses, setMajorCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allCourses, userData] = await Promise.all([
          courseService.getAllCourses(),
          userService.getCurrentUser(),
        ]);
        setUser(userData);

        const recent = allCourses.slice(0, 3);
        setRecentCourses(recent);

        void Promise.all(
          recent.map(async (course) => {
            try {
              const reviews = await reviewService.getReviewsByCourseId(course.id);
              const latestReview = reviews.length > 0 ? reviews[0].content : undefined;
              return { ...course, latestReviewContent: latestReview };
            } catch (reviewError) {
              console.error(`Failed to fetch latest review for course ${course.id}`, reviewError);
              return { ...course };
            }
          }),
        ).then((coursesWithReviews) => {
          setRecentCourses(coursesWithReviews);
        });

        const [honeyResult, majorResult] = await Promise.allSettled([
          courseService.getHoneyGE(),
          courseService.getMajorRecommended(userData?.department || '컴퓨터공학과'),
        ]);

        if (honeyResult.status === 'fulfilled') {
          setHoneyGECourses(honeyResult.value);
        } else {
          console.error('Failed to fetch honey GE courses', honeyResult.reason);
          setHoneyGECourses([]);
        }

        if (majorResult.status === 'fulfilled') {
          setMajorCourses(majorResult.value);
        } else {
          console.error('Failed to fetch major courses', majorResult.reason);
          setMajorCourses([]);
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="page-shell pt-8">
        <section className="relative overflow-hidden rounded-[2.25rem] border border-[rgba(15,23,42,0.08)] px-6 py-12 md:px-10 md:py-16">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,91,172,0.08)_0%,rgba(255,255,255,0.78)_45%,rgba(15,23,42,0.04)_100%)]" />
            <div className="absolute -left-10 top-[8%] h-56 w-56 rounded-full bg-[#dfeefe] blur-3xl" />
            <div className="absolute right-[-3rem] top-[10%] h-64 w-64 rounded-full bg-[#eef3ea] blur-3xl" />
            <div className="absolute left-[8%] bottom-[-6rem] h-48 w-48 rounded-full bg-[rgba(15,23,42,0.06)] blur-3xl" />

            <div className="hero-mascot hero-mascot-right animate-hero-mascot-right hidden md:block">
              <div className="hero-mascot-sprite">
                <div className="hero-mascot-pose hero-mascot-pose-a">
                  <img src={annyongiRunA} alt="" className="hero-mascot-figure hero-mascot-img" aria-hidden="true" />
                </div>
                <div className="hero-mascot-pose hero-mascot-pose-b">
                  <img src={annyongiRunB} alt="" className="hero-mascot-figure hero-mascot-img" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="hero-ground hero-ground-track hidden xl:block" aria-hidden="true">
              <div className="hero-mascot hero-mascot-ground animate-hero-mascot-ground">
                <div className="hero-mascot-sprite hero-mascot-sprite-ground">
                  <div className="hero-mascot-pose hero-mascot-pose-ground-a">
                    <img src={induckiWalkA} alt="" className="hero-mascot-figure hero-mascot-img" aria-hidden="true" />
                  </div>
                  <div className="hero-mascot-pose hero-mascot-pose-ground-b">
                    <img src={induckiWalkB} alt="" className="hero-mascot-figure hero-mascot-img" aria-hidden="true" />
                  </div>
                  <div className="hero-mascot-pose hero-mascot-pose-ground-c">
                    <img src={induckiWalkC} alt="" className="hero-mascot-figure hero-mascot-img" aria-hidden="true" />
                  </div>
                </div>
              </div>
              <span className="hero-ground-dot hero-ground-dot-a" />
              <span className="hero-ground-dot hero-ground-dot-b" />
              <span className="hero-ground-dot hero-ground-dot-c" />
            </div>
          </div>

          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="max-w-3xl">
              <p className="text-[12px] font-black uppercase tracking-[0.28em] text-[#005bac]">INHAPYUNG | ARCHIVE</p>
              <h1 className="mt-5 text-4xl font-black tracking-[-0.07em] text-slate-950 md:text-[4.8rem] md:leading-[0.96]">
                인하평
              </h1>
              <p className="mt-4 max-w-xl text-base font-semibold text-slate-600 md:text-lg">
                강의 탐색부터 강의평 비교, 시간표 담기까지 한 번에.
              </p>
            </div>

            <form onSubmit={handleSearch} className="mt-10 max-w-4xl">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="강의명, 교수님, 학과로 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-[72px] rounded-full border-white/80 bg-white/96 pl-12 pr-5 text-base shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:text-lg"
                  />
                </div>
                <Button type="submit" size="lg" className="h-[72px] rounded-full px-8 text-base">
                  검색
                </Button>
              </div>
            </form>

          </div>
        </section>
      </div>

      <div className="page-shell mt-12 space-y-14">
        <section>
          <SectionHeader title="최근 등록된 강의평가" description="최근에 리뷰가 쌓인 강의입니다." />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? [1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)
              : recentCourses.map((course) => (
                  <CourseCard key={course.id} course={course} showPreview previewText={course.latestReviewContent} />
                ))}
          </div>
        </section>

        <section>
          <SectionHeader title="교양 추천" description="부담과 만족도를 함께 보고 고를 수 있습니다." />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? [1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)
              : honeyGECourses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        </section>

        <section>
          <SectionHeader
            title={`${user?.department || '컴퓨터공학과'} 추천 강의`}
            description="같은 학과 학생들이 많이 찾는 전공 강의입니다."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? [1, 2, 3].map((i) => <CourseCardSkeleton key={i} />)
              : majorCourses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
