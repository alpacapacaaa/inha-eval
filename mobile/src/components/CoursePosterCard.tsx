import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Course } from '../types/models';

type Variant = 'hero' | 'tall' | 'medium' | 'compact';
type ScopeKind = 'general' | 'major' | 'other';
type MoodKey = 'easy' | 'heavy' | 'strict' | 'hard' | 'practical' | 'balanced';

const HEIGHTS: Record<Variant, number> = {
  hero: 96,
  tall: 92,
  medium: 88,
  compact: 82,
};

const SCOPE_META: Record<ScopeKind, { label: string; color: string }> = {
  general: { label: '교양', color: '#226d68' },
  major: { label: '내 전공', color: '#d84f41' },
  other: { label: '타전공', color: '#16499a' },
};

const MOOD_META: Record<MoodKey, { label: string; note: string }> = {
  easy: { label: '부담 낮음', note: '가볍게 담아보기 좋은 강의' },
  heavy: { label: '과제 주의', note: '시간을 확보하고 들어가야 하는 강의' },
  strict: { label: '출결 중요', note: '성실하게 따라가야 안정적인 강의' },
  hard: { label: '난이도 있음', note: '수강 전 리뷰 맥락을 확인할 강의' },
  practical: { label: '실습 중심', note: '결과물이 남는 경험형 강의' },
  balanced: { label: '균형형', note: '무난하게 비교해볼 만한 강의' },
};

interface Props {
  course: Course;
  variant?: Variant;
  index?: number;
  onPress: () => void;
  preview?: string;
  userDepartment?: string;
}

export function CoursePosterCard({
  course,
  variant = 'medium',
  index = 0,
  onPress,
  preview,
  userDepartment,
}: Props) {
  const scope = getCourseScope(course, userDepartment);
  const scopeMeta = SCOPE_META[scope];
  const mood = getCourseMood(course, preview);
  const moodMeta = MOOD_META[mood];
  const bg = index % 3 === 0 ? '#f7f2e8' : index % 3 === 1 ? '#eef5ef' : '#edf3fb';
  const creditsLabel = course.credits ? `${course.credits}학점` : course.type || '강의';
  const reviewCount = course.reviewCount || 0;
  const displayIndex = String(index + 1).padStart(2, '0');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${course.name}, ${course.professor}, 평점 ${course.rating.toFixed(1)}`}
      style={({ pressed }) => [
        styles.card,
        { minHeight: HEIGHTS[variant] },
        pressed ? styles.cardPressed : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.courseThumb, { backgroundColor: bg }]}>
        <View style={[styles.thumbAccent, { backgroundColor: scopeMeta.color }]} />
        <Text style={styles.thumbIndex}>{displayIndex}</Text>
      </View>

      <View style={styles.courseContent}>
        <View style={styles.courseTitleRow}>
          <Text style={styles.courseTitle} numberOfLines={1}>
            {course.name}
          </Text>
          <Text style={styles.ratingText}>{course.rating.toFixed(1)}</Text>
        </View>

        <Text style={styles.professorText} numberOfLines={1}>
          {course.professor} · {course.department}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.scopeDot, { backgroundColor: scopeMeta.color }]} />
          <Text style={[styles.scopeText, { color: scopeMeta.color }]} numberOfLines={1}>
            {scopeMeta.label}
          </Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {creditsLabel}
          </Text>
          <Text style={styles.metaText} numberOfLines={1}>
            리뷰 {reviewCount}
          </Text>
          <Text style={styles.moodText} numberOfLines={1}>
            {moodMeta.label}
          </Text>
        </View>
      </View>

      <Text style={styles.moreText}>⋮</Text>
    </Pressable>
  );
}

function getCourseMood(course: Course, preview?: string): MoodKey {
  const text = `${course.difficulty} ${course.workload} ${course.attendance} ${course.grading} ${course.type} ${course.category} ${preview ?? ''}`.toLowerCase();

  if (text.includes('실습') || text.includes('practice') || text.includes('project')) {
    return 'practical';
  }
  if (text.includes('출결') || text.includes('엄격') || text.includes('strict')) {
    return 'strict';
  }
  if (text.includes('과제') || text.includes('많') || text.includes('heavy')) {
    return 'heavy';
  }
  if (text.includes('어려') || text.includes('hard') || text.includes('높')) {
    return 'hard';
  }
  if (text.includes('쉬') || text.includes('부담') || text.includes('easy') || course.rating >= 4.3) {
    return 'easy';
  }
  return 'balanced';
}

function getCourseScope(course: Course, userDepartment?: string): ScopeKind {
  if (course.type.includes('교양') || course.department.includes('교양')) {
    return 'general';
  }
  if (userDepartment && course.department === userDepartment) {
    return 'major';
  }
  return 'other';
}

function normalizePreview(preview: string) {
  const trimmed = preview.trim().replace(/\s+/g, ' ');
  return trimmed.length > 46 ? `${trimmed.slice(0, 46)}...` : trimmed;
}

function getEditorialNote(course: Course, mood: MoodKey, preview?: string) {
  if (preview?.trim()) {
    return normalizePreview(preview);
  }

  switch (mood) {
    case 'easy':
      return '수강 부담을 낮추고 싶은 날 먼저 열어볼 만한 강의입니다.';
    case 'heavy':
      return '과제와 준비 시간을 미리 계산하고 고르면 만족도가 높아집니다.';
    case 'strict':
      return '출결과 운영 방식이 선택의 핵심이 되는 강의입니다.';
    case 'hard':
      return '난이도보다 수업 흐름과 평가 방식을 먼저 확인해보세요.';
    case 'practical':
      return '수업 후 남는 결과물과 실습 경험을 기대할 수 있습니다.';
    default:
      return `${course.department}에서 많이 비교되는 균형형 수강 후보입니다.`;
  }
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(18,24,38,0.055)',
  },
  cardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.992 }],
  },
  courseThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.76)',
  },
  thumbAccent: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    right: -12,
    bottom: -10,
    opacity: 0.22,
  },
  thumbIndex: {
    color: 'rgba(18,24,38,0.62)',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  courseContent: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  courseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  courseTitle: {
    flex: 1,
    color: '#121826',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  ratingText: {
    color: '#121826',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  professorText: {
    color: '#65738a',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  scopeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scopeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
  metaText: {
    color: '#65738a',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  moodText: {
    color: '#8d96a6',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  moreText: {
    color: 'rgba(18,24,38,0.38)',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
    paddingLeft: 2,
  },
});
