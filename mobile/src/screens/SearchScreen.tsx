import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoursePosterCard } from '../components/CoursePosterCard';
import { useAuth } from '../contexts/AuthContext';
import { getAllCourses, searchCourses } from '../lib/api/courses';
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
type PanelType = 'all' | 'major' | 'general' | 'sort' | null;

const categoryTabs: Array<{ key: CategoryFilter; label: string; color: string }> = [
  { key: 'all', label: '전체', color: '#121826' },
  { key: 'general', label: '교양', color: '#226d68' },
  { key: 'myMajor', label: '자기전공', color: '#d84f41' },
  { key: 'otherMajor', label: '타과전공', color: '#16499a' },
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
  const [majorCredit, setMajorCredit] = useState<number | 'all'>('all');
  const [majorType, setMajorType] = useState<'all' | 'required' | 'elective'>('all');
  const [generalArea, setGeneralArea] = useState('all');
  const [generalCredit, setGeneralCredit] = useState<number | 'all'>('all');
  const [generalPf, setGeneralPf] = useState<'all' | 'pf' | 'grade'>('all');
  const [visibleCourseCount, setVisibleCourseCount] = useState(COURSE_PAGE_SIZE);

  const loadCourses = async (keyword?: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage('');

    try {
      const normalizedKeyword = keyword?.trim() ?? '';
      const data = normalizedKeyword ? await searchCourses(normalizedKeyword) : await getAllCourses();

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
    loadCourses(route.initialQuery);
  }, [route.initialQuery]);

  useEffect(() => {
    navigation.setTabBarSuppressed(Boolean(activePanel));

    return () => navigation.setTabBarSuppressed(false);
  }, [activePanel, navigation]);

  const filteredCourses = useMemo(() => {
    const filtered = courses.filter((course) => {
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

    return sortCourses(filtered, sortBy);
  }, [
    category,
    courses,
    generalArea,
    generalCredit,
    generalPf,
    majorCredit,
    majorType,
    sortBy,
    user?.department,
  ]);

  useEffect(() => {
    setVisibleCourseCount(COURSE_PAGE_SIZE);
  }, [filteredCourses]);

  const visibleCourses = useMemo(
    () => filteredCourses.slice(0, visibleCourseCount),
    [filteredCourses, visibleCourseCount],
  );

  const galleryRows = useMemo(() => {
    const rows: Course[][] = [];
    for (let index = 0; index < visibleCourses.length; index += 1) {
      rows.push(visibleCourses.slice(index, index + 1));
    }
    return rows;
  }, [visibleCourses]);

  const trimmedQuery = query.trim();

  const handleLoadMore = () => {
    if (isLoading || errorMessage || visibleCourseCount >= filteredCourses.length) {
      return;
    }

    setVisibleCourseCount((current) => Math.min(current + COURSE_PAGE_SIZE, filteredCourses.length));
  };

  const handleOpenSort = () => {
    if (Platform.OS === 'ios') {
      const labels = sortOptions.map((option) => option.label);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, '취소'],
          cancelButtonIndex: labels.length,
          title: '정렬',
          message: '강의 큐레이션 순서를 선택하세요.',
          userInterfaceStyle: 'light',
        },
        (selectedIndex) => {
          const nextSort = sortOptions[selectedIndex];
          if (nextSort) {
            setSortBy(nextSort.key);
          }
        },
      );
      return;
    }

    setActivePanel('sort');
  };

  const activeFilterChips = useMemo(
    () =>
      getActiveFilterChips({
        category,
        generalArea,
        generalCredit,
        generalPf,
        majorCredit,
        majorType,
      }),
    [category, generalArea, generalCredit, generalPf, majorCredit, majorType],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <FlatList
        data={isLoading || errorMessage ? [] : galleryRows}
        keyExtractor={(_, index) => `search-row-${index}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.related }]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.exploreHeader}>
              <Text style={styles.exploreTitle}>Search the notes</Text>
              <Text style={styles.exploreMeta}>
                @{user?.nickname ?? 'inha'} · {user?.department ?? '학과 미설정'}
              </Text>
            </View>

            <View style={styles.searchDock}>
              <View style={styles.searchBar}>
                <View style={styles.searchIcon} />
                <TextInput
                  placeholder="강의명, 교수명, 학과"
                  placeholderTextColor="#a0a0a7"
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => loadCourses(query)}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.searchButton, pressed ? styles.controlPressed : null]}
                onPress={() => loadCourses(query)}
              >
                <Text style={styles.searchButtonText}>검색</Text>
              </Pressable>
            </View>

            <View style={styles.categoryGrid}>
              {categoryTabs.map((tab) => {
                const active = category === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.categoryButton,
                      active
                        ? { backgroundColor: tab.color, borderColor: 'rgba(255,255,255,0.22)' }
                        : styles.categoryButtonInactive,
                    ]}
                    onPress={() => setCategory(tab.key)}
                  >
                    <Text style={[styles.categoryButtonText, { color: active ? '#ffffff' : tab.color }]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.toolRow}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.toolIconButton, pressed ? styles.controlPressed : null]}
                onPress={() => setActivePanel(getPanelForCategory(category))}
              >
                <FilterGlyph />
              </Pressable>
              <View style={styles.activeFilterSlot}>
                {activeFilterChips.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.activeFilterRail}
                  >
                    {activeFilterChips.map((chip) => (
                      <View key={chip} style={styles.activeFilterChip}>
                        <Text style={styles.activeFilterChipText}>{chip}</Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.toolIconButton, pressed ? styles.controlPressed : null]}
                onPress={handleOpenSort}
              >
                <SortGlyph />
              </Pressable>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                {trimmedQuery ? `"${trimmedQuery}" 검색 결과` : getCategoryLabel(category)} {filteredCourses.length}개
              </Text>
              <Text style={styles.summaryHint}>
                {filteredCourses.length > 0 ? `${visibleCourses.length}개 표시 중` : '필터와 정렬을 조합해보세요'}
              </Text>
            </View>

            {isLoading ? <SearchSkeleton /> : null}
            {!isLoading && errorMessage ? <StateBlock label={errorMessage} error /> : null}
            {!isLoading && !errorMessage && filteredCourses.length === 0 ? (
              <StateBlock label="조건에 맞는 강의가 없어요. 필터를 조금 느슨하게 바꿔볼까요?" />
            ) : null}
          </View>
        }
        renderItem={({ item, index: rowIndex }) => (
          <View style={styles.galleryRow}>
            {item.map((course, columnIndex) => {
              const absoluteIndex = rowIndex + columnIndex;
              return (
                <View key={course.id} style={styles.galleryCell}>
                  <CoursePosterCard
                    course={course}
                    variant="medium"
                    index={absoluteIndex + 4}
                    userDepartment={user?.department}
                    onPress={() => navigation.navigate({ name: 'CourseCollection', courseId: course.id })}
                  />
                </View>
              );
            })}
          </View>
        )}
        ListFooterComponent={
          !isLoading && !errorMessage && visibleCourseCount < filteredCourses.length ? (
            <View style={styles.loadMoreHint}>
              <Text style={styles.loadMoreHintText}>아래로 더 내리면 다음 큐레이션을 이어서 보여드릴게요</Text>
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
          sortBy={sortBy}
          onClose={() => setActivePanel(null)}
          onGeneralAreaChange={setGeneralArea}
          onGeneralCreditChange={setGeneralCredit}
          onGeneralPfChange={setGeneralPf}
          onMajorCreditChange={setMajorCredit}
          onMajorTypeChange={setMajorType}
          onSortChange={setSortBy}
        />
      ) : null}
    </SafeAreaView>
  );
}

function FilterGlyph() {
  return (
    <View style={styles.filterGlyph}>
      <View style={styles.filterGlyphLine}>
        <View style={[styles.filterGlyphDot, { left: 4 }]} />
      </View>
      <View style={styles.filterGlyphLine}>
        <View style={[styles.filterGlyphDot, { right: 5 }]} />
      </View>
      <View style={styles.filterGlyphLine}>
        <View style={[styles.filterGlyphDot, { left: 11 }]} />
      </View>
    </View>
  );
}

function SortGlyph() {
  return (
    <View style={styles.sortGlyph}>
      <View style={[styles.sortGlyphBar, { width: 20 }]} />
      <View style={[styles.sortGlyphBar, { width: 14 }]} />
      <View style={[styles.sortGlyphBar, { width: 8 }]} />
    </View>
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
  sortBy,
  onClose,
  onGeneralAreaChange,
  onGeneralCreditChange,
  onGeneralPfChange,
  onMajorCreditChange,
  onMajorTypeChange,
  onSortChange,
}: {
  activePanel: Exclude<PanelType, null>;
  generalArea: string;
  generalCredit: number | 'all';
  generalPf: 'all' | 'pf' | 'grade';
  majorCredit: number | 'all';
  majorType: 'all' | 'required' | 'elective';
  resultCount: number;
  sortBy: SortOption;
  onClose: () => void;
  onGeneralAreaChange: (value: string) => void;
  onGeneralCreditChange: (value: number | 'all') => void;
  onGeneralPfChange: (value: 'all' | 'pf' | 'grade') => void;
  onMajorCreditChange: (value: number | 'all') => void;
  onMajorTypeChange: (value: 'all' | 'required' | 'elective') => void;
  onSortChange: (value: SortOption) => void;
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
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.sheetCloseButton, pressed ? styles.controlPressed : null]}
            onPress={onClose}
          >
            <Text style={styles.sheetCloseText}>×</Text>
          </Pressable>
        </View>

        {activePanel !== 'sort' ? (
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
        ) : null}

        {activePanel === 'sort' ? (
          <FilterSection title="정렬 기준">
            {sortOptions.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                active={sortBy === option.key}
                onPress={() => {
                  onSortChange(option.key);
                  onClose();
                }}
              />
            ))}
          </FilterSection>
        ) : null}

        {activePanel !== 'sort' ? (
          <View style={styles.sheetFooter}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.sheetApplyButton, pressed ? styles.controlPressed : null]}
              onPress={onClose}
            >
              <Text style={styles.sheetApplyButtonText}>{resultCount.toLocaleString()}개 강의 보기</Text>
            </Pressable>
            <Pressable style={styles.sheetResetLine} onPress={resetFilters}>
              <Text style={styles.sheetResetLineText}>선택 초기화하고 전체 강의 보기</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SelectedFilterBar({ summary, onReset }: { summary: string; onReset: () => void }) {
  return (
    <View style={styles.selectedFilterBar}>
      <Text style={styles.selectedFilterText}>{summary}</Text>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onReset}>
        <Text style={styles.selectedFilterReset}>초기화</Text>
      </Pressable>
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
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => [
        styles.filterCheckItem,
        active ? styles.filterCheckItemActive : null,
        multiline ? styles.filterCheckItemMultiline : null,
        pressed ? styles.controlPressed : null,
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
    </Pressable>
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
  color = '#121826',
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? color : 'rgba(255,255,255,0.58)',
          borderColor: active ? color : 'rgba(255,255,255,0.78)',
        },
        pressed ? styles.controlPressed : null,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, { color: active ? '#ffffff' : color }]}>{label}</Text>
    </Pressable>
  );
}

function StateBlock({
  label,
  error = false,
  loading = false,
}: {
  label: string;
  error?: boolean;
  loading?: boolean;
}) {
  return (
    <View style={[styles.stateBlock, error ? styles.stateBlockError : null]}>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Text style={[styles.stateText, error ? styles.stateTextError : null]}>{label}</Text>
    </View>
  );
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
  const haystack = normalizeFilterText(`${course.category} ${course.department} ${course.type}`);
  const selected = normalizeFilterText(selectedArea);

  if (selected === normalizeFilterText('핵심교양')) {
    return haystack.includes(normalizeFilterText('핵심교양'));
  }

  if (selected === normalizeFilterText('일반교양')) {
    return haystack.includes(normalizeFilterText('일반교양'));
  }

  return haystack.includes(selected) || selected.includes(haystack);
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
  return /p\s*\/?\s*f|pass|패스|pf/i.test(`${course.grading} ${course.type} ${course.category}`);
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

function getCategoryLabel(category: CategoryFilter) {
  switch (category) {
    case 'general':
      return '교양 큐레이션';
    case 'myMajor':
      return '자기전공 큐레이션';
    case 'otherMajor':
      return '타과전공 큐레이션';
    default:
      return '전체 큐레이션';
  }
}

function getPanelTitle(panel: Exclude<PanelType, null>) {
  switch (panel) {
    case 'all':
      return '전체 필터';
    case 'major':
      return '전공 필터';
    case 'general':
      return '교양 필터';
    case 'sort':
      return '정렬';
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
    backgroundColor: '#f7f9fd',
  },
  content: {
    paddingBottom: 104,
    gap: 6,
  },
  listHeader: {
    gap: 10,
  },
  exploreHeader: {
    paddingHorizontal: spacing.page,
    gap: 4,
    paddingBottom: 8,
  },
  exploreTitle: {
    color: '#121826',
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  exploreMeta: {
    color: '#8c929f',
    fontSize: 13,
    fontWeight: '600',
  },
  searchDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: spacing.page,
  },
  searchBar: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 15,
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  searchIcon: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#121826',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#121826',
    fontSize: 15,
    fontWeight: '700',
  },
  searchButton: {
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(18,24,38,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#121826',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  controlPressed: {
    opacity: 0.74,
    transform: [{ scale: 0.985 }],
  },
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: spacing.page,
  },
  categoryButton: {
    minWidth: 0,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  categoryButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderColor: 'rgba(255,255,255,0.78)',
  },
  categoryButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: spacing.page,
  },
  toolIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  activeFilterSlot: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  activeFilterRail: {
    gap: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  activeFilterChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  activeFilterChipText: {
    color: '#314767',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  filterGlyph: {
    width: 22,
    gap: 4,
  },
  filterGlyphLine: {
    height: 2,
    borderRadius: 999,
    backgroundColor: '#121826',
    position: 'relative',
  },
  filterGlyphDot: {
    position: 'absolute',
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#121826',
  },
  sortGlyph: {
    width: 22,
    alignItems: 'flex-end',
    gap: 5,
  },
  sortGlyphBar: {
    height: 3,
    borderRadius: 999,
    backgroundColor: '#121826',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.related,
    paddingHorizontal: spacing.page,
  },
  summaryText: {
    flex: 1,
    color: '#121826',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  summaryHint: {
    color: '#96969d',
    fontSize: 10,
    fontWeight: '800',
  },
  galleryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
    paddingHorizontal: spacing.page,
  },
  galleryCell: {
    flex: 1,
  },
  galleryCellGhost: {
    flex: 1,
  },
  loadMoreHint: {
    marginHorizontal: spacing.page,
    marginTop: -spacing.tight,
    marginBottom: spacing.group,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  loadMoreHintText: {
    color: '#7b8492',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,24,38,0.30)',
  },
  sheet: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    paddingTop: 10,
    paddingBottom: 0,
    gap: 0,
    minHeight: 640,
    maxHeight: '93%',
    overflow: 'hidden',
    shadowColor: '#16499a',
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
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
    color: '#121826',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  sheetCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: {
    color: '#121826',
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '900',
  },
  selectedFilterBar: {
    minHeight: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.46)',
    paddingHorizontal: spacing.page,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  selectedFilterText: {
    flex: 1,
    color: '#75757b',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  selectedFilterReset: {
    color: '#606068',
    fontSize: 12,
    fontWeight: '800',
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
    color: '#121826',
    fontSize: 14,
    fontWeight: '900',
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
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  filterCheckItemActive: {
    backgroundColor: 'rgba(238,244,255,0.82)',
    borderColor: 'rgba(22,73,154,0.24)',
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
    borderColor: '#121826',
    backgroundColor: '#121826',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
  },
  filterCheckText: {
    flex: 1,
    color: '#626b78',
    fontSize: 11.2,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  filterCheckTextMultiline: {
    fontSize: 9.7,
    lineHeight: 13,
    letterSpacing: -0.45,
  },
  filterCheckTextActive: {
    color: '#121826',
    fontWeight: '900',
  },
  sheetFooter: {
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    paddingBottom: spacing.related,
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.64)',
  },
  sheetApplyButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(17,24,39,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetApplyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sheetResetLine: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  sheetResetLineText: {
    color: '#121826',
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
    color: '#121826',
    fontSize: 14,
    fontWeight: '900',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.tight,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '900',
  },
  stateBlock: {
    minHeight: 160,
    marginHorizontal: spacing.page,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
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
    marginHorizontal: spacing.page,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
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
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  skeletonText: {
    color: '#7b8492',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
