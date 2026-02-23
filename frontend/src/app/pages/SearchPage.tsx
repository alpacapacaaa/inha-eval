import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CourseCard } from '../components/CourseCard';
import { courseService } from '../api/api';
import { departments, semesters } from '../data/mockData';
import { Course } from '../types/types';
import { Loader2 } from 'lucide-react';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [selectedDepartment, setSelectedDepartment] = useState('전체');
  const [selectedSemester, setSelectedSemester] = useState('전체');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const results = await courseService.searchCourses(query, selectedDepartment);
        setCourses(results);
      } catch (error) {
        console.error('Failed to search courses', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce or just fetch on effect
    const timeoutId = setTimeout(() => {
      fetchCourses();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedDepartment]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg p-4 space-y-4 sticky top-4">
              <h3 className="font-semibold text-lg">필터</h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">학과</label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">학기</label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  * 학기 필터는 현재 준비중입니다.
                </p>
              </div>
            </div>
          </aside>

          {/* Results */}
          <main className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                검색결과: "{query}" {isLoading ? '...' : courses.length}개
              </h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
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
