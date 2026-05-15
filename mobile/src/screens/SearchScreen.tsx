import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoursePosterCard } from '../components/CoursePosterCard';
import { Chip as UiChip, PressableScale, SearchField, StatePanel } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { getAllCourses } from '../lib/api/courses';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course } from '../types/models';
import { AppRoute } from '../types/navigation';

interface Props {
  navigation: AppNavigation;
  route: Extract<AppRoute, { name: 'Search' }>;
}

type CategoryFilter = 'all' | 'general' | 'myMajor' | 'otherMajor';
type SortOption = 'rating' | 'reviews' | 'name' | 'credits';
type PanelType = 'all' | 'major' | 'general' | null;

const categoryTabs: Array<{ key: CategoryFilter; label: string; tone: 'dark' | 'green' | 'red' | 'blue' }> = [
  { key: 'all', label: '전체', tone: 'dark' },
  { key: 'general', label: '교양', tone: 'green' },
  { key: 'myMajor', label: '자기전공', tone: 'red' },
  { key: 'otherMajor', label: '타과전공', tone: 'blue' },
];

const sortOptions: Array<{ key: SortOption; label: string }> = [
  { key: 'rating', label: '평점 높은순' },
  { key: 'reviews', label: '리뷰 많은순' },
  { key: 'name', label: '이름순' },
  { key: 'credits', label: '학점 높은순' },
];

const creditOptions = [1, 2, 3, 4] as const;
const COURSE_PAGE_SIZE = 10;

const coreGeneralAreaOptions = [
  '핵심교양',
  '핵심교양-1.인간, 가치, 공존',
  '핵심교양-1.인간, 가치, 공존(공학윤리와 토론)',
  '핵심교양-2.역사, 사상, 문화',
  '핵심교양-3.문학, 예술, 상징',
  '핵심교양-4.사회, 제도, 세계',
  '핵심교양-5.자연, 생명, 환경',
  '핵심교양-6.수리, 정보, 기술',
] as const;

const normalGeneralAreaOptions = [
  '일반교양',
  '일반교양-1.인문 · 예술',
  '일반교양-2. 사회 · 자연',
  '일반교양-3.소통 · 실천',
  '일반교양-4.창의 · 도전',
  '일반교양-5.실용 · 진로',
  '일반교양-6.생활 · 건강',
  '일반교양-7.SW·AI',
] as const;

export function SearchScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState(route.initialQuery ?? '');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [majorCredit, setMajorCredit] = useState<number | 'all'>('all');
  const [majorType, setMajorType] = useState<'all' | 'required' | 'elective'>('all');
  const [generalArea, setGeneralArea] = useState('all');
  const [generalCredit, setGeneralCredit] = useState<number | 'all'>('all');
  const [generalPf, setGeneralPf] = useState<'all' | 'pf' | 'grade'>('all');
  const [visibleCourseCount, setVisibleCourseCount] = useState(COURSE_PAGE_SIZE);

  const loadCourses = async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await getAllCourses();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setCourses(data);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : '강의 탐색 결과를 불러오지 못했습니다.');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    setQuery(route.initialQuery ?? '');
    loadCourses();
  }, [route.initialQuery]);

  useEffect(() => {
    navigation.setTabBarSuppressed(Boolean(activePanel));

    return () => navigation.setTabBarSuppressed(false);
  }, [activePanel, navigation]);

  const trimmedQuery = query.trim();

  const filteredCourses = useMemo(() => {
    const lowerQuery = trimmedQuery.toLowerCase();

    const filtered = courses.filter((course) => {
      if (trimmedQuery) {
        const matchesKeyword =
          course.name.toLowerCase().includes(lowerQuery) ||
          course.professor.toLowerCase().includes(lowerQuery) ||
          course.department.toLowerCase().includes(lowerQuery);
        if (!matchesKeyword) return false;
      }

      const scope = getCourseScope(course, user?.department);
      if (category !== 'all' && scope !== category) {
        return false;
      }

      if (scope === 'general') {
        if (generalArea !== 'all' && !matchesGeneralArea(course, generalArea)) {
          return false;
        }
        if (generalCredit !== 'all' && course.credits !== generalCredit) {
          return false;
        }
        if (generalPf !== 'all' && isPfCourse(course) !== (generalPf === 'pf')) {
          return false;
        }
        return true;
      }

      if (majorCredit !== 'all' && course.credits !== majorCredit) {
        return false;
      }
      if (majorType !== 'all' && getMajorType(course) !== majorType) {
        return false;
      }
      return true;
    });

    return sortCourses(dedupeCoursesByNameAndProfessor(filtered), sortBy);
  }, [
    category,
    courses,
    generalArea,
    generalCredit,
    generalPf,
    majorCredit,
    majorType,
    sortBy,
    trimmedQuery,
    user?.department,
  ]);

  useEffect(() => {
    setVisibleCourseCount(COURSE_PAGE_SIZE);
  }, [filteredCourses]);

  const visibleCourses = useMemo(
    () => filteredCourses.slice(0, visibleCourseCount),
    [filteredCourses, visibleCourseCount],
  );

  const handleLoadMore = () => {
    if (isLoading || errorMessage || visibleCourseCount >= filteredCourses.length) {
      return;
    }

    setVisibleCourseCount((current) => Math.min(current + COURSE_PAGE_SIZE, filteredCourses.length));
  };

  const handleOpenSort = () => setIsSortOpen(true);

  const activeFilters = useMemo(() => {
    const items: { label: string; onRemove: () => void }[] = [];
    const isMajorScope = category === 'all' || category === 'myMajor' || category === 'otherMajor';
    const isGeneralScope = category === 'all' || category === 'general';

    if (isMajorScope) {
      if (majorCredit !== 'all') {
        items.push({ label: `전공 ${majorCredit}학점`, onRemove: () => setMajorCredit('all') });
      }
      if (majorType !== 'all') {
        items.push({ label: majorType === 'required' ? '전필' : '전선', onRemove: () => setMajorType('all') });
      }
    }
    if (isGeneralScope) {
      if (generalArea !== 'all') {
        items.push({ label: getCompactGeneralAreaLabel(generalArea), onRemove: () => setGeneralArea('all') });
      }
      if (generalCredit !== 'all') {
        items.push({ label: `교양 ${generalCredit}학점`, onRemove: () => setGeneralCredit('all') });
      }
      if (generalPf !== 'all') {
        items.push({ label: generalPf === 'pf' ? 'P/F' : '등급제', onRemove: () => setGeneralPf('all') });
      }
    }
    return items;
  }, [category, generalArea, generalCredit, generalPf, majorCredit, majorType]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <FlatList
        data={isLoading || errorMessage ? [] : visibleCourses}
        keyExtractor={(item) => `course-${item.id}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.related }]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.exploreHeader}>
              <Text style={styles.exploreTitle}>강의 랭킹</Text>
              <Text style={styles.exploreMeta}>전공과 교양을 나눠서 빠르게 찾아보세요.</Text>
            </View>

            <SearchField
              placeholder="강의명, 교수명, 학과로 검색"
              value={query}
              onChangeText={setQuery}
              rightAccessory={<Ionicons name="filter-outline" size={18} color="#111318" />}
              onRightAccessoryPress={() => setActivePanel(getPanelForCategory(category))}
            />

            <View style={styles.categorySegment}>
              {categoryTabs.map((tab) => {
                const active = category === tab.key;
                return (
                  <PressableScale
                    key={tab.key}
                    style={[styles.categorySegmentButton, active ? styles.categorySegmentButtonActive : null]}
                    onPress={() => setCategory(tab.key)}
                  >
                    <Text style={[styles.categorySegmentText, active ? styles.categorySegmentTextActive : null]}>
                      {tab.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                {trimmedQuery ? `"${trimmedQuery}" 검색 결과` : '검색 결과'} {filteredCourses.length.toLocaleString()}개
              </Text>
              <PressableScale style={styles.sortButton} onPress={handleOpenSort}>
                <Text style={styles.summaryHint}>{getSortLabel(sortBy)}</Text>
                <View style={styles.sortChevron} />
              </PressableScale>
            </View>

            {activeFilters.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activeFilterRail}
              >
                {activeFilters.map((item) => (
                  <PressableScale key={item.label} style={styles.activeFilterChip} onPress={item.onRemove}>
                    <Text style={styles.activeFilterChipText}>{item.label}</Text>
                    <Text style={styles.activeFilterChipX}>✕</Text>
                  </PressableScale>
                ))}
              </ScrollView>
            ) : null}

            {isLoading ? <SearchSkeleton /> : null}
            {!isLoading && errorMessage ? <StatePanel label={errorMessage} error /> : null}
            {!isLoading && !errorMessage && filteredCourses.length === 0 ? (
              <StatePanel label="조건에 맞는 강의가 없어요. 필터를 조금 느슨하게 바꿔볼까요?" />
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.galleryRow}>
            <CoursePosterCard
              course={item}
              variant="medium"
              index={index + 4}
              userDepartment={user?.department}
              onPress={() => navigation.navigate({ name: 'CourseCollection', courseId: item.id })}
            />
          </View>
        )}
        ListFooterComponent={
          !isLoading && !errorMessage && visibleCourseCount < filteredCourses.length ? (
            <View style={styles.loadMoreHint}>
              <Text style={styles.loadMoreHintText}>아래로 더 내리면 더 많은 강의를 보여드릴게요</Text>
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.55}
        onScroll={(event) => navigation.onTabScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={7}
      />

      {activePanel ? (
        <FilterSheet
          activePanel={activePanel}
          generalArea={generalArea}
          generalCredit={generalCredit}
          generalPf={generalPf}
          majorCredit={majorCredit}
          majorType={majorType}
          resultCount={filteredCourses.length}
          onClose={() => setActivePanel(null)}
          onGeneralAreaChange={setGeneralArea}
          onGeneralCreditChange={setGeneralCredit}
          onGeneralPfChange={setGeneralPf}
          onMajorCreditChange={setMajorCredit}
          onMajorTypeChange={setMajorType}
        />
      ) : null}

      <SortSheet
        visible={isSortOpen}
        sortBy={sortBy}
        onClose={() => setIsSortOpen(false)}
        onSortChange={(next) => { setSortBy(next); setIsSortOpen(false); }}
      />
    </SafeAreaView>
  );
}

function SortSheet({
  visible,
  sortBy,
  onClose,
  onSortChange,
}: {
  visible: boolean;
  sortBy: SortOption;
  onClose: () => void;
  onSortChange: (sort: SortOption) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sortOverlay}>
        <Pressable style={styles.sortScrim} onPress={onClose} />

        <View style={[styles.sortCard, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.sortHandle} />
          <View style={styles.sortCardHeader}>
            <Text style={styles.sortCardTitle}>정렬 방식</Text>
          </View>
          {sortOptions.map((option, index) => {
            const isActive = sortBy === option.key;
            return (
              <View key={option.key}>
                {index > 0 ? <View style={styles.sortDivider} /> : null}
                <PressableScale style={styles.sortRow} onPress={() => onSortChange(option.key)}>
                  <Text style={[styles.sortRowText, isActive && styles.sortRowTextActive]}>
                    {option.label}
                  </Text>
                </PressableScale>
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function FilterSheet({
  activePanel,
  generalArea,
  generalCredit,
  generalPf,
  majorCredit,
  majorType,
  resultCount,
  onClose,
  onGeneralAreaChange,
  onGeneralCreditChange,
  onGeneralPfChange,
  onMajorCreditChange,
  onMajorTypeChange,
}: {
  activePanel: Exclude<PanelType, null>;
  generalArea: string;
  generalCredit: number | 'all';
  generalPf: 'all' | 'pf' | 'grade';
  majorCredit: number | 'all';
  majorType: 'all' | 'required' | 'elective';
  resultCount: number;
  onClose: () => void;
  onGeneralAreaChange: (value: string) => void;
  onGeneralCreditChange: (value: number | 'all') => void;
  onGeneralPfChange: (value: 'all' | 'pf' | 'grade') => void;
  onMajorCreditChange: (value: number | 'all') => void;
  onMajorTypeChange: (value: 'all' | 'required' | 'elective') => void;
}) {
  const showMajorFilters = activePanel === 'all' || activePanel === 'major';
  const showGeneralFilters = activePanel === 'all' || activePanel === 'general';

  const selectedSummary =
    activePanel === 'all'
      ? getAllSelectionSummary(majorCredit, majorType, generalArea, generalCredit, generalPf)
      : activePanel === 'general'
        ? getGeneralSelectionSummary(generalArea, generalCredit, generalPf)
        : getMajorSelectionSummary(majorCredit, majorType);

  const resetFilters = () => {
    if (showGeneralFilters) {
      onGeneralAreaChange('all');
      onGeneralCreditChange('all');
      onGeneralPfChange('all');
    }

    if (showMajorFilters) {
      onMajorCreditChange('all');
      onMajorTypeChange('all');
    }
  };

  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetScrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{getPanelTitle(activePanel)}</Text>
          <PressableScale style={styles.sheetCloseButton} onPress={onClose}>
            <Text style={styles.sheetCloseText}>×</Text>
          </PressableScale>
        </View>

        <>
          <>
            <SelectedFilterBar summary={selectedSummary} onReset={resetFilters} />
            <FilterBodyScroll>
              {showMajorFilters ? (
                <>
                  <FilterGroupTitle>전공 학점</FilterGroupTitle>
                  <FilterGrid>
                    <FilterCheckItem label="전체 학점" active={majorCredit === 'all'} onPress={() => onMajorCreditChange('all')} />
                    {creditOptions.map((credit) => (
                      <FilterCheckItem
                        key={`major-credit-${credit}`}
                        label={`${credit}학점`}
                        active={majorCredit === credit}
                        onPress={() => onMajorCreditChange(credit)}
                      />
                    ))}
                  </FilterGrid>
                  <FilterDivider />
                  <FilterGroupTitle>이수 구분</FilterGroupTitle>
                  <FilterGrid>
                    <FilterCheckItem label="전필·전선" active={majorType === 'all'} onPress={() => onMajorTypeChange('all')} />
                    <FilterCheckItem label="전필" active={majorType === 'required'} onPress={() => onMajorTypeChange('required')} />
                    <FilterCheckItem label="전선" active={majorType === 'elective'} onPress={() => onMajorTypeChange('elective')} />
                  </FilterGrid>
                </>
              ) : null}

              {showMajorFilters && showGeneralFilters ? <FilterDivider /> : null}

              {showGeneralFilters ? (
                <>
                  <FilterGroupTitle>교양 전체</FilterGroupTitle>
                  <FilterGrid>
                    <FilterCheckItem label="전체 영역" active={generalArea === 'all'} onPress={() => onGeneralAreaChange('all')} />
                  </FilterGrid>
                  <FilterDivider />
                  <FilterGroupTitle>핵심교양</FilterGroupTitle>
                  <FilterGrid>
                    {coreGeneralAreaOptions.map((area) => (
                      <FilterCheckItem
                        key={`area-${area}`}
                        label={area}
                        multiline
                        active={generalArea === area}
                        onPress={() => onGeneralAreaChange(area)}
                      />
                    ))}
                  </FilterGrid>
                  <FilterDivider />
                  <FilterGroupTitle>일반교양</FilterGroupTitle>
                  <FilterGrid>
                    {normalGeneralAreaOptions.map((area) => (
                      <FilterCheckItem
                        key={`area-${area}`}
                        label={area}
                        multiline
                        active={generalArea === area}
                        onPress={() => onGeneralAreaChange(area)}
                      />
                    ))}
                  </FilterGrid>
                  <FilterDivider />
                  <FilterGroupTitle>교양 학점</FilterGroupTitle>
                  <FilterGrid>
                    <FilterCheckItem label="전체 학점" active={generalCredit === 'all'} onPress={() => onGeneralCreditChange('all')} />
                    {creditOptions.map((credit) => (
                      <FilterCheckItem
                        key={`general-credit-${credit}`}
                        label={`${credit}학점`}
                        active={generalCredit === credit}
                        onPress={() => onGeneralCreditChange(credit)}
                      />
                    ))}
                  </FilterGrid>
                  <FilterDivider />
                  <FilterGroupTitle>성적 방식</FilterGroupTitle>
                  <FilterGrid>
                    <FilterCheckItem label="P/F 포함" active={generalPf === 'all'} onPress={() => onGeneralPfChange('all')} />
                    <FilterCheckItem label="P/F" active={generalPf === 'pf'} onPress={() => onGeneralPfChange('pf')} />
                    <FilterCheckItem label="등급제" active={generalPf === 'grade'} onPress={() => onGeneralPfChange('grade')} />
                  </FilterGrid>
                </>
              ) : null}
            </FilterBodyScroll>
          </>
        </>

        <View style={styles.sheetFooter}>
          <PressableScale style={styles.sheetApplyButton} onPress={onClose}>
            <Text style={styles.sheetApplyButtonText}>{resultCount.toLocaleString()}개 강의 보기</Text>
          </PressableScale>
          <PressableScale style={styles.sheetResetLine} onPress={resetFilters}>
            <Text style={styles.sheetResetLineText}>선택 초기화하고 전체 강의 보기</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

function SelectedFilterBar({ summary, onReset }: { summary: string; onReset: () => void }) {
  return (
    <View style={styles.selectedFilterBar}>
      <Text style={styles.selectedFilterText}>{summary}</Text>
      <PressableScale accessibilityRole="button" hitSlop={10} onPress={onReset}>
        <Text style={styles.selectedFilterReset}>초기화</Text>
      </PressableScale>
    </View>
  );
}

function FilterBodyScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={styles.filterBody}
      contentContainerStyle={styles.filterBodyContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

function FilterGroupTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.filterGroupTitle}>{children}</Text>;
}

function FilterDivider() {
  return <View style={styles.filterDivider} />;
}

function FilterGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.filterGrid}>{children}</View>;
}

function FilterCheckItem({
  label,
  active,
  multiline = false,
  onPress,
}: {
  label: string;
  active: boolean;
  multiline?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      style={[
        styles.filterCheckItem,
        active ? styles.filterCheckItemActive : null,
        multiline ? styles.filterCheckItemMultiline : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.checkBox, active ? styles.checkBoxActive : null]}>
        {active ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text
        style={[styles.filterCheckText, multiline ? styles.filterCheckTextMultiline : null, active ? styles.filterCheckTextActive : null]}
        numberOfLines={multiline ? 3 : 1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{title}</Text>
      <View style={styles.chipWrap}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  active,
  color = '#111318',
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <UiChip label={label} active={active} tone={getChipTone(color)} onPress={onPress} />
  );
}

function getChipTone(color: string): 'dark' | 'green' | 'red' | 'blue' {
  if (color === '#226d68') {
    return 'green';
  }
  if (color === '#d84f41') {
    return 'red';
  }
  if (color === '#23A9FF') {
    return 'blue';
  }
  return 'dark';
}

function SearchSkeleton() {
  return (
    <View style={styles.skeletonBlock}>
      <View style={styles.skeletonLarge} />
      <View style={styles.skeletonGrid}>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
      <Text style={styles.skeletonText}>강의 노트를 불러오고 있습니다.</Text>
    </View>
  );
}

function getCourseScope(course: Course, userDepartment?: string): CategoryFilter {
  const isGeneral = course.type.includes('교양') || course.department.includes('교양');
  if (isGeneral) {
    return 'general';
  }
  if (userDepartment && course.department === userDepartment) {
    return 'myMajor';
  }
  return 'otherMajor';
}

function normalizeArea(course: Course) {
  return course.category || course.department || '영역 미분류';
}

function matchesGeneralArea(course: Course, selectedArea: string) {
  const courseArea = course.generalArea ?? '';
  if (selectedArea === '핵심교양') return courseArea.startsWith('핵심교양');
  if (selectedArea === '일반교양') return courseArea.startsWith('일반교양');
  return courseArea === selectedArea;
}

function normalizeFilterText(value: string) {
  return value.replace(/\s+/g, '').replace(/[·.-]/g, '').toLowerCase();
}

function getMajorType(course: Course) {
  const typeText = `${course.type} ${course.category}`;
  if (typeText.includes('필수') || typeText.includes('전필')) {
    return 'required';
  }
  return 'elective';
}

function isPfCourse(course: Course) {
  const target = course.evaluationType ?? `${course.grading} ${course.type} ${course.category}`;
  return /p\s*\/?\s*f|pass|패스|pf/i.test(target);
}

function sortCourses(courses: Course[], sortBy: SortOption) {
  const sorted = [...courses];
  switch (sortBy) {
    case 'reviews':
      return sorted.sort((a, b) => b.reviewCount - a.reviewCount);
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'credits':
      return sorted.sort((a, b) => (b.credits ?? 0) - (a.credits ?? 0));
    default:
      return sorted.sort((a, b) => b.rating - a.rating);
  }
}

function dedupeCoursesByNameAndProfessor(courses: Course[]) {
  const byCourseIdentity = new Map<string, Course>();

  courses.forEach((course) => {
    const key = getCourseIdentityKey(course);

    if (!byCourseIdentity.has(key)) {
      byCourseIdentity.set(key, course);
    }
  });

  return Array.from(byCourseIdentity.values());
}

function getCourseIdentityKey(course: Course) {
  return `${normalizeCourseIdentity(course.name)}::${normalizeCourseIdentity(course.professor)}`;
}

function normalizeCourseIdentity(value: string) {
  return value.replace(/교수님?|강사님?/g, '').replace(/\s+/g, '').toLowerCase();
}

function getSortLabel(sortBy: SortOption) {
  return sortOptions.find((option) => option.key === sortBy)?.label.replace(' 높은순', '순') ?? '정렬';
}

function getPanelTitle(panel: Exclude<PanelType, null>) {
  switch (panel) {
    case 'all':
      return '전체 필터';
    case 'major':
      return '전공 필터';
    case 'general':
      return '교양 필터';
    default:
      return '필터';
  }
}

function getPanelForCategory(category: CategoryFilter): Exclude<PanelType, 'sort' | null> {
  if (category === 'general') {
    return 'general';
  }

  if (category === 'all') {
    return 'all';
  }

  return 'major';
}

function getActiveFilterChips({
  category,
  generalArea,
  generalCredit,
  generalPf,
  majorCredit,
  majorType,
}: {
  category: CategoryFilter;
  generalArea: string;
  generalCredit: number | 'all';
  generalPf: 'all' | 'pf' | 'grade';
  majorCredit: number | 'all';
  majorType: 'all' | 'required' | 'elective';
}) {
  const chips: string[] = [];
  const shouldShowMajor = category === 'all' || category === 'myMajor' || category === 'otherMajor';
  const shouldShowGeneral = category === 'all' || category === 'general';

  if (shouldShowMajor) {
    if (majorCredit !== 'all') {
      chips.push(`전공 ${majorCredit}학점`);
    }
    if (majorType !== 'all') {
      chips.push(majorType === 'required' ? '전필' : '전선');
    }
  }

  if (shouldShowGeneral) {
    if (generalArea !== 'all') {
      chips.push(getCompactGeneralAreaLabel(generalArea));
    }
    if (generalCredit !== 'all') {
      chips.push(`교양 ${generalCredit}학점`);
    }
    if (generalPf !== 'all') {
      chips.push(generalPf === 'pf' ? 'P/F' : '등급제');
    }
  }

  return chips;
}

function getMajorSelectionSummary(credit: number | 'all', type: 'all' | 'required' | 'elective') {
  const selected = [
    credit === 'all' ? '전체 학점' : `${credit}학점`,
    type === 'all' ? '전필·전선' : type === 'required' ? '전필' : '전선',
  ];
  return selected.join(' · ');
}

function getAllSelectionSummary(
  majorCredit: number | 'all',
  majorType: 'all' | 'required' | 'elective',
  generalArea: string,
  generalCredit: number | 'all',
  generalPf: 'all' | 'pf' | 'grade',
) {
  return [
    `전공 ${getMajorSelectionSummary(majorCredit, majorType)}`,
    `교양 ${getGeneralSelectionSummary(generalArea, generalCredit, generalPf)}`,
  ].join(' / ');
}

function getGeneralSelectionSummary(area: string, credit: number | 'all', pf: 'all' | 'pf' | 'grade') {
  const selected = [
    area === 'all' ? '전체 영역' : area,
    credit === 'all' ? '전체 학점' : `${credit}학점`,
    pf === 'all' ? 'P/F 포함' : pf === 'pf' ? 'P/F' : '등급제',
  ];
  return selected.join(' · ');
}

function getCompactGeneralAreaLabel(area: string) {
  const labelMap: Record<string, string> = {
    핵심교양: '핵심교양',
    '핵심교양-1.인간, 가치, 공존': '핵심 1 인간·가치',
    '핵심교양-1.인간, 가치, 공존(공학윤리와 토론)': '핵심 1 공학윤리',
    '핵심교양-2.역사, 사상, 문화': '핵심 2 역사·문화',
    '핵심교양-3.문학, 예술, 상징': '핵심 3 문학·예술',
    '핵심교양-4.사회, 제도, 세계': '핵심 4 사회·세계',
    '핵심교양-5.자연, 생명, 환경': '핵심 5 자연·환경',
    '핵심교양-6.수리, 정보, 기술': '핵심 6 수리·기술',
    일반교양: '일반교양',
    '일반교양-1.인문 · 예술': '일반 1 인문·예술',
    '일반교양-2. 사회 · 자연': '일반 2 사회·자연',
    '일반교양-3.소통 · 실천': '일반 3 소통·실천',
    '일반교양-4.창의 · 도전': '일반 4 창의·도전',
    '일반교양-5.실용 · 진로': '일반 5 실용·진로',
    '일반교양-6.생활 · 건강': '일반 6 생활·건강',
    '일반교양-7.SW·AI': '일반 7 SW·AI',
  };

  return labelMap[area] ?? area;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F5F8',
  },
  content: {
    paddingBottom: 112,
    gap: 12,
    backgroundColor: '#F2F5F8',
  },
  listHeader: {
    gap: 12,
  },
  exploreHeader: {
    paddingHorizontal: spacing.page,
    gap: 5,
    paddingTop: 6,
    paddingBottom: 0,
  },
  exploreTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  exploreMeta: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  searchDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 18,
  },
  searchBar: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    paddingHorizontal: 13,
  },
  searchIcon: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#111318',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#111318',
    fontSize: 15,
    fontWeight: '700',
  },
  searchButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  controlPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.985 }],
  },
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 2,
  },
  categoryButton: {
    minWidth: 0,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E8EF',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryButtonInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E8EF',
  },
  categoryButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categorySegment: {
    marginHorizontal: spacing.page,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.backgroundElevated,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  categorySegmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  categorySegmentButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  categorySegmentText: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  categorySegmentTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 18,
  },
  toolIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterSlot: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  activeFilterRail: {
    gap: 8,
    paddingHorizontal: spacing.page,
    alignItems: 'center',
  },
  activeFilterChip: {
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activeFilterChipX: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.7,
  },
  // sort sheet
  sortOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },
  sortScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sortCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sortHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D0D0D0',
    marginTop: 12,
    marginBottom: 22,
  },
  sortCardHeader: {
    paddingHorizontal: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F4',
  },
  sortCardTitle: {
    color: '#171A1F',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'left',
  },
  sortDivider: {
    height: 1,
    backgroundColor: '#F1F2F4',
    marginHorizontal: 28,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    minHeight: 56,
  },
  sortRowText: {
    color: '#272A30',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: 0,
    textAlign: 'left',
  },
  sortRowTextActive: {
    color: '#171A1F',
    fontWeight: '800',
  },
  sortCheckEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#c7c7cc',
  },
  sortCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortCheckInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  sortCancelCard: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    alignItems: 'center',
  },
  sortCancelText: {
    color: '#1c1c1e',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.related,
    paddingHorizontal: spacing.page,
    paddingTop: 4,
  },
  summaryText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryHint: {
    color: '#5E6E85',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  sortChevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#8f9caf',
    transform: [{ rotate: '45deg' }, { translateY: -2 }],
  },
  galleryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    paddingHorizontal: spacing.page,
  },
  loadMoreHint: {
    marginHorizontal: 18,
    marginTop: -spacing.tight,
    marginBottom: spacing.group,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadMoreHintText: {
    color: '#7b8492',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,24,38,0.24)',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 0,
    paddingTop: 10,
    paddingBottom: 0,
    gap: 0,
    minHeight: 640,
    maxHeight: '93%',
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d7d7dc',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 13,
  },
  sheetTitle: {
    color: '#111318',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sheetCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F4F7FA',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: {
    color: '#111318',
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '700',
  },
  selectedFilterBar: {
    minHeight: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.page,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEF1F4',
  },
  selectedFilterText: {
    flex: 1,
    color: '#75757b',
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  selectedFilterReset: {
    color: '#606068',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  filterBody: {
    flex: 1,
  },
  filterBodyContent: {
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
  },
  filterGroupTitle: {
    color: '#111318',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  filterDivider: {
    height: 1,
    backgroundColor: 'rgba(18,24,38,0.06)',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
  },
  filterCheckItem: {
    width: '48.6%',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E8EF',
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  filterCheckItemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  filterCheckItemMultiline: {
    minHeight: 54,
    alignItems: 'flex-start',
    paddingTop: 9,
  },
  checkBox: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#d0d0d4',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  filterCheckText: {
    flex: 1,
    color: '#626b78',
    fontSize: 11.2,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  filterCheckTextMultiline: {
    fontSize: 9.7,
    lineHeight: 13,
    letterSpacing: -0.45,
  },
  filterCheckTextActive: {
    color: '#111318',
    fontWeight: '700',
  },
  sheetFooter: {
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: spacing.related,
    gap: 7,
    backgroundColor: '#FFFFFF',
  },
  sheetApplyButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetApplyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sheetResetLine: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  sheetResetLineText: {
    color: '#111318',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  filterSection: {
    gap: spacing.related,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.page,
  },
  filterSectionTitle: {
    color: '#111318',
    fontSize: 14,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.tight,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stateBlock: {
    minHeight: 160,
    marginHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.related,
  },
  stateBlockError: {
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.16)',
  },
  stateText: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateTextError: {
    color: colors.danger,
  },
  skeletonBlock: {
    marginHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E8EF',
    padding: 16,
    gap: 14,
  },
  skeletonLarge: {
    width: '52%',
    height: 14,
    borderRadius: 999,
    backgroundColor: '#e3e8f1',
  },
  skeletonGrid: {
    flexDirection: 'row',
    gap: spacing.related,
  },
  skeletonCard: {
    flex: 1,
    height: 170,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },
  skeletonText: {
    color: '#7b8492',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
