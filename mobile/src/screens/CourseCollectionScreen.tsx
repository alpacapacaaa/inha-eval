import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, StatePanel } from '../components/ui';
import { getAllCourses, getCourseById, getCourseStats } from '../lib/api/courses';
import { getReviewsByCourseId } from '../lib/api/reviews';
import { loadTimetableCartIds, saveTimetableCartIds } from '../lib/storage/timetableStorage';
import { formatPeriodRange, TIMETABLE_BY_COURSE_ID, TimetableDay, TimetableSlot } from '../lib/timetableData';
import { AppNavigation } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Course, CourseStats, Review } from '../types/models';
import { AppRoute } from '../types/navigation';

interface Props {
  navigation: AppNavigation;
  route: Extract<AppRoute, { name: 'CourseCollection' }>;
}

export function CourseCollectionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isInCart, setIsInCart] = useState(false);
  const [sectionOptions, setSectionOptions] = useState<Course[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isSectionPickerOpen, setIsSectionPickerOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadCollection = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [courseResult, reviewResult, statsResult, cartIds, allCoursesResult] = await Promise.allSettled([
          getCourseById(route.courseId),
          getReviewsByCourseId(route.courseId),
          getCourseStats(route.courseId),
          loadTimetableCartIds(),
          getAllCourses(),
        ]);

        if (!isActive) {
          return;
        }

        if (courseResult.status === 'rejected') {
          throw courseResult.reason;
        }

        if (reviewResult.status === 'rejected') {
          throw reviewResult.reason;
        }

        const loadedCourse = courseResult.value;
        setCourse(loadedCourse);
        setReviews(reviewResult.value);

        const sections = allCoursesResult.status === 'fulfilled'
          ? getCourseSections(loadedCourse, allCoursesResult.value)
          : [loadedCourse];
        const sectionIds = sections.map((section) => String(section.id));
        const cartSectionId = cartIds.status === 'fulfilled'
          ? cartIds.value.find((id) => sectionIds.includes(id)) ?? null
          : null;
        setSectionOptions(sections);
        setSelectedSectionId(cartSectionId);
        setIsInCart(Boolean(cartSectionId));

        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : '강의 카드뉴스를 불러오지 못했습니다.');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadCollection();

    return () => {
      isActive = false;
    };
  }, [route.courseId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.stateSafeArea}>
        <StatePanel label="강의 카드뉴스를 준비하는 중입니다." loading />
      </SafeAreaView>
    );
  }

  if (errorMessage || !course) {
    return (
      <SafeAreaView style={styles.stateSafeArea}>
        <StatePanel label={errorMessage || '강의 정보를 찾지 못했습니다.'} error />
      </SafeAreaView>
    );
  }

  const mood = getMoodCopy(course, reviews);
  const reportRows = getReportRows(course, reviews, stats);
  const metricDistributions = getMetricDistributions(course, reviews, stats);
  const cautionLabels = getCautionLabels(course).slice(0, 2);
  const keywordGroups = getKeywordGroups(course, reviews);
  const structuredReportSections = getStructuredReportSections(course, reviews, stats);
  const checklistItems = getChecklistItems(course, reviews, stats);
  const fitLabels = getFitLabels(course, reviews);
  const allKeywordHighlights = collectKeywords(course, reviews);
  const keywordHighlights = allKeywordHighlights.slice(0, 5);
  const hiddenKeywordCount = Math.max(allKeywordHighlights.length - keywordHighlights.length, 0);
  const reportCount = course.reviewCount || reviews.length;
  const hasReportData = reportCount > 0 || reportRows.some((row) => row.status !== '평가 없음');
  const handleOpenReviewWrite = () => navigation.navigate({ name: 'ReviewWrite', courseId: course.id });

  const handleToggleCart = async () => {
    const currentIds = await loadTimetableCartIds();
    const sectionIds = getSectionIds(sectionOptions, course);

    if (currentIds.some((id) => sectionIds.includes(id))) {
      const nextIds = currentIds.filter((id) => !sectionIds.includes(id));
      await saveTimetableCartIds(nextIds);
      setIsInCart(false);
      setSelectedSectionId(null);
      return;
    }

    const availableSections = getAvailableSections(sectionOptions, course);
    if (availableSections.length > 1) {
      setIsSectionPickerOpen(true);
      return;
    }

    const sectionId = String(availableSections[0]?.id ?? course.id);
    const nextIds = [...currentIds.filter((id) => !sectionIds.includes(id)), sectionId];
    await saveTimetableCartIds(nextIds);
    setIsInCart(true);
    setSelectedSectionId(sectionId);
  };

  const handleSelectSection = async (section: Course) => {
    const currentIds = await loadTimetableCartIds();
    const sectionIds = getSectionIds(sectionOptions, course);
    const sectionId = String(section.id);
    const nextIds = [...currentIds.filter((id) => !sectionIds.includes(id)), sectionId];
    await saveTimetableCartIds(nextIds);
    setSelectedSectionId(sectionId);
    setIsInCart(true);
    setIsSectionPickerOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.pdpContent,
          { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom, 12) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <PressableScale style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </PressableScale>

          <View style={styles.titleBlock}>
            <Text style={styles.topTitle} numberOfLines={1}>{course.name}</Text>
            <Text style={styles.topSubtitle} numberOfLines={1}>{course.professor}</Text>
          </View>

          <View style={styles.topActions}>
            <PressableScale style={[styles.iconButton, isInCart ? styles.iconButtonActive : null]} onPress={handleToggleCart}>
              <Ionicons name={isInCart ? 'bookmark' : 'bookmark-outline'} size={20} color={isInCart ? colors.primary : '#111318'} />
            </PressableScale>
          </View>
        </View>

        <View style={styles.reportHero}>
          <Text style={styles.reportEyebrow}>수강 전 안내서</Text>
          <Text style={styles.reportHeroTitle}>{mood.title}</Text>
          <Text style={styles.reportHeroBody}>
            {hasReportData
              ? mood.summary
              : '첫 강의평이 등록되면 이 화면에서 수업 흐름과 부담도를 더 정확히 읽을 수 있어요.'}
          </Text>

          <View style={styles.reportHeroMetaRow}>
            <View style={styles.reportHeroMetaChip}>
              <Ionicons name="star" size={14} color={colors.primary} />
              <Text style={styles.reportHeroMetaText}>{course.rating.toFixed(1)}점</Text>
            </View>
            <View style={styles.reportHeroMetaChip}>
              <Ionicons name="chatbubble-ellipses" size={14} color={colors.primary} />
              <Text style={styles.reportHeroMetaText}>{reportCount}개 평가</Text>
            </View>
          </View>
          <PressableScale style={styles.reportWriteButton} onPress={handleOpenReviewWrite}>
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.reportWriteButtonText}>강의평 작성하기</Text>
          </PressableScale>
        </View>

        <ReportMetricPanel
          metrics={metricDistributions}
          reviewCount={reportCount}
        />

        <View style={styles.reportSummaryPanel}>
          <Text style={styles.reportSummaryTitle}>반복해서 보이는 특징</Text>
          <Text style={styles.reportSummaryBody}>
            {hasReportData ? mood.summary : '아직 충분한 데이터가 없어, 후기와 평가가 쌓이는 대로 요약을 채워갑니다.'}
          </Text>
          <View style={styles.reportKeywordWrap}>
            {keywordHighlights.length > 0 ? keywordHighlights.map((keyword) => (
              <Text key={`report-highlight-${keyword}`} style={styles.reportKeywordChip}>
                #{humanizeRawSignal(keyword)}
              </Text>
            )) : (
              <Text style={styles.reportKeywordEmpty}>반복 키워드가 아직 없어요</Text>
            )}
            {hiddenKeywordCount > 0 ? (
              <Text style={[styles.reportKeywordChip, styles.reportKeywordMoreChip]}>+{hiddenKeywordCount}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.reportSection}>
          <View style={styles.reportSectionHeader}>
            <Text style={styles.reportSectionTitle}>평가 리포트</Text>
          </View>
          <View style={styles.reportStructureList}>
            {structuredReportSections.map((section) => (
              <View key={`structured-${section.title}`} style={styles.reportStructureBlock}>
                <View style={styles.reportStructureHead}>
                  <View style={styles.reportRowIcon}>
                    <Ionicons name={section.icon} size={19} color={colors.primary} />
                  </View>
                  <View style={styles.reportRowCopy}>
                    <Text style={styles.reportRowTitle}>{section.title}</Text>
                    <Text style={styles.reportRowHint}>{section.meta}</Text>
                  </View>
                </View>
                <View style={styles.reportQuestionList}>
                  {section.rows.map((row) => (
                    <View key={`${section.title}-${row.label}`} style={styles.reportQuestionRow}>
                      <Text style={styles.reportQuestionLabel} numberOfLines={1}>{row.label}</Text>
                      <Text style={styles.reportQuestionValue} numberOfLines={2} ellipsizeMode="tail">{row.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <ReportAudienceBlock fitLabels={fitLabels} />
          </View>
        </View>

        <View style={styles.reportSection}>
          <View style={styles.reportSectionHeader}>
            <Text style={styles.reportSectionTitle}>후기에서 보는 포인트</Text>
          </View>
          <View style={styles.reportRowList}>
            {keywordGroups.map((group) => (
              <View key={`report-topic-${group.title}`} style={styles.reportRow}>
                <View style={styles.reportRowIcon}>
                  <Ionicons name={group.icon} size={19} color={colors.primary} />
                </View>
                <View style={styles.reportRowCopy}>
                  <Text style={styles.reportRowTitle}>{group.title}</Text>
                  <Text style={styles.reportRowHint} numberOfLines={2} ellipsizeMode="tail">{group.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.reportChecklist}>
          <View style={styles.reportSectionHeader}>
            <Text style={styles.reportSectionTitle}>수강 전 체크</Text>
          </View>
          {mergeChecklistItems(cautionLabels, checklistItems).slice(0, 4).map((item, index) => (
            <View key={`report-check-${item}`} style={styles.checkRow}>
              <Ionicons
                name={index < cautionLabels.length ? 'alert-circle' : item.includes('특별히') ? 'checkmark-circle' : 'information-circle'}
                size={18}
                color={index < cautionLabels.length ? '#F05A68' : item.includes('특별히') ? '#2F946F' : colors.primary}
              />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <SectionPickerSheet
        visible={isSectionPickerOpen}
        sections={getAvailableSections(sectionOptions, course)}
        selectedSectionId={selectedSectionId}
        onClose={() => setIsSectionPickerOpen(false)}
        onSelect={handleSelectSection}
      />
    </SafeAreaView>
  );
}

function SectionPickerSheet({
  visible,
  sections,
  selectedSectionId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  sections: Course[];
  selectedSectionId: string | null;
  onClose: () => void;
  onSelect: (section: Course) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sectionSheetOverlay}>
        <Pressable style={styles.sectionSheetScrim} onPress={onClose} />
        <View style={[styles.sectionSheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.sectionSheetHandle} />
          <Text style={styles.sectionSheetTitle}>분반을 선택해주세요</Text>
          <Text style={styles.sectionSheetDesc}>수업 시간을 확인한 뒤 시간표에 담을 분반을 골라요.</Text>

          <View style={styles.sectionOptionList}>
            {sections.map((section, index) => {
              const isSelected = selectedSectionId === String(section.id);
              const slots = getCourseSlots(section);

              return (
                <PressableScale
                  key={`section-${section.id}`}
                  style={[styles.sectionOption, isSelected ? styles.sectionOptionActive : null]}
                  onPress={() => onSelect(section)}
                >
                  <View style={styles.sectionOptionLeft}>
                    <Text style={styles.sectionOptionTitle}>
                      {section.section ? `분반 ${section.section}` : `분반 ${index + 1}`}
                    </Text>
                    <Text style={styles.sectionOptionMeta} numberOfLines={2}>
                      {formatSectionSlots(slots)}
                    </Text>
                  </View>
                  <View style={[styles.sectionCheck, isSelected ? styles.sectionCheckActive : null]}>
                    {isSelected ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getCourseSections(course: Course, courses: Course[]) {
  const semester = course.semester?.trim();
  const sections = courses
    .filter((item) =>
      getCourseIdentityKey(item) === getCourseIdentityKey(course)
      && (!semester || item.semester?.trim() === semester),
    )
    .sort((a, b) => {
      const aSlots = getCourseSlots(a);
      const bSlots = getCourseSlots(b);
      return getFirstSlotOrder(aSlots) - getFirstSlotOrder(bSlots) || a.id - b.id;
    });

  const uniqueSections = Array.from(
    sections.reduce((map, section) => {
      const sectionKey = getSectionPickerKey(section);
      if (!map.has(sectionKey)) {
        map.set(sectionKey, section);
      }
      return map;
    }, new Map<string, Course>()).values(),
  );

  return uniqueSections.length > 0 ? uniqueSections : [course];
}

function getAvailableSections(sections: Course[], fallbackCourse: Course) {
  const withSlots = sections.filter((section) => getCourseSlots(section).length > 0);
  return withSlots.length > 0 ? withSlots : sections.length > 0 ? sections : [fallbackCourse];
}

function getSectionIds(sections: Course[], fallbackCourse: Course) {
  const ids = getAvailableSections(sections, fallbackCourse).map((section) => String(section.id));
  return ids.length > 0 ? ids : [String(fallbackCourse.id)];
}

function getCourseIdentityKey(course: Course) {
  return `${normalizeCourseIdentity(course.name)}::${normalizeCourseIdentity(course.professor)}`;
}

function normalizeCourseIdentity(value: string) {
  return value.replace(/교수님?|강사님?/g, '').replace(/\s+/g, '').toLowerCase();
}

function getSectionPickerKey(course: Course) {
  const normalizedSection = course.section?.trim();
  if (normalizedSection) {
    return `section:${normalizedSection}`;
  }

  const slotKey = getCourseSlots(course)
    .map((slot) => `${slot.day}-${slot.startPeriod}-${slot.endPeriod}`)
    .sort()
    .join('/');

  return slotKey ? `slots:${slotKey}` : `course:${course.id}`;
}

function getFirstSlotOrder(slots: TimetableSlot[]) {
  if (slots.length === 0) return Number.MAX_SAFE_INTEGER;
  const first = [...slots].sort((a, b) => getDayOrder(a.day) - getDayOrder(b.day) || a.startPeriod - b.startPeriod)[0];
  return getDayOrder(first.day) * 100 + first.startPeriod;
}

function getDayOrder(day: TimetableSlot['day']) {
  return ['월', '화', '수', '목', '금'].indexOf(day);
}

function getCourseSlots(course: Course): TimetableSlot[] {
  const backendSlots = (course.slots ?? [])
    .filter((slot): slot is NonNullable<Course['slots']>[number] & { day: TimetableDay } =>
      isTimetableDay(slot.day),
    )
    .map((slot) => ({
      day: slot.day,
      startPeriod: slot.startPeriod,
      endPeriod: slot.endPeriod,
      location: slot.location,
    }));

  return backendSlots.length > 0 ? backendSlots : TIMETABLE_BY_COURSE_ID[String(course.id)] ?? [];
}

function isTimetableDay(day: string): day is TimetableDay {
  return ['월', '화', '수', '목', '금'].includes(day);
}

function formatSectionSlots(slots: TimetableSlot[]) {
  if (slots.length === 0) return '시간표 정보가 아직 없어요';
  return slots
    .map((slot) => `${slot.day} ${formatPeriodRange(slot.startPeriod, slot.endPeriod)}`)
    .join(' / ');
}

function MetricRatingIcon() {
  return (
    <View style={styles.metricIconWrap} pointerEvents="none">
      <View style={styles.metricStarBase}>
        <Ionicons name="star" size={38} color="#647487" />
      </View>
      <View style={styles.metricSmallBadge}>
        <Text style={styles.metricSmallBadgeText}>5.0</Text>
      </View>
    </View>
  );
}

function MetricReviewIcon() {
  return (
    <View style={styles.metricIconWrap} pointerEvents="none">
      <View style={styles.metricChatBase}>
        <Ionicons name="chatbubble-ellipses" size={34} color="#FFFFFF" />
      </View>
      <View style={styles.metricChatDot} />
    </View>
  );
}

function ReportAudienceBlock({
  fitLabels,
}: {
  fitLabels: string[];
}) {
  const visibleItems = fitLabels.slice(0, 3);
  const hiddenCount = Math.max(fitLabels.length - visibleItems.length, 0);

  return (
    <View style={styles.audienceBlock}>
      <View style={styles.reportStructureHead}>
        <View style={styles.reportRowIcon}>
          <Ionicons name="checkmark-circle-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.reportRowCopy}>
          <Text style={styles.reportRowTitle}>이런 학생에게 잘 맞아요</Text>
        </View>
      </View>
      <View style={styles.audienceChipPanel}>
        <View style={styles.recommendChipWrap}>
          {visibleItems.map((item) => (
            <View key={`fit-${item}`} style={styles.recommendChip}>
              <Text style={styles.recommendChipText} numberOfLines={1} ellipsizeMode="tail">
                {item}
              </Text>
            </View>
          ))}
          {hiddenCount > 0 ? (
            <View style={[styles.recommendChip, styles.recommendMoreChip]}>
              <Text style={styles.recommendMoreText}>+{hiddenCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ReportMetricPanel({
  metrics,
  reviewCount,
}: {
  metrics: ReturnType<typeof getMetricDistributions>;
  reviewCount: number;
}) {
  return (
    <View style={styles.metricPanel}>
      <View style={styles.metricPanelHeader}>
        <View>
          <Text style={styles.metricPanelTitle}>수치로 보는 평가</Text>
          <Text style={styles.metricPanelSubtitle}>
            {reviewCount > 0 ? `${reviewCount}개 강의평에서 모은 항목이에요` : '평가가 쌓이면 항목별 수치를 보여줘요'}
          </Text>
        </View>
      </View>
      <View style={styles.metricCardList}>
        {metrics.map((metric) => (
          <View key={`metric-${metric.label}`} style={styles.metricCard}>
            <View style={styles.metricCardTop}>
              <View style={styles.metricIconBox}>
                <Ionicons name={metric.icon} size={19} color={colors.primary} />
              </View>
              <View style={styles.metricTitleBlock}>
                <Text style={styles.metricTitle}>{metric.label}</Text>
                <Text style={styles.metricHelper}>{metric.helper}</Text>
              </View>
            </View>
            <View style={styles.metricBucketList}>
              {metric.buckets.map((bucket) => (
                <View key={`${metric.label}-${bucket.label}`} style={styles.metricBucketRow}>
                  <Text style={styles.metricBucketLabel}>{bucket.label}</Text>
                  <View style={styles.metricBucketTrack}>
                    <View
                      style={[
                        styles.metricBucketFill,
                        { width: `${bucket.percent}%`, backgroundColor: bucket.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.metricBucketValue}>{bucket.count}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function getMoodCopy(course: Course, reviews: Review[]) {
  const text = `${course.difficulty} ${course.workload} ${course.attendance} ${reviews
    .map((review) => [
      review.content,
      ...(review.examKeywords ?? []),
      ...(review.recommendFor ?? []),
      ...(review.badges ?? []),
      ...(review.examTypes ?? []),
      ...(review.studyResources ?? []),
      ...(review.problemStyles ?? []),
      review.assignmentType,
      review.textbook,
      review.examInfo,
      review.examQuizInfo,
      review.examAssignmentInfo,
    ].join(' '))
    .join(' ')}`;

  if (reviews.length === 0 && (course.reviewCount ?? 0) === 0) {
    return {
      title: '아직 평가가 모이지 않았어요',
      summary: '첫 강의평이 등록되면 이 강의의 수업 흐름과 부담도를 더 정확히 보여드릴게요.',
    };
  }

  if (course.rating >= 4.5) {
    return {
      title: '부담은 있지만 남는 게 많아요',
      summary: '부담은 있지만 듣고 나면 남는 게 많다는 신호가 강해요.',
    };
  }

  if (text.includes('많') || text.includes('어렵') || text.toLowerCase().includes('hard')) {
    return {
      title: '준비가 필요한 강의예요',
      summary: '난이도와 준비량은 있지만 성실하게 따라가면 얻는 게 있는 강의예요.',
    };
  }

  if (course.type.includes('교양')) {
    return {
      title: '부담을 조절하기 좋아요',
      summary: '전공 밖 관심사를 넓히면서 부담을 조절하기 좋은 흐름이에요.',
    };
  }

  return {
    title: '전체 흐름을 보고 골라요',
    summary: '난이도, 과제, 출결을 함께 보고 판단하기 좋은 강의예요.',
  };
}

function getSignalRows(stats: CourseStats | null) {
  if (!stats) {
    return [];
  }

  return [
    { label: '난이도', value: stats.diffScore },
    { label: '학점', value: stats.gradScore },
    { label: '과제', value: stats.workScore },
    { label: '선수지식', value: stats.prerequisiteScore },
    { label: '내용 깊이', value: stats.depthScore },
    { label: '족보', value: stats.pastExamScore },
  ].filter((row): row is { label: string; value: number } => row.value !== null);
}

function getReportRows(course: Course, reviews: Review[], stats: CourseStats | null) {
  const statRows = getSignalRows(stats);
  const noReviews = reviews.length === 0 && (course.reviewCount ?? 0) === 0;

  if (!noReviews && statRows.length > 0) {
    return statRows.slice(0, 6).map((row) => ({
      label: row.label,
      status: getSignalStatus(row.label, row.value),
      icon: getSignalIcon(row.label),
      hint: getSignalHint(row.label, row.value),
    }));
  }

  const keywordGroups = getKeywordGroups(course, reviews);

  return [
    {
      label: '강의력',
      status: noReviews ? '평가 없음' : course.rating >= 4.2 ? '좋아요' : '무난해요',
      icon: 'school-outline' as keyof typeof Ionicons.glyphMap,
      hint: noReviews ? '아직 강의력 평가가 없어요' : course.rating >= 4.2 ? '강의 전달력에 좋은 반응이 보여요' : '후기를 함께 보고 판단해요',
    },
    {
      label: '난이도',
      status: getTextStatus(course.difficulty, noReviews ? '평가 없음' : '무난해요'),
      icon: 'flame-outline' as keyof typeof Ionicons.glyphMap,
      hint: getFieldHint('난이도', course.difficulty, noReviews),
    },
    {
      label: '과제',
      status: getTextStatus(course.workload, noReviews ? '평가 없음' : '무난해요'),
      icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
      hint: getFieldHint('과제', course.workload, noReviews),
    },
    {
      label: '출결',
      status: getTextStatus(course.attendance, noReviews ? '평가 없음' : '무난해요'),
      icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
      hint: getFieldHint('출결', course.attendance, noReviews),
    },
    {
      label: '학점',
      status: getTextStatus(course.grading, noReviews ? '평가 없음' : '무난해요'),
      icon: 'star-outline' as keyof typeof Ionicons.glyphMap,
      hint: getFieldHint('학점', course.grading, noReviews),
    },
    {
      label: '키워드',
      status: noReviews ? '평가 없음' : humanizeRawSignal(keywordGroups[0]?.text.split(' · ')[0] ?? '확인'),
      icon: 'chatbubble-ellipses-outline' as keyof typeof Ionicons.glyphMap,
      hint: noReviews ? '후기가 쌓이면 자주 나온 키워드를 보여줘요' : '후기에서 반복된 표현을 모았어요',
    },
  ];
}

function getMetricDistributions(course: Course, reviews: Review[], stats: CourseStats | null) {
  const metricDefs: Array<{
    label: string;
    helper: string;
    icon: keyof typeof Ionicons.glyphMap;
    score?: number | null;
    count?: number;
    values: Array<number | null | undefined>;
    fallback?: string;
    labels: [string, string, string];
    colors: [string, string, string];
    positiveHigh?: boolean;
  }> = [
    {
      label: '시험 난이도',
      helper: '시험 자체의 부담',
      icon: 'document-text-outline',
      score: stats?.diffScore,
      count: stats?.diffScoreCount,
      values: reviews.map((review) => review.diffScore),
      fallback: course.difficulty,
      labels: ['가벼움', '보통', '부담'],
      colors: ['#8CD4AE', '#9EC7FF', '#FFB27A'],
    },
    {
      label: '학점 체감',
      helper: '노력과 점수의 연결',
      icon: 'star-outline',
      score: stats?.gradScore,
      count: stats?.gradScoreCount,
      values: reviews.map((review) => review.gradScore),
      fallback: course.grading,
      labels: ['낮음', '보통', '좋음'],
      colors: ['#C9D2DE', '#9EC7FF', '#27A8FF'],
      positiveHigh: true,
    },
    {
      label: '과제 부담',
      helper: '빈도와 난이도',
      icon: 'folder-open-outline',
      score: stats?.workScore,
      count: stats?.workScoreCount,
      values: reviews.map((review) => review.workScore),
      fallback: course.workload,
      labels: ['적음', '보통', '많음'],
      colors: ['#8CD4AE', '#9EC7FF', '#FFB27A'],
    },
    {
      label: '선수지식',
      helper: '듣기 전 준비 필요도',
      icon: 'library-outline',
      score: stats?.prerequisiteScore,
      count: stats?.prerequisiteScoreCount,
      values: reviews.map((review) => review.prerequisiteScore),
      labels: ['낮음', '보통', '필요'],
      colors: ['#8CD4AE', '#9EC7FF', '#FFB27A'],
    },
    {
      label: '전공 심화도',
      helper: '입문과 심화 사이',
      icon: 'layers-outline',
      score: stats?.depthScore,
      count: stats?.depthScoreCount,
      values: reviews.map((review) => review.depthScore),
      labels: ['입문', '보통', '심화'],
      colors: ['#8CD4AE', '#9EC7FF', '#7B8CF0'],
    },
    {
      label: '족보 영향',
      helper: '기출·족보 참고 정도',
      icon: 'file-tray-full-outline',
      score: stats?.pastExamScore,
      count: stats?.pastExamScoreCount,
      values: reviews.map((review) => review.pastExamScore),
      labels: ['낮음', '참고', '중요'],
      colors: ['#C9D2DE', '#9EC7FF', '#27A8FF'],
    },
  ];

  return metricDefs.map((metric) => {
    const numericValues = metric.values.filter((value): value is number => typeof value === 'number');
    const fallbackBucket = metric.fallback ? classifyTextToBucket(metric.fallback) : null;
    const scoreBucket = typeof metric.score === 'number' ? classifyScoreToBucket(metric.score) : null;
    const buckets = [0, 0, 0];

    numericValues.forEach((value) => {
      buckets[classifyScoreToBucket(value)] += 1;
    });

    if (numericValues.length === 0) {
      const inferredBucket = scoreBucket ?? fallbackBucket;
      if (inferredBucket !== null) {
        buckets[inferredBucket] = Math.max(metric.count ?? 1, 1);
      }
    }

    const total = buckets.reduce((sum, count) => sum + count, 0);
    const scoreLabel = getMetricScoreLabel(metric.score, metric.fallback, metric.positiveHigh);

    return {
      label: metric.label,
      helper: metric.helper,
      icon: metric.icon,
      scoreLabel,
      buckets: metric.labels.map((label, index) => ({
        label,
        count: buckets[index],
        percent: total > 0 ? Math.max(5, Math.round((buckets[index] / total) * 100)) : 0,
        color: metric.colors[index],
      })),
    };
  });
}

function classifyScoreToBucket(score: number) {
  if (score >= 7) return 2;
  if (score >= 4) return 1;
  return 0;
}

function classifyTextToBucket(text: string) {
  const status = getTextStatus(text, '무난해요');
  if (status === '부담 있어요') return 2;
  if (status === '가벼워요') return 0;
  return 1;
}

function getMetricScoreLabel(score: number | null | undefined, fallback?: string, positiveHigh?: boolean) {
  if (typeof score === 'number') {
    const rounded = Math.round(score * 10) / 10;
    if (positiveHigh) {
      return rounded >= 7 ? '좋음' : rounded >= 4 ? '보통' : '낮음';
    }
    return `${rounded}/10`;
  }

  if (fallback) {
    return getTextStatus(fallback, '보통');
  }

  return '평가 없음';
}

function getTextStatus(text: string | undefined, fallback: string) {
  if (!text) return fallback;
  const normalized = text.toLowerCase();
  if (normalized === 'hard' || text.includes('많') || text.includes('어렵') || text.includes('엄격')) return '부담 있어요';
  if (normalized === 'easy' || text.includes('적') || text.includes('쉬') || text.includes('널널')) return '가벼워요';
  if (normalized === 'medium' || normalized === 'normal' || text.includes('보통')) return '무난해요';
  return humanizeRawSignal(text.length > 9 ? fallback : text);
}

function humanizeRawSignal(text: string | undefined) {
  if (!text) return '확인해요';
  if (text.includes('__INHA_EVAL_EXAM__')) {
    const parsed = parseLegacyExamInfo(text);
    return parsed.cleanText || '후기가 쌓이면 보여드려요';
  }
  const normalized = text.toLowerCase().trim();
  if (normalized === 'medium' || normalized === 'normal') return '무난해요';
  if (normalized === 'hard') return '부담 있어요';
  if (normalized === 'easy') return '가벼워요';
  return text;
}

function getFieldHint(label: string, rawValue: string | undefined, noReviews: boolean) {
  if (noReviews || !rawValue) {
    return `아직 ${label} 평가가 충분하지 않아요`;
  }

  const status = getTextStatus(rawValue, '무난해요');
  if (status === '부담 있어요') return `${label} 부담을 미리 확인하고 들어가면 좋아요`;
  if (status === '가벼워요') return `${label} 부담은 비교적 낮게 평가됐어요`;
  return `${label}은 전반적으로 무난하다는 평가예요`;
}

function getSignalIcon(label: string): keyof typeof Ionicons.glyphMap {
  if (label === '난이도') return 'flame-outline';
  if (label === '과제') return 'document-text-outline';
  if (label === '학점') return 'star-outline';
  if (label === '선수지식') return 'book-outline';
  if (label === '내용 깊이') return 'library-outline';
  return 'file-tray-full-outline';
}

function getSignalStatus(label: string, value: number) {
  if (label === '난이도' || label === '과제' || label === '선수지식') {
    if (value >= 7) return '부담 있어요';
    if (value >= 4) return '무난해요';
    return '가벼워요';
  }

  if (label === '족보') {
    if (value >= 7) return '중요';
    if (value >= 4) return '참고해요';
    return '낮음';
  }

  if (value >= 7) return '좋아요';
  if (value >= 4) return '무난해요';
  return '낮음';
}

function getSignalHint(label: string, value: number) {
  const status = getSignalStatus(label, value);

  if (label === '난이도') return status === '부담 있어요' ? '예습과 복습 시간을 잡아두세요' : '난이도 부담은 크지 않아요';
  if (label === '과제') return status === '부담 있어요' ? '과제량을 미리 감안하세요' : '과제 부담은 조절 가능한 편이에요';
  if (label === '학점') return status === '좋아요' ? '성실하면 점수 기대가 있어요' : '평가 방식을 확인해보세요';
  if (label === '선수지식') return status === '부담 있어요' ? '기초 개념을 먼저 점검하면 좋아요' : '선행 준비 부담은 낮은 편이에요';
  if (label === '내용 깊이') return status === '좋아요' ? '수업 내용이 충분히 남는다는 신호예요' : '학습 깊이를 후기와 함께 확인해요';
  return status === '중요' ? '시험 자료 흐름이 중요해 보여요' : '후기에서 시험 정보를 확인해보세요';
}

function getFitLabels(course: Course, reviews: Review[]) {
  const labels = reviews.flatMap((review) => review.recommendFor ?? []).filter(Boolean);

  if (labels.length > 0) {
    return [...new Set(labels)];
  }

  const normalized = `${course.attendance} ${course.workload} ${course.grading}`;

  if (course.type.includes('교양')) {
    return ['교양을 부담 없이 채우고 싶은 사람', '토론이나 과제를 감당할 수 있는 사람', '수업 분위기를 보고 고르는 사람'];
  }

  if (normalized.includes('많') || normalized.includes('엄격')) {
    return ['성실한 출석력을 가진 사람', '중간기말 대신 퀴즈로 대체하고 싶은 사람', '복습 루틴을 꾸준히 가져갈 사람'];
  }

  return ['전공 흐름을 차근차근 잡고 싶은 사람', '과제 부담을 미리 알고 준비하는 사람', '수강 전에 리뷰 맥락을 보는 사람'];
}

function getCautionLabels(course: Course) {
  const normalized = `${course.attendance} ${course.workload} ${course.difficulty} ${course.grading}`;

  if (normalized.includes('많') || normalized.includes('엄격')) {
    return ['자유로운 출결을 기대한다면 부담일 수 있어요', '과제 시간을 따로 빼기 어렵다면 다시 확인해요'];
  }

  if (course.type.includes('교양')) {
    return ['전공 심화 내용을 기대한다면 가벼울 수 있어요', '토론이나 발표가 부담이면 후기를 더 봐요'];
  }

  return ['빠르게 학점만 채우려면 맞지 않을 수 있어요', '시험 준비 시간을 거의 못 내면 부담일 수 있어요'];
}

function getCautionStudentLabels(course: Course, reviews: Review[]) {
  const labels = reviews.flatMap((review) => review.notRecommendFor ?? []).filter(Boolean);

  if (labels.length > 0) {
    return [...new Set(labels)];
  }

  return getCautionLabels(course);
}

function getKeywordGroups(course: Course, reviews: Review[]) {
  const methodKeywords = getKeywordsByTopic(reviews, ['설명', '자료', '실습', '이론', '진도', '복습', '강의력', 'PPT', '녹화']);
  const examKeywords = getKeywordsByTopic(reviews, ['족보', '시험', '암기', '응용', '예상', '공부량', '객관식', '서술형', '계산형', 'OX']);
  const workloadKeywords = getKeywordsByTopic(reviews, ['과제', '팀플', '발표', '보고서', '제출', '시간', '실무', '퀴즈']);
  const operationKeywords = getKeywordsByTopic(reviews, ['출석', '지각', '출결', '대리', '공지', '질문', '피드백', '자유', '열정', '소통', '엄격', '선수지식', '교재']);
  const noReviews = reviews.length === 0 && (course.reviewCount ?? 0) === 0;

  return [
    {
      title: '수업 방식',
      text: methodKeywords.slice(0, 2).join(' · ')
        || (noReviews ? '아직 수업 방식 평가가 없어요' : '설명과 자료 흐름을 후기로 확인해요'),
      icon: 'book-outline' as keyof typeof Ionicons.glyphMap,
    },
    {
      title: '시험',
      text: examKeywords.slice(0, 2).join(' · ')
        || (noReviews ? '아직 시험 평가가 없어요' : getNarrativeSignal('시험', course.difficulty)),
      icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
    },
    {
      title: '과제',
      text: workloadKeywords.slice(0, 2).join(' · ')
        || (noReviews ? '아직 과제 평가가 없어요' : getNarrativeSignal('과제', course.workload)),
      icon: 'folder-open-outline' as keyof typeof Ionicons.glyphMap,
    },
    {
      title: '출결 · 분위기',
      text: noReviews
        ? '후기가 쌓이면 운영 분위기를 알려드려요'
        : operationKeywords.slice(0, 2).join(' · ') || course.category || '수업 스타일을 함께 살펴보세요',
      icon: 'chatbubble-ellipses-outline' as keyof typeof Ionicons.glyphMap,
    },
  ];
}

function getStructuredReportSections(course: Course, reviews: Review[], stats: CourseStats | null) {
  const noReviews = reviews.length === 0 && (course.reviewCount ?? 0) === 0;
  const extendedReviews = reviews.map(getReviewExtendedInfo);
  const examTypes = getFrequentValues(reviews.flatMap((review) => review.examTypes ?? []));
  const problemStyles = getFrequentValues(extendedReviews.flatMap((review) => review.problemStyles ?? []));
  const studyResources = getFrequentValues(extendedReviews.flatMap((review) => review.studyResources ?? []));
  const badges = getFrequentValues(reviews.flatMap((review) => review.badges ?? []));
  const assignments = getFrequentValues(reviews.map((review) => review.assignmentType).filter(Boolean) as string[]);
  const textbooks = getFrequentValues(reviews.map((review) => review.textbook).filter(Boolean) as string[]);
  const quizInfo = getFrequentValues(reviews.map((review) => review.examQuizInfo).filter(Boolean) as string[]);
  const assignmentInfo = getFrequentValues(reviews.map((review) => review.examAssignmentInfo).filter(Boolean) as string[]);

  return [
    {
      title: '시험',
      meta: '난이도 · 방식 · 시험 정보',
      icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
      rows: [
        {
          label: '시험 난이도',
          value: stats?.diffScore != null ? getSignalStatus('난이도', stats.diffScore) : getTextStatus(course.difficulty, noReviews ? '평가 없음' : '무난해요'),
        },
        {
          label: '시험 방식',
          value: examTypes.slice(0, 3).join(' · ') || '아직 방식 정보가 없어요',
        },
        {
          label: '문제 성격',
          value: problemStyles.slice(0, 2).join(' · ') || getMostCommonText(extendedReviews.map((review) => review.cleanExamInfo), '후기가 쌓이면 보여드려요'),
        },
        {
          label: '족보 영향',
          value: stats?.pastExamScore != null ? getSignalStatus('족보', stats.pastExamScore) : getMostCommonText(extendedReviews.map((review) => review.pastExamHelpfulness), '아직 평가가 없어요'),
        },
      ],
    },
    {
      title: '수업',
      meta: '강의력 · 선수지식 · 전공 심화도',
      icon: 'school-outline' as keyof typeof Ionicons.glyphMap,
      rows: [
        {
          label: '강의력',
          value: course.rating >= 4.2 ? '좋아요' : noReviews ? '평가 없음' : '무난해요',
        },
        {
          label: '학습 자료',
          value: studyResources.slice(0, 3).join(' · ') || '아직 자료 정보가 없어요',
        },
        {
          label: '선수지식',
          value: stats?.prerequisiteScore != null ? getSignalStatus('선수지식', stats.prerequisiteScore) : getBadgeSignal(badges, '선수지식', '평가 없음'),
        },
        {
          label: '전공 심화도',
          value: stats?.depthScore != null ? getSignalStatus('내용 깊이', stats.depthScore) : getBadgeSignal(badges, '상위 전공', '평가 없음'),
        },
        {
          label: '교재 사용',
          value: textbooks.slice(0, 2).join(' · ') || '아직 교재 정보가 없어요',
        },
      ],
    },
    {
      title: '평가 방식',
      meta: '학점 · 과제 · 팀플 · 실습 · 퀴즈',
      icon: 'folder-open-outline' as keyof typeof Ionicons.glyphMap,
      rows: [
        {
          label: '학점 체감',
          value: stats?.gradScore != null ? getSignalStatus('학점', stats.gradScore) : getTextStatus(course.grading, noReviews ? '평가 없음' : '무난해요'),
        },
        {
          label: '과제 유형',
          value: assignments.slice(0, 2).join(' · ') || getTextStatus(course.workload, '정보 없음'),
        },
        {
          label: '과제 부담',
          value: stats?.workScore != null ? getSignalStatus('과제', stats.workScore) : getMostCommonText(assignmentInfo, '평가 없음'),
        },
        {
          label: '팀플/발표',
          value: getBadgePresence(badges, ['팀플 있음', '발표'], '팀플 정보 없음'),
        },
        {
          label: '실습',
          value: getBadgePresence(badges, ['실습 있음'], '실습 정보 없음'),
        },
        {
          label: '퀴즈',
          value: getBadgePresence(badges, ['퀴즈 있음'], quizInfo[0] ?? '퀴즈 정보 없음'),
        },
      ],
    },
  ];
}

function getFrequentValues(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([value]) => humanizeRawSignal(value));
}

function getMostCommonText(values: Array<string | undefined | null>, fallback: string) {
  return getFrequentValues(values.filter(Boolean) as string[])[0] ?? fallback;
}

function getBadgeSignal(badges: string[], fragment: string, fallback: string) {
  return badges.find((badge) => badge.includes(fragment)) ?? fallback;
}

function getBadgePresence(badges: string[], fragments: string[], fallback: string) {
  return badges.find((badge) => fragments.some((fragment) => badge.includes(fragment))) ?? fallback;
}

function parseLegacyExamInfo(value?: string | null) {
  if (!value || !value.includes('__INHA_EVAL_EXAM__')) {
    return { cleanText: value?.trim() ?? '' };
  }

  const [front, rawPayload = ''] = value.split('__INHA_EVAL_EXAM__:');
  const cleanText = front
    .replace(/[·\s]+$/g, '')
    .trim();

  try {
    const payload = JSON.parse(rawPayload.trim()) as Partial<Pick<Review,
      'pastExamHelpfulness'
      | 'scopePredictability'
      | 'studyResources'
      | 'problemStyles'
      | 'examPrepTip'
    >>;

    return {
      cleanText,
      pastExamHelpfulness: payload.pastExamHelpfulness,
      scopePredictability: payload.scopePredictability,
      studyResources: payload.studyResources,
      problemStyles: payload.problemStyles,
      examPrepTip: payload.examPrepTip,
    };
  } catch {
    return { cleanText };
  }
}

function getReviewExtendedInfo(review: Review) {
  const legacy = parseLegacyExamInfo(review.examInfo);

  return {
    cleanExamInfo: legacy.cleanText,
    pastExamHelpfulness: review.pastExamHelpfulness ?? legacy.pastExamHelpfulness,
    scopePredictability: review.scopePredictability ?? legacy.scopePredictability,
    studyResources: review.studyResources?.length ? review.studyResources : legacy.studyResources,
    problemStyles: review.problemStyles?.length ? review.problemStyles : legacy.problemStyles,
    examPrepTip: review.examPrepTip ?? legacy.examPrepTip,
  };
}

function getReviewKeywordSignals(review: Review) {
  const extended = getReviewExtendedInfo(review);

  return [
    ...(review.examKeywords ?? []),
    ...(review.badges ?? []),
    ...(review.examTypes ?? []),
    ...(extended.studyResources ?? []),
    ...(extended.problemStyles ?? []),
    review.assignmentType,
    review.textbook,
    extended.cleanExamInfo,
    review.examMidtermInfo,
    review.examFinalInfo,
    review.examAssignmentInfo,
    review.examQuizInfo,
    extended.pastExamHelpfulness ? `족보 영향 ${extended.pastExamHelpfulness}` : undefined,
    extended.scopePredictability ? `시험 범위 ${extended.scopePredictability}` : undefined,
  ].filter(Boolean) as string[];
}

function getKeywordsByTopic(reviews: Review[], fragments: string[]) {
  const values = reviews.flatMap(getReviewKeywordSignals);
  return [...new Set(
    values.filter((keyword) => fragments.some((fragment) => keyword.includes(fragment))),
  )];
}

function getChecklistItems(course: Course, reviews: Review[], stats: CourseStats | null) {
  const mood = getMoodCopy(course, reviews);
  const noReviews = reviews.length === 0 && (course.reviewCount ?? 0) === 0;
  const items = [
    getChecklistSignal('과제', course.workload, noReviews, stats?.workScore),
    getChecklistSignal('시험 난이도', course.difficulty, noReviews, stats?.diffScore),
    getChecklistSignal('출결', course.attendance, noReviews),
    getChecklistSignal('학점', course.grading, noReviews, stats?.gradScore, true),
  ].filter(Boolean) as string[];

  if (items.length > 0) {
    return [
      ...items,
      mood.title.includes('준비') ? '시험 준비 시간을 확보할 수 있나요?' : '',
    ].filter(Boolean);
  }

  if (noReviews) {
    return ['아직 체크할 만큼 충분한 평가가 없어요'];
  }

  return ['현재까지 특별히 튀는 체크 항목은 없어요'];
}

function mergeChecklistItems(cautions: string[], checklistItems: string[]) {
  const hasCaution = cautions.length > 0;
  const filteredChecklist = hasCaution
    ? checklistItems.filter((item) => !item.includes('특별히 튀는'))
    : checklistItems;

  return [...cautions, ...filteredChecklist];
}

function getNarrativeSignal(label: string, rawValue: string | undefined) {
  const status = getTextStatus(rawValue, '무난해요');
  if (status === '부담 있어요') return `${label} 부담이 있는 편이에요`;
  if (status === '가벼워요') return `${label} 부담은 가벼운 편이에요`;
  if (status === '평가 없음') return `아직 ${label} 평가가 없어요`;
  return `${label}은 무난하다는 평가예요`;
}

function getChecklistSignal(
  label: string,
  rawValue: string | undefined,
  noReviews = false,
  score?: number | null,
  positiveHigh = false,
) {
  if (noReviews) {
    return '';
  }

  if (typeof score === 'number') {
    if (positiveHigh) {
      if (score <= 3) return `${label} 체감이 낮게 평가됐어요`;
      return '';
    }

    if (score >= 7) return `${label} 부담이 높게 평가됐어요`;
    if (score <= 2) return `${label} 부담은 낮은 편이에요`;
    return '';
  }

  if (!rawValue) {
    return '';
  }

  const status = getTextStatus(rawValue, '평가 없음');
  if (status === '부담 있어요') return `${label} 부담이 있는 편이에요`;
  if (status === '가벼워요') return `${label} 부담은 낮은 편이에요`;
  return '';
}

function collectKeywords(course: Course, reviews: Review[]) {
  const keywords = new Set<string>();

  for (const review of reviews) {
    getReviewKeywordSignals(review).forEach((keyword) => keywords.add(keyword));
    review.recommendFor?.forEach((keyword) => keywords.add(keyword));
  }

  if (keywords.size === 0) {
    [course.workload, course.attendance, course.difficulty, course.grading, course.category, course.type]
      .filter(Boolean)
      .forEach((keyword) => keywords.add(keyword));
  }

  return [...keywords].slice(0, 8);
}

function getOneLineSummary(course: Course, reviews: Review[]) {
  const topReview = reviews.find((review) => review.oneLineTip?.trim()) ?? reviews[0];

  if (topReview?.oneLineTip) {
    return topReview.oneLineTip;
  }

  if (topReview?.content) {
    return topReview.content;
  }

  return getMoodCopy(course, reviews).summary;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stateSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.page,
  },
  pdpContent: {
    gap: 16,
    paddingBottom: 24,
  },
  reportHero: {
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 10,
  },
  reportEyebrow: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.18,
  },
  reportHeroTitle: {
    color: '#171A1F',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  reportHeroBody: {
    color: '#526071',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  reportHeroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  reportHeroMetaChip: {
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: '#EEF7FF',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportHeroMetaText: {
    color: '#253044',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  reportWriteButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  reportWriteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  metricPanel: {
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  metricPanelHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricPanelTitle: {
    color: '#171A1F',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  metricPanelSubtitle: {
    marginTop: 3,
    color: '#7A8797',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  metricCardList: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  metricCard: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  metricCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  metricIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EAF7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  metricTitle: {
    color: '#171A1F',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  metricHelper: {
    color: '#7A8797',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  metricBucketList: {
    gap: 7,
  },
  metricBucketRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricBucketLabel: {
    width: 42,
    color: '#657183',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  metricBucketTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEF3F7',
    overflow: 'hidden',
  },
  metricBucketFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricBucketValue: {
    width: 18,
    color: '#7A8797',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  reportSignalChip: {
    minHeight: 54,
    minWidth: '47%',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'space-between',
    gap: 4,
  },
  reportSection: {
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  reportSectionMeta: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  reportRowList: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  reportStructureList: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    gap: 0,
  },
  reportStructureBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    gap: 13,
  },
  reportStructureHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportQuestionList: {
    borderRadius: 10,
    backgroundColor: '#F6F9FC',
    overflow: 'hidden',
  },
  reportQuestionRow: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EEF4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  reportQuestionLabel: {
    width: 78,
    color: '#667386',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  reportQuestionValue: {
    flex: 1,
    color: '#171A1F',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'right',
    letterSpacing: -0.18,
  },
  audienceBlock: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EEF4',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  audienceChipPanel: {
    borderRadius: 10,
    backgroundColor: '#F5F8FB',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  recommendReportList: {
    borderRadius: 10,
    backgroundColor: '#F6F9FC',
    overflow: 'hidden',
  },
  recommendReportRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EEF4',
    gap: 9,
  },
  recommendReportLabel: {
    color: '#667386',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  recommendChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  recommendChip: {
    maxWidth: '100%',
    minHeight: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EDF5',
    paddingHorizontal: 11,
    justifyContent: 'center',
  },
  recommendChipCaution: {
    backgroundColor: '#FFF4F6',
    borderWidth: 1,
    borderColor: '#FFE0E6',
  },
  recommendChipText: {
    color: '#344154',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.18,
  },
  recommendChipTextCaution: {
    color: '#D96A7B',
  },
  recommendMoreChip: {
    backgroundColor: '#EEF3F7',
  },
  recommendMoreText: {
    color: '#7A8797',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  reportRow: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EAF7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  reportRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reportRowTitle: {
    color: '#171A1F',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: -0.25,
  },
  reportRowStatus: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.18,
  },
  reportRowHint: {
    color: '#7A8797',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.16,
  },
  reportSummaryPanel: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF4',
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 17,
    gap: 10,
  },
  reportKeywordEmpty: {
    color: '#7C8898',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  reportChecklist: {
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 16,
    gap: 10,
  },
  coveringControlBand: {
    backgroundColor: '#EEF3F7',
    paddingHorizontal: 19,
    paddingTop: 9,
    paddingBottom: 9,
  },
  coveringDropdown: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coveringDropdownText: {
    color: '#171A1F',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  coveringWhiteBreak: {
    height: 14,
    backgroundColor: '#FFFFFF',
  },
  coveringTabs: {
    marginHorizontal: 19,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E8EEF3',
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  coveringTab: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coveringTabActive: {
    backgroundColor: '#FFFFFF',
  },
  coveringTabText: {
    color: '#9AA5B3',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  coveringTabTextActive: {
    color: '#3B4654',
  },
  coveringHeroBand: {
    minHeight: 126,
    backgroundColor: '#E8EEF3',
    paddingHorizontal: 19,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coveringHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  coveringHeroMeta: {
    color: '#4F5B6B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  coveringHeroTitle: {
    marginTop: 6,
    color: '#171A1F',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  coveringInstruction: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 19,
    paddingTop: 42,
    paddingBottom: 18,
  },
  coveringInstructionTitle: {
    color: '#171A1F',
    fontSize: 25,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  coveringInstructionAccent: {
    color: colors.primary,
  },
  coveringMetricPair: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 19,
    paddingBottom: 42,
    flexDirection: 'row',
    gap: 8,
  },
  coveringMetricCard: {
    flex: 1,
    minHeight: 186,
    borderRadius: 14,
    backgroundColor: '#EEF3F7',
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  coveringMetricTitle: {
    color: '#3B4654',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  coveringMetricValue: {
    marginTop: 5,
    color: '#4F5B6B',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.25,
  },
  coveringMetricBadge: {
    marginTop: 'auto',
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  coveringMetricBadgeSoft: {
    backgroundColor: '#BDE8FF',
  },
  coveringMetricBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  coveringMetricBadgeTextSoft: {
    color: colors.primary,
  },
  pdpHeroCard: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 13,
    alignItems: 'center',
  },
  pdpGreeting: {
    alignSelf: 'stretch',
    color: '#6E7A88',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  pdpTitle: {
    alignSelf: 'stretch',
    marginTop: 5,
    color: '#171A1F',
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.55,
  },
  pdpTitleAccent: {
    color: colors.primary,
  },
  pdpPrimaryButton: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pdpPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  pdpGuideLink: {
    marginTop: 12,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pdpGuideText: {
    color: '#6E7A88',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pdpInfoRow: {
    marginHorizontal: 20,
    marginTop: 18,
    minHeight: 64,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  pdpInfoIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdpInfoCopy: {
    flex: 1,
    minWidth: 0,
  },
  pdpInfoTitle: {
    color: '#171A1F',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  pdpInfoMeta: {
    marginTop: 3,
    color: '#8B97A5',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  pdpSectionHeader: {
    marginTop: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pdpSectionTitle: {
    color: '#5E6B79',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  pdpSectionCount: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pdpReportRail: {
    paddingHorizontal: 20,
    gap: 10,
  },
  pdpReportCard: {
    width: 116,
    minHeight: 112,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 13,
    justifyContent: 'space-between',
  },
  pdpReportIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EAF7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdpReportLabel: {
    color: '#6E7A88',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pdpReportStatus: {
    color: '#171A1F',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  guideReportIntro: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 38,
    paddingBottom: 24,
    gap: 7,
  },
  guideReportTitle: {
    color: '#171A1F',
    fontSize: 23,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  guideReportDesc: {
    color: '#4F5B6B',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  guideReportList: {
    marginHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAF0',
    overflow: 'hidden',
  },
  guideReportListHeader: {
    minHeight: 62,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EEF3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  guideReportListTitle: {
    color: '#171A1F',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  guideReportListMeta: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  guideReportRow: {
    minHeight: 82,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  guideReportIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#EAF7FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  guideReportCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  guideReportRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  guideReportRowTitle: {
    flexShrink: 0,
    color: '#171A1F',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  guideReportStatus: {
    flexShrink: 1,
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'right',
    letterSpacing: -0.25,
  },
  guideReportRowText: {
    color: '#7C8898',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: -0.18,
  },
  guideReportSummaryBand: {
    backgroundColor: '#EEF3F7',
    marginTop: 26,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 28,
    gap: 10,
  },
  guideReportSummaryTitle: {
    color: '#171A1F',
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.45,
  },
  guideReportSummaryBody: {
    color: '#4F5B6B',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  guideReportKeywordWrap: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  guideReportKeywordChip: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    color: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  guideReportEmptyKeyword: {
    minHeight: 38,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    color: '#7A8592',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  guideReportDetail: {
    backgroundColor: '#FFFFFF',
    paddingTop: 34,
    paddingBottom: 12,
  },
  guideReportDetailHeader: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  guideReportDetailTitle: {
    color: '#171A1F',
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.45,
  },
  guideReportDetailMeta: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  guideReportDetailRow: {
    minHeight: 88,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  guideFitBlock: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 12,
  },
  guideFitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  guideFitTitle: {
    color: '#171A1F',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  guideFitMeta: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  guideFitRow: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#F4F8FC',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guideFitText: {
    flex: 1,
    color: '#344154',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.22,
  },
  reportSectionHeader: {
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportSectionTitle: {
    color: '#171A1F',
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: -0.55,
  },
  reportSectionCaption: {
    color: '#7C8898',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  reportSummaryCard: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF4',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 10,
  },
  reportSummaryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#EAF7FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reportSummaryBadgeText: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: -0.15,
  },
  reportSummaryTitle: {
    color: '#171A1F',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: -0.45,
  },
  reportSummaryBody: {
    color: '#566374',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  reportSignalStrip: {
    marginHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportSignalPill: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: '#F4F8FC',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportSignalLabel: {
    color: '#7D8898',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  reportSignalValue: {
    color: '#171A1F',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  reportPanel: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF4',
    overflow: 'hidden',
  },
  reportPanelHeader: {
    minHeight: 60,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reportPanelTitle: {
    color: '#171A1F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  reportPanelMeta: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  reportInsightList: {
    backgroundColor: '#FFFFFF',
  },
  reportInsightRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  reportInsightIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#EAF7FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reportInsightCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  reportInsightTitle: {
    color: '#171A1F',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  reportInsightText: {
    color: '#7C8898',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  reportKeywordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reportKeywordChip: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#EAF7FF',
    color: colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  reportKeywordMoreChip: {
    backgroundColor: '#EEF3F7',
    color: '#7A8797',
  },
  fitPanel: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF4',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 13,
  },
  fitPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fitPanelTitle: {
    color: '#171A1F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  fitPanelMeta: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  fitList: {
    gap: 9,
  },
  fitRow: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#F4F8FC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
  },
  fitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  fitText: {
    flex: 1,
    color: '#344154',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pdpQuoteCard: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#EAF7FF',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  pdpQuoteMark: {
    color: colors.primary,
    fontSize: 27,
    lineHeight: 24,
    fontWeight: '800',
  },
  pdpQuoteText: {
    marginTop: 8,
    color: '#253044',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  pdpQuoteMeta: {
    marginTop: 10,
    color: '#8B97A5',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  pdpDecisionCard: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 10,
  },
  pdpDecisionTitle: {
    color: '#171A1F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  pdpDecisionRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  pdpDecisionCheck: {
    width: 25,
    height: 25,
    borderRadius: 7,
    backgroundColor: '#EAF7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdpDecisionCaution: {
    width: 25,
    height: 25,
    borderRadius: 7,
    backgroundColor: '#F2F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdpDecisionText: {
    flex: 1,
    color: '#253044',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  coveringWarningTitleBlock: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 19,
    paddingTop: 42,
    paddingBottom: 20,
  },
  coveringWarningTitle: {
    color: '#171A1F',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  coveringWarningSub: {
    marginTop: 5,
    color: '#FF3B5F',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  coveringWarningList: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 19,
    paddingBottom: 34,
    gap: 12,
  },
  coveringWarningCard: {
    minHeight: 86,
    borderRadius: 16,
    backgroundColor: '#EEF3F7',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  coveringWarningCardHot: {
    backgroundColor: '#FFF0F3',
  },
  coveringWarningIcon: {
    width: 38,
    alignItems: 'center',
  },
  coveringWarningCopy: {
    flex: 1,
    minWidth: 0,
  },
  coveringWarningLabel: {
    color: '#7A8592',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  coveringWarningLabelHot: {
    color: '#FF3B5F',
  },
  coveringWarningText: {
    marginTop: 3,
    color: '#3B4654',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.45,
  },
  coveringReportExample: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 19,
    paddingTop: 42,
    paddingBottom: 32,
  },
  coveringReportTitle: {
    color: '#171A1F',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  coveringReportDesc: {
    marginTop: 4,
    color: '#4F5B6B',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  coveringReportCard: {
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAF0',
    paddingHorizontal: 22,
    paddingVertical: 20,
    gap: 14,
  },
  coveringReportLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  coveringReportLineLabel: {
    color: '#6E7A88',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  coveringReportLineValue: {
    color: '#171A1F',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  coveringReportDivider: {
    height: 1,
    backgroundColor: '#E4EAF0',
    marginVertical: 4,
  },
  coveringReportTotal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  coveringReportTotalLabel: {
    color: '#6E7A88',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  coveringReportTotalValue: {
    flex: 1,
    color: colors.primary,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'right',
    letterSpacing: -0.45,
  },
  pdpKeywordGroup: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  pdpKeywordRow: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  pdpKeywordIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EAF7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdpKeywordCopy: {
    flex: 1,
    minWidth: 0,
  },
  pdpKeywordTitle: {
    color: '#171A1F',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  pdpKeywordText: {
    marginTop: 3,
    color: '#8B97A5',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  pdpGuideBox: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 10,
  },
  pdpGuideBoxTitle: {
    color: '#171A1F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  pdpGuideBoxRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  pdpGuideDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  pdpGuideBoxText: {
    flex: 1,
    color: '#253044',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pdpNoticeBox: {
    marginHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#EAF7FF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  pdpNoticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdpNoticeCopy: {
    flex: 1,
    minWidth: 0,
  },
  pdpNoticeTitle: {
    color: '#171A1F',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  pdpNoticeText: {
    marginTop: 4,
    color: '#667483',
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  screen: {
    flex: 1,
    gap: 12,
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 2,
  },
  topTitle: {
    color: '#111318',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  topSubtitle: {
    color: '#9AA5B3',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButtonActive: {
    backgroundColor: '#EAF7FF',
    borderColor: '#BDE8FF',
  },
  sectionSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sectionSheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.46)',
  },
  sectionSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionSheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D5DCE5',
    marginBottom: 18,
  },
  sectionSheetTitle: {
    color: '#171A1F',
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.45,
  },
  sectionSheetDesc: {
    marginTop: 6,
    color: '#8B97A5',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionOptionList: {
    marginTop: 18,
    gap: 9,
  },
  sectionOption: {
    minHeight: 74,
    borderRadius: 10,
    backgroundColor: '#F5F8FB',
    borderWidth: 1,
    borderColor: '#E7EDF4',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionOptionActive: {
    backgroundColor: '#EAF7FF',
    borderColor: colors.primary,
  },
  sectionOptionLeft: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  sectionOptionTitle: {
    color: '#171A1F',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: -0.35,
  },
  sectionOptionMeta: {
    color: '#6E7A88',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionCheck: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E7EDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCheckActive: {
    backgroundColor: colors.primary,
  },
  cardRail: {
    gap: 16,
    alignItems: 'center',
  },
  slideFrame: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  slidePaper: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 0,
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 24,
  },
  slideHeader: {
    gap: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  slideTitle: {
    color: '#111318',
    fontSize: 23,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.55,
  },
  hairline: {
    height: 1,
    backgroundColor: '#eef1f6',
    marginTop: 26,
    marginBottom: 26,
  },
  slideBody: {
    flex: 1,
  },
  slideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerMeta: {
    flex: 1,
    color: '#9AA5B3',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '500',
  },
  footerRating: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
  },
  summaryContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  summaryTop: {
    minHeight: 170,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  summaryKicker: {
    color: '#9AA5B3',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  courseInfoIllustration: {
    width: 112,
    height: 104,
    position: 'relative',
  },
  courseInfoShadow: {
    position: 'absolute',
    left: 8,
    right: 7,
    bottom: 12,
    height: 14,
    borderRadius: 8,
    backgroundColor: '#C9D2DD',
  },
  courseInfoPaperBack: {
    position: 'absolute',
    right: 13,
    top: 26,
    width: 49,
    height: 58,
    borderRadius: 9,
    backgroundColor: '#D9E3ED',
    transform: [{ rotate: '13deg' }],
  },
  courseInfoPaper: {
    position: 'absolute',
    left: 20,
    top: 15,
    width: 62,
    height: 76,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingTop: 17,
    gap: 8,
  },
  courseInfoLineStrong: {
    width: 34,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#647487',
  },
  courseInfoLine: {
    width: 42,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B8C5D3',
  },
  courseInfoLineShort: {
    width: 26,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DDE6F0',
  },
  courseInfoBadge: {
    position: 'absolute',
    right: 15,
    top: 12,
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconWrap: {
    width: 70,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricStarBase: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#DDE6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricSmallBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  metricSmallBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
  },
  metricChatBase: {
    width: 58,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#B8C5D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricChatDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EAF7FF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  bigRating: {
    fontSize: 62,
    lineHeight: 68,
    fontWeight: '800',
    letterSpacing: -2.2,
  },
  ratingMax: {
    color: '#9AA5B3',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  quoteBox: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 19,
    gap: 7,
  },
  quoteGlyph: {
    fontSize: 28,
    lineHeight: 26,
    fontWeight: '700',
  },
  quoteBoxText: {
    color: '#253044',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
    letterSpacing: -0.45,
  },
  reportContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 14,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reportTile: {
    width: '48%',
    minHeight: 86,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    paddingHorizontal: 11,
    paddingVertical: 11,
    justifyContent: 'space-between',
  },
  reportIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTileCopy: {
    gap: 2,
  },
  reportLabel: {
    color: '#111318',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  reportStatus: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  reportNote: {
    minHeight: 58,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  reportNoteMark: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  reportNoteText: {
    flex: 1,
    color: '#667483',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  decisionContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 12,
  },
  decisionSection: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 8,
  },
  decisionTitle: {
    color: '#647487',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  decisionRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  decisionIcon: {
    width: 25,
    height: 25,
    borderRadius: 7,
    borderWidth: 0,
    backgroundColor: '#F2F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionText: {
    flex: 1,
    color: '#111318',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  decisionFooter: {
    minHeight: 56,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  decisionFooterText: {
    flex: 1,
    color: '#253044',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  keywordContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  keywordGroupList: {
    gap: 10,
  },
  keywordGroup: {
    minHeight: 68,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  keywordGroupIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keywordGroupCopy: {
    flex: 1,
    minWidth: 0,
  },
  keywordGroupTitle: {
    color: '#111318',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  keywordGroupText: {
    marginTop: 4,
    color: '#7B8795',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  keywordChip: {
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  keywordText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  keywordSource: {
    minHeight: 78,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  keywordSourceText: {
    flex: 1,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: -0.35,
  },
  checkContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
  },
  checkRow: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF1F4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    flex: 1,
    color: '#111318',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  finalNoteBox: {
    minHeight: 92,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  finalNoteMark: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
  },
  finalNoteText: {
    flex: 1,
    color: '#253044',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  pagination: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
  },
  ctaButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
  },
});
