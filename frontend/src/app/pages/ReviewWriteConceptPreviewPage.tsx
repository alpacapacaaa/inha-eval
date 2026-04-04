import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Star } from 'lucide-react';
import { courseService } from '../api/api';
import { Course } from '../types/types';

type ConceptId = 'archive' | 'ledger' | 'studio';

type Concept = {
  id: ConceptId;
  label: string;
  title: string;
  note: string;
  mood: string;
  accent: string;
  soft: string;
  border: string;
  glow: string;
};

const concepts: Concept[] = [
  {
    id: 'archive',
    label: '시안 A',
    title: 'Archive Rail',
    note: '아카이브 레일과 색인 번호를 전면에 둔 구조',
    mood: '인하평의 Archive 톤을 가장 직접적으로 확장한 안',
    accent: '#005bac',
    soft: '#edf4ff',
    border: '#d8e6fa',
    glow: '0 22px 50px rgba(0, 91, 172, 0.12)',
  },
  {
    id: 'ledger',
    label: '시안 B',
    title: 'Campus Ledger',
    note: '수강 기록부처럼 차분하고 밀도 있게 쓰는 구조',
    mood: '실서비스에 가장 바로 붙이기 쉬운 안',
    accent: '#234e8a',
    soft: '#f2f6fb',
    border: '#d8e0ea',
    glow: '0 22px 50px rgba(35, 78, 138, 0.1)',
  },
  {
    id: 'studio',
    label: '시안 C',
    title: 'Studio Board',
    note: '질문 스테이지를 크게 밀어 올린 몰입형 구조',
    mood: '가장 과감하고 인상적인 안',
    accent: '#0b6a8f',
    soft: '#ecf7fb',
    border: '#d4e8f0',
    glow: '0 24px 56px rgba(11, 106, 143, 0.12)',
  },
];

const sampleQuestion = '수업 자료만으로도 시험 대비가 충분하다.';
const sampleAnswers = [
  '시험 난이도: 조금 아니다',
  '강의력: 그렇다',
  '학점 비율: 보통이다',
  '과제 유형: 단순 과제 여러 번',
];
const likertLabels = ['1', '2', '3', '4', '5', '6', '7'];

function usePreviewCourse(courseId?: string) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!courseId) {
        setLoading(false);
        return;
      }

      try {
        const next = await courseService.getCourseById(courseId);
        if (!cancelled) {
          setCourse(next);
        }
      } catch (error) {
        console.error('Failed to load review concept preview course', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return { course, loading };
}

function MetaStrip({ course, accent }: { course: Course; accent: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
      <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1.5 text-xs font-black text-slate-700">
        {course.professor}
      </span>
      <span>{course.name}</span>
      <span className="text-slate-300">|</span>
      <span style={{ color: accent }}>{course.category}</span>
      <span
        className="rounded-full px-2.5 py-1 text-[11px] font-black"
        style={{ backgroundColor: `${accent}14`, color: accent }}
      >
        {course.type}
      </span>
    </div>
  );
}

function ChoiceRow({ accent, filled = 3 }: { accent: string; filled?: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-black" style={{ color: accent }}>
        그렇다
      </span>
      <div className="grid flex-1 grid-cols-7 gap-2 px-2">
        {likertLabels.map((label, index) => {
          const active = index + 1 === filled;
          const left = index < 3;
          const right = index > 3;

          return (
            <button
              key={label}
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] text-sm font-black transition-transform hover:scale-[1.03]"
              style={{
                borderColor: active ? accent : left ? '#33a06f' : right ? '#9461b5' : '#cbd5e1',
                color: active ? '#fff' : left ? '#33a06f' : right ? '#9461b5' : '#94a3b8',
                backgroundColor: active ? accent : '#fff',
                boxShadow: active ? `0 12px 26px ${accent}2b` : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <span className="text-sm font-black text-[#9461b5]">그렇지 않다</span>
    </div>
  );
}

function ArchiveRailPreview({ course, concept }: { course: Course; concept: Concept }) {
  return (
    <section
      className="overflow-hidden rounded-[2rem] border bg-white"
      style={{ borderColor: concept.border, boxShadow: concept.glow }}
    >
      <div
        className="border-b px-6 py-5"
        style={{
          borderColor: concept.border,
          background: `linear-gradient(135deg, ${concept.soft} 0%, #ffffff 100%)`,
        }}
      >
        <MetaStrip course={course} accent={concept.accent} />
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: concept.accent }}>
              Review archive
            </p>
            <h1 className="mt-2 text-[2.6rem] font-black tracking-[-0.07em] text-slate-950">
              질문 하나가 다음 장을 넘깁니다.
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['진행률', '42%'],
              ['평점', '4.0'],
              ['학기', '2026-1'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.2rem] border bg-white px-4 py-3"
                style={{ borderColor: concept.border }}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-[1.5rem] border bg-[#fbfdff] p-4" style={{ borderColor: concept.border }}>
          <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: concept.accent }}>
            작성 흐름
          </p>
          <div className="mt-4 space-y-2">
            {sampleAnswers.map((item, index) => (
              <button
                key={item}
                type="button"
                className="w-full rounded-[1rem] border bg-white px-3 py-3 text-left"
                style={{ borderColor: index === 1 ? concept.border : '#edf2f7' }}
              >
                <p className="text-xs font-black text-slate-400">0{index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{item}</p>
              </button>
            ))}
          </div>
        </aside>

        <div
          className="rounded-[1.7rem] border bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5"
          style={{ borderColor: concept.border }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-[1rem] text-lg font-black text-white"
                style={{ backgroundColor: concept.accent }}
              >
                02
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">시험 난이도</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">{sampleQuestion}</h2>
              </div>
            </div>
            <span
              className="rounded-full px-3 py-1.5 text-xs font-black"
              style={{ backgroundColor: concept.soft, color: concept.accent }}
            >
              2 / 4
            </span>
          </div>

          <div className="mt-8 rounded-[1.5rem] border bg-white px-5 py-6" style={{ borderColor: concept.border }}>
            <ChoiceRow accent={concept.accent} filled={3} />
          </div>

          <div
            className="mt-5 flex items-center justify-between rounded-[1.2rem] border bg-white px-4 py-3"
            style={{ borderColor: concept.border }}
          >
            <span className="text-sm font-semibold text-slate-500">다음 질문</span>
            <span className="text-sm font-black text-slate-950">
              시험 시간 내에 문제를 풀기에는 시간이 부족한 편이다.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CampusLedgerPreview({ course, concept }: { course: Course; concept: Concept }) {
  return (
    <section
      className="overflow-hidden rounded-[2rem] border bg-white"
      style={{ borderColor: concept.border, boxShadow: concept.glow }}
    >
      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
        <aside
          className="border-r p-6"
          style={{
            borderColor: concept.border,
            background: `linear-gradient(180deg, ${concept.soft} 0%, #ffffff 100%)`,
          }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: concept.accent }}>
            Inhapyung ledger
          </p>
          <h1 className="mt-3 text-[2.3rem] font-black tracking-[-0.06em] text-slate-950">수강 기록부</h1>
          <div className="mt-5 space-y-3">
            {[
              ['강의', course.name],
              ['교수', course.professor],
              ['분류', `${course.category} · ${course.type}`],
              ['학기', '2026-1학기'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1rem] border bg-white px-4 py-3"
                style={{ borderColor: concept.border }}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.2rem] border bg-white p-4" style={{ borderColor: concept.border }}>
            <p className="text-xs font-black text-slate-500">완료 항목</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['시험 난이도', '강의력', '학점 비율', '과제량'].map((item) => (
                <span
                  key={item}
                  className="rounded-full px-3 py-1.5 text-[11px] font-black"
                  style={{ backgroundColor: concept.soft, color: concept.accent }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <div className="p-6">
          <MetaStrip course={course} accent={concept.accent} />
          <div className="mt-6 rounded-[1.6rem] border bg-[#f9fbfd] p-5" style={{ borderColor: concept.border }}>
            <div className="flex items-center justify-between gap-4 border-b pb-4" style={{ borderColor: concept.border }}>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: concept.accent }}>
                  현재 질문
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">{sampleQuestion}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-400">진행도</p>
                <p className="mt-1 text-3xl font-black text-slate-950">42%</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_190px]">
              <div className="rounded-[1.4rem] border bg-white px-5 py-6" style={{ borderColor: concept.border }}>
                <ChoiceRow accent={concept.accent} filled={2} />
              </div>
              <div className="rounded-[1.4rem] border bg-white p-4" style={{ borderColor: concept.border }}>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">작성 상태</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs font-black text-slate-400">별점</p>
                    <div className="mt-2 flex gap-1 text-amber-400">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400">다음 섹션</p>
                    <p className="mt-1 text-sm font-black text-slate-900">시험 방식</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StudioBoardPreview({ course, concept }: { course: Course; concept: Concept }) {
  return (
    <section
      className="overflow-hidden rounded-[2rem] border bg-[linear-gradient(135deg,#f7fbfd_0%,#ffffff_52%,#f4f8fc_100%)]"
      style={{ borderColor: concept.border, boxShadow: concept.glow }}
    >
      <div className="border-b px-6 py-5" style={{ borderColor: concept.border }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MetaStrip course={course} accent={concept.accent} />
          <div className="flex items-center gap-2">
            {['42% 진행', '4.0 평점', '2026-1'].map((item) => (
              <span
                key={item}
                className="rounded-full border bg-white px-3 py-1.5 text-xs font-black text-slate-700"
                style={{ borderColor: concept.border }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.8rem] border bg-white px-6 py-6" style={{ borderColor: concept.border }}>
          <p className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: concept.accent }}>
            Question stage
          </p>
          <h1 className="mt-3 text-[2.8rem] font-black tracking-[-0.07em] text-slate-950">{sampleQuestion}</h1>
          <div className="mt-8 rounded-[1.6rem] border p-5" style={{ borderColor: concept.border, background: concept.soft }}>
            <div className="grid grid-cols-7 gap-3">
              {likertLabels.map((label, index) => {
                const active = index === 4;

                return (
                  <button
                    key={label}
                    type="button"
                    className="flex h-14 items-center justify-center rounded-[1.1rem] border text-base font-black"
                    style={{
                      borderColor: active ? concept.accent : concept.border,
                      backgroundColor: active ? concept.accent : '#fff',
                      color: active ? '#fff' : '#0f172a',
                      boxShadow: active ? `0 14px 30px ${concept.accent}2c` : 'none',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border bg-white p-5" style={{ borderColor: concept.border }}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: concept.accent }}>
              현재 묶음
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {['시험 난이도', '강의력', '학점 비율', '과제량', '선수지식', '전공 심화도'].map((item, index) => (
                <div
                  key={item}
                  className="rounded-[1.05rem] border px-4 py-3"
                  style={{
                    borderColor: index === 0 ? concept.accent : concept.border,
                    backgroundColor: index === 0 ? concept.soft : '#fff',
                  }}
                >
                  <p className="text-sm font-black text-slate-900">{item}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{index === 0 ? '진행 중' : '대기'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border bg-white p-5" style={{ borderColor: concept.border }}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: concept.accent }}>
              작성 메모
            </p>
            <div className="mt-4 space-y-3">
              {sampleAnswers.map((item) => (
                <div
                  key={item}
                  className="rounded-[1rem] border bg-[#fbfdff] px-4 py-3"
                  style={{ borderColor: concept.border }}
                >
                  <p className="text-sm font-semibold text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewCanvas({ concept, course }: { concept: Concept; course: Course }) {
  if (concept.id === 'archive') {
    return <ArchiveRailPreview concept={concept} course={course} />;
  }

  if (concept.id === 'ledger') {
    return <CampusLedgerPreview concept={concept} course={course} />;
  }

  return <StudioBoardPreview concept={concept} course={course} />;
}

export function ReviewWriteConceptPreviewPage() {
  const { courseId } = useParams();
  const [selected, setSelected] = useState<ConceptId>('archive');
  const { course, loading } = usePreviewCourse(courseId);

  const fallbackCourse = useMemo<Course>(
    () => ({
      id: 'preview',
      name: '운영체제',
      professor: '이어진',
      department: '컴퓨터공학과',
      semester: '2026-1학기',
      credits: 3,
      section: '003',
      rating: 4,
      reviewCount: 12,
      difficulty: 'medium',
      workload: 'medium',
      attendance: 'medium',
      grading: 'medium',
      category: '전공',
      type: '전공필수',
      year: 2,
    }),
    [],
  );

  const activeCourse = course ?? fallbackCourse;
  const activeConcept = concepts.find((item) => item.id === selected) ?? concepts[0];

  if (loading && !course) {
    return (
      <div className="page-shell py-8">
        <div className="page-panel p-8 text-sm font-semibold text-slate-500">불러오는 중</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="page-shell">
        <div className="space-y-6">
          <section className="rounded-[2rem] border bg-white px-6 py-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#005bac]">
                  INHAPYUNG REVIEW WRITE
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-slate-950 md:text-[4.3rem]">
                  강의평 작성 시안 3종
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  인하평의 헤더, 표면감, 블루 포인트, 아카이브 정체성을 기준으로 다시 잡은 비교안입니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={courseId ? `/review/write/${courseId}` : '/'}
                  className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-4 py-2 text-sm font-black text-slate-700"
                >
                  기존 작성 화면
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[320px_1fr]">
            <aside className="rounded-[2rem] border bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="space-y-3">
                {concepts.map((concept) => {
                  const isActive = concept.id === selected;

                  return (
                    <button
                      key={concept.id}
                      type="button"
                      onClick={() => setSelected(concept.id)}
                      className="w-full rounded-[1.35rem] border px-4 py-4 text-left transition-all"
                      style={{
                        borderColor: isActive ? concept.accent : '#e2e8f0',
                        backgroundColor: isActive ? concept.soft : '#ffffff',
                        boxShadow: isActive ? concept.glow : 'none',
                      }}
                    >
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.22em]"
                        style={{ color: isActive ? concept.accent : '#94a3b8' }}
                      >
                        {concept.label}
                      </p>
                      <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">{concept.title}</h2>
                      <p className="mt-2 text-sm font-semibold text-slate-700">{concept.note}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{concept.mood}</p>
                    </button>
                  );
                })}
              </div>
            </aside>

            <PreviewCanvas concept={activeConcept} course={activeCourse} />
          </section>
        </div>
      </div>
    </div>
  );
}
