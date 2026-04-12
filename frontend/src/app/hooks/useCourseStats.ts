import { useMemo } from 'react';
import { Course, Review } from '../types/types';

export function useCourseStats(course: Course, reviews: Review[]) {
    return useMemo(() => {
        const isMajor = course.category === '전공';

        const overallRating = reviews.length > 0
            ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
            : course.rating ?? 0;

        return { overallRating, isMajor };
    }, [course, reviews]);
}
