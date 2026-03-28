import { formatPeriodRange, TimetableSlot } from '../data/timetableData';
import { Course } from '../types/types';
import { CURRENT_SEMESTER_SHORT_LABEL, normalizeSemesterShortLabel } from './semester';
import { getCourseSlots } from './timetableSlots';

export type CourseSectionOption = {
  id: string;
  sectionLabel: string;
  isOpenCurrent: boolean;
  semesterLabel: string;
  slots: TimetableSlot[];
  timeSummary: string | null;
  course: Course;
};

export type CourseProfessorGroup = {
  id: string;
  subjectKey: string;
  name: string;
  professor: string;
  department: string;
  category: Course['category'];
  type: string;
  primaryCourse: Course;
  courses: Course[];
  sections: CourseSectionOption[];
  isOpenCurrent: boolean;
  reviewCount: number;
  rating: number;
  difficulty: Course['difficulty'];
  workload: Course['workload'];
};

const compareCourseSection = (a: Course, b: Course) => {
  const openDiff = Number(isCourseOpenCurrent(b)) - Number(isCourseOpenCurrent(a));
  if (openDiff !== 0) {
    return openDiff;
  }

  return (a.section ?? '').localeCompare(b.section ?? '', 'ko');
};

const getWeightedRating = (courses: Course[]) => {
  const totalReviews = courses.reduce((sum, course) => sum + course.reviewCount, 0);
  if (totalReviews > 0) {
    const weightedTotal = courses.reduce((sum, course) => sum + course.rating * course.reviewCount, 0);
    return weightedTotal / totalReviews;
  }

  const validRatings = courses.map((course) => course.rating).filter((rating) => rating > 0);
  if (validRatings.length === 0) {
    return 0;
  }

  return validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
};

export const isCourseOpenCurrent = (course: Course) =>
  normalizeSemesterShortLabel(course.semester) === CURRENT_SEMESTER_SHORT_LABEL;

export const getCourseProfessorGroupId = (course: Pick<Course, 'name' | 'professor' | 'department'>) =>
  `group:${course.name}::${course.professor}::${course.department}`;

export const getSubjectGroupKey = (course: Pick<Course, 'name' | 'department' | 'category'>) =>
  `${course.name}::${course.department}::${course.category}`;

const formatTimeSummary = (slots: TimetableSlot[]) => {
  if (slots.length === 0) {
    return null;
  }

  return slots
    .map((slot) =>
      slot.day === '웹강의'
        ? slot.location ?? '셀0(웹강의)'
        : `${slot.day} ${formatPeriodRange(slot.startPeriod, slot.endPeriod)}`
    )
    .join(' · ');
};

export const groupCoursesByProfessor = (
  courses: Course[],
  slotsByCourseId: Record<string, TimetableSlot[]> = {},
): CourseProfessorGroup[] => {
  const groups = new Map<string, Course[]>();

  for (const course of courses) {
    const groupId = getCourseProfessorGroupId(course);
    const existing = groups.get(groupId);

    if (existing) {
      existing.push(course);
      continue;
    }

    groups.set(groupId, [course]);
  }

  return [...groups.entries()]
    .map(([id, groupedCourses]) => {
      const coursesByPriority = [...groupedCourses].sort((a, b) => {
        const openDiff = Number(isCourseOpenCurrent(b)) - Number(isCourseOpenCurrent(a));
        if (openDiff !== 0) {
          return openDiff;
        }

        const reviewDiff = b.reviewCount - a.reviewCount;
        if (reviewDiff !== 0) {
          return reviewDiff;
        }

        return b.rating - a.rating;
      });

      const primaryCourse = coursesByPriority[0];
      const sections = [...groupedCourses]
        .sort(compareCourseSection)
        .map((course) => {
          const slots = slotsByCourseId[course.id] ?? getCourseSlots(course);

          return {
            id: course.id,
            sectionLabel: course.section ? `${course.section}분반` : '분반 정보 없음',
            isOpenCurrent: isCourseOpenCurrent(course),
            semesterLabel: normalizeSemesterShortLabel(course.semester) || course.semester || '학기 정보 없음',
            slots,
            timeSummary: formatTimeSummary(slots),
            course,
          };
        });

      return {
        id,
        subjectKey: getSubjectGroupKey(primaryCourse),
        name: primaryCourse.name,
        professor: primaryCourse.professor,
        department: primaryCourse.department,
        category: primaryCourse.category,
        type: primaryCourse.type,
        primaryCourse,
        courses: [...groupedCourses].sort(compareCourseSection),
        sections,
        isOpenCurrent: groupedCourses.some(isCourseOpenCurrent),
        reviewCount: groupedCourses.reduce((sum, course) => sum + course.reviewCount, 0),
        rating: getWeightedRating(groupedCourses),
        difficulty: primaryCourse.difficulty,
        workload: primaryCourse.workload,
      } satisfies CourseProfessorGroup;
    })
    .sort((a, b) => {
      if (a.isOpenCurrent !== b.isOpenCurrent) {
        return a.isOpenCurrent ? -1 : 1;
      }

      const nameDiff = a.name.localeCompare(b.name, 'ko');
      if (nameDiff !== 0) {
        return nameDiff;
      }

      return a.professor.localeCompare(b.professor, 'ko');
    });
};

export const findCourseProfessorGroup = (
  courses: Course[],
  routeParam: string,
  slotsByCourseId: Record<string, TimetableSlot[]> = {},
) => {
  const decodedParam = (() => {
    try {
      return decodeURIComponent(routeParam);
    } catch {
      return routeParam;
    }
  })();

  const matchedCourse = courses.find((course) => course.id === decodedParam);
  if (matchedCourse) {
    return groupCoursesByProfessor(
      courses.filter((course) => getCourseProfessorGroupId(course) === getCourseProfessorGroupId(matchedCourse)),
      slotsByCourseId,
    )[0] ?? null;
  }

  return groupCoursesByProfessor(courses, slotsByCourseId).find((group) => group.id === decodedParam) ?? null;
};

export const findGroupSelectionInCart = (cartIds: string[], group: CourseProfessorGroup) =>
  group.sections.find((section) => cartIds.includes(section.id)) ?? null;

export const replaceGroupSelectionInCart = (
  cartIds: string[],
  group: CourseProfessorGroup,
  nextCourseId: string,
) => {
  const idsInGroup = new Set(group.courses.map((course) => course.id));
  return [...cartIds.filter((courseId) => !idsInGroup.has(courseId)), nextCourseId];
};
