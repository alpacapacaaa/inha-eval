import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CourseCard } from '../components/CourseCard';
import { CourseCardSkeleton } from '../components/course/CourseSkeleton';
import { courseService, userService } from '../api/api';
import { departments } from '../data/mockData';
import { Course } from '../types/types';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [selectedCategory, setSelectedCategory] = useState<'전체' | '전공' | '교양'>('전체');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedMajorType, setSelectedMajorType] = useState<string>('전체');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState('전체');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 현재 사용자 학과 정보 가져오기
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await userService.getCurrentUser();
        if (user && user.department) {
          setSelectedDepartment(user.department);
        }
      } catch (error) {
        console.error('Failed to fetch user', error);
      }
    };
    fetchUser();
  }, []);

  const majorTypes = ['전공필수', '전공선택', '전공기초'];

  const themes = [
    { id: 'all', label: '전체보기', icon: '✨' },
    { id: 'top-rated', label: '🏆 명강의', description: '평점 4.5 이상' },
    { id: 'easy-credit', label: '🌿 널널한 꿀강', description: '난이도 쉬움' },
    { id: 'most-reviewed', label: '📂 검증된 강의', description: '리뷰 30개 이상' },
    { id: 'growth', label: '📚 성장의 기회', description: '학습량 많음' },
  ];

  const geGroups = {
    '핵심교양': [
      '핵심교양-1.인간, 가치, 공존',
      '핵심교양-1.인간, 가치, 공존(공학윤리와 토론)',
      '핵심교양-2.역사, 사상, 문화',
      '핵심교양-3.문학, 예술, 상징',
      '핵심교양-4.사회, 제도, 세계',
      '핵심교양-5.자연, 생명, 환경',
      '핵심교양-6.수리, 정보, 기술',
    ],
    '일반교양': [
      '일반교양-1.인문 · 예술',
      '일반교양-2. 사회 · 자연',
      '일반교양-3.소통 · 실천',
      '일반교양-4.창의 · 도전',
      '일반교양-5.실용 · 진로',
      '일반교양-6.생활 · 건강',
      '일반교양-7.SW·AI',
    ],
    '기타': ['창의']
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        let results = [];
        if (query.trim()) {
          results = await courseService.searchCourses(query, selectedDepartment);
        } else {
          results = await courseService.getAllCourses();
          if (selectedDepartment !== '전체') {
            results = results.filter(c => c.department === selectedDepartment);
          }
        }

        // 1. 카테고리 필터 (전공/교양)
        if (selectedCategory !== '전체') {
          results = results.filter(c => c.category === selectedCategory);
        }

        // 2. 전공 세부 필터 (Single Select)
        if (selectedMajorType !== '전체' && selectedCategory === '전공') {
          results = results.filter(c => c.type === selectedMajorType);
        }

        // 3. 교양 세부 필터 (Multi Select)
        if (selectedTypes.length > 0 && selectedCategory === '교양') {
          results = results.filter(c => selectedTypes.includes(c.type));
        }

        // 4. 테마 필터 (Only for 'All' category)
        if (selectedCategory === '전체') {
          if (selectedTheme === 'top-rated') {
            results = results.filter(c => c.rating >= 4.3); // Adjusting for mock data spread
          } else if (selectedTheme === 'easy-credit') {
            results = results.filter(c => c.difficulty === 'easy');
          } else if (selectedTheme === 'most-reviewed') {
            results = results.filter(c => c.reviewCount >= 30);
          } else if (selectedTheme === 'growth') {
            results = results.filter(c => c.workload === 'heavy');
          }
        }

        setCourses(results);
      } catch (error) {
        console.error('Failed to search courses', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [query, selectedDepartment, selectedCategory, selectedTypes, selectedMajorType, selectedTheme]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] p-6 space-y-8 sticky top-24 border border-slate-100 shadow-sm">
              <div>
                <h3 className="font-black text-slate-800 mb-5 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                  검색 필터
                </h3>

                {/* 이수 구분 (Major vs General) */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-wider">이수 구분</label>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                      {['전체', '전공', '교양'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat as any);
                            setSelectedTypes([]);
                            setSelectedMajorType('전체');
                            setSelectedTheme('all'); // Reset theme when category changes
                          }}
                          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${selectedCategory === cat
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 전체 탭일 때: 추천 테마 분류 */}
                  {selectedCategory === '전체' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[12px] font-black text-slate-400 uppercase tracking-wider">추천 테마</label>
                      <div className="grid grid-cols-1 gap-2.5">
                        {themes.map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => setSelectedTheme(theme.id)}
                            className={`group flex flex-col items-start px-4 py-3 rounded-2xl border transition-all text-left ${selectedTheme === theme.id
                              ? 'bg-amber-50 border-amber-200 shadow-sm'
                              : 'bg-white border-slate-100 hover:border-slate-300'
                              }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[13.5px] font-bold ${selectedTheme === theme.id ? 'text-amber-800' : 'text-slate-700'
                                }`}>
                                {theme.label}
                              </span>
                              {selectedTheme === theme.id && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                            </div>
                            {theme.description && (
                              <span className={`text-[11px] mt-0.5 font-semibold ${selectedTheme === theme.id ? 'text-amber-600/70' : 'text-slate-400'
                                }`}>
                                {theme.description}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 전공 탭일 때: 전공 분류 */}
                  {selectedCategory === '전공' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <label className="text-[12px] font-black text-slate-400 uppercase tracking-wider">전공 분류</label>
                      <div className="grid grid-cols-1 gap-2">
                        {['전체', ...majorTypes].map(type => (
                          <button
                            key={type}
                            onClick={() => setSelectedMajorType(type)}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${selectedMajorType === type
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                              }`}
                          >
                            {type}
                            {selectedMajorType === type && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 세부 분류 (General: Multi Select Grouped) */}
                  {(selectedCategory === '교양') && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                      {Object.entries(geGroups).map(([groupName, types]) => (
                        <div key={groupName} className="space-y-3">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">{groupName}</label>
                          <div className="grid grid-cols-1 gap-1.5">
                            {types.map(type => {
                              const isRequired = selectedDepartment === '컴퓨터공학과' && (
                                type.startsWith('핵심교양-1') ||
                                type.startsWith('핵심교양-2') ||
                                type.startsWith('핵심교양-4') ||
                                type.startsWith('핵심교양-6') ||
                                type.startsWith('일반교양-7') ||
                                type === '창의'
                              );

                              return (
                                <button
                                  key={type}
                                  onClick={() => toggleType(type)}
                                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left text-[12.5px] font-semibold transition-all ${selectedTypes.includes(type)
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                                    : isRequired
                                      ? 'bg-indigo-50/70 border-indigo-200/80 text-indigo-800 hover:bg-indigo-100/70 hover:border-indigo-300'
                                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate pr-2">
                                    <span className="truncate">
                                      {(() => {
                                        if (type.includes('-')) {
                                          const parts = type.split('-');
                                          const areaPart = parts[1].split('.');
                                          return `${areaPart[0]}영역. ${areaPart[1] || ''}`;
                                        }
                                        return type;
                                      })()}
                                    </span>
                                  </span>
                                  {selectedTypes.includes(type) && (
                                    <div className="shrink-0 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 학과 선택 */}
                  <div className="space-y-3 pt-4 border-t border-slate-50">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-wider">학과</label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger className="rounded-xl border-slate-200 h-11 font-semibold text-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept} className="font-medium">
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <main className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {query ? `검색결과: "${query}"` : '강의 목록 둘러보기'}
                <span className="ml-2 text-indigo-500 font-black">{isLoading ? '...' : courses.length}</span>
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <CourseCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}

                {courses.length === 0 && (
                  <div className="bg-white rounded-lg p-12 text-center">
                    <p className="text-gray-500">검색 결과가 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
