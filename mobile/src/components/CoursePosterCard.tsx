import { StyleSheet, Text, View } from 'react-native';
import { Course } from '../types/models';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { PressableScale } from './ui';

type Variant = 'hero' | 'tall' | 'medium' | 'compact';
type ScopeKind = 'general' | 'major' | 'other';
type MoodKey = 'easy' | 'heavy' | 'strict' | 'hard' | 'practical' | 'balanced';

const HEIGHTS: Record<Variant, number> = {
  hero: 116,
  tall: 110,
  medium: 104,
  compact: 92,
};

const SCOPE_META: Record<ScopeKind, { label: string; color: string; background: string }> = {
  general: { label: '교양', color: '#226d68', background: '#e6f6ef' },
  major: { label: '전공필수', color: '#d96816', background: '#fff1e6' },
  other: { label: '전공선택', color: '#6f7c8c', background: '#f1f4f7' },
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
  const creditsLabel = course.credits ? `${course.credits}학점` : course.type || '강의';
  const reviewCount = course.reviewCount || 0;
  const moodTags = getMoodTags(course, mood, reviewCount);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${course.name}, ${course.professor}, 평점 ${course.rating.toFixed(1)}`}
      style={[
        styles.card,
        { minHeight: HEIGHTS[variant] },
      ]}
      onPress={onPress}
    >
      <View style={styles.courseContent}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: scopeMeta.background }]}>
              <Text style={[styles.badgeText, { color: scopeMeta.color }]} numberOfLines={1}>
                {scopeMeta.label}
              </Text>
            </View>
            {reviewCount > 0 ? (
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewBadgeText}>후기 {reviewCount}+</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.ratingWrap}>
            <Text style={styles.starText}>★</Text>
            <Text style={styles.ratingText}>{course.rating.toFixed(1)}</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.courseTitle} numberOfLines={2}>
            {course.name}
          </Text>
          <Text style={styles.professorText} numberOfLines={1}>
            {course.professor} 교수 · {course.department}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {moodTags.map((tag) => (
            <View key={tag} style={styles.metaPill}>
              <Text style={styles.metaPillText} numberOfLines={1}>{tag}</Text>
            </View>
          ))}
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText} numberOfLines={1}>{creditsLabel}</Text>
          </View>
        </View>
      </View>

    </PressableScale>
  );
}

function getMoodTags(course: Course, mood: MoodKey, reviewCount: number) {
  const tags = new Set<string>();
  const moodMeta = MOOD_META[mood];

  if (reviewCount > 80) {
    tags.add('후기 많음');
  }

  tags.add(moodMeta.label);

  const text = `${course.difficulty} ${course.workload} ${course.attendance} ${course.grading}`.toLowerCase();
  if (text.includes('시험') || text.includes('exam')) {
    tags.add('시험 체크');
  } else if (text.includes('과제') || text.includes('assignment')) {
    tags.add('과제 체크');
  } else if (text.includes('실습') || text.includes('practice')) {
    tags.add('실습 위주');
  }

  return Array.from(tags).slice(0, 3);
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


const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.radius,
    paddingVertical: 14,
    paddingHorizontal: spacing.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  courseContent: {
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  badgeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  reviewBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: colors.primarySoft,
  },
  reviewBadgeText: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starText: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  titleBlock: {
    gap: 4,
  },
  courseTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  ratingText: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  professorText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.fill,
  },
  metaPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
