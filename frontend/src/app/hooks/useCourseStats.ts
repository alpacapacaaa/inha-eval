import { useMemo } from 'react';
import { Course, Review } from '../types/types';

const getAverageScore = (reviews: Review[], key: 'difficulty' | 'workload' | 'attendance' | 'grading', val5: string, val3: string, val1: string) => {
    if (reviews.length === 0) return 3;
    let sum = 0;
    reviews.forEach(r => {
        if (r[key] === val5) sum += 5;
        else if (r[key] === val3) sum += 3;
        else if (r[key] === val1) sum += 1;
        else sum += 3;
    });
    return sum / reviews.length;
};

const getAverageNumericScore = (reviews: Review[], key: keyof Review, fallback: number) => {
    const validReviews = reviews.filter(r => typeof r[key] === 'number');
    if (validReviews.length === 0) return fallback;
    return validReviews.reduce((sum, r) => sum + (r[key] as number), 0) / validReviews.length;
};

export function useCourseStats(course: Course, reviews: Review[]) {
    return useMemo(() => {
        const overallRating = reviews.length > 0
            ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length)
            : course.rating;

        const fbDiffScore = getAverageScore(reviews, 'difficulty', 'hard', 'medium', 'easy');
        const fbWorkScore = getAverageScore(reviews, 'workload', 'heavy', 'medium', 'light');
        const fbAttScore = getAverageScore(reviews, 'attendance', 'strict', 'medium', 'flexible');
        const fbGradScore = getAverageScore(reviews, 'grading', 'generous', 'medium', 'strict');

        const diffScore = getAverageNumericScore(reviews, 'diffScore', fbDiffScore);
        const workScore = getAverageNumericScore(reviews, 'workScore', fbWorkScore);
        const attScore = getAverageNumericScore(reviews, 'attScore', fbAttScore);
        const gradScore = getAverageNumericScore(reviews, 'gradScore', fbGradScore);

        const teachingScore = getAverageNumericScore(reviews, 'teachingScore', Math.min(5, Math.max(1, (overallRating * 0.7 + fbGradScore * 0.3))));
        const prerequisiteScore = getAverageNumericScore(reviews, 'prerequisiteScore', Math.min(5, Math.max(1, (fbDiffScore * 0.6 + fbWorkScore * 0.4))));
        const depthScore = getAverageNumericScore(reviews, 'depthScore', Math.min(5, Math.max(1, (fbDiffScore * 0.5 + fbWorkScore * 0.3 + (6 - fbGradScore) * 0.2))));
        const timeInvestScore = getAverageNumericScore(reviews, 'timeInvestScore', Math.min(5, Math.max(1, (fbWorkScore * 0.5 + fbDiffScore * 0.3 + fbAttScore * 0.2))));
        const pastExamScore = getAverageNumericScore(reviews, 'pastExamScore', Math.min(5, Math.max(1, (6 - fbDiffScore) * 0.6 + fbGradScore * 0.4)));

        const isMajor = course.category === '전공';

        const statsData = isMajor
            ? [diffScore, teachingScore, gradScore, workScore, prerequisiteScore, depthScore]
            : [diffScore, timeInvestScore, gradScore, workScore, attScore, pastExamScore];

        const statsLabels = isMajor
            ? ['시험 난도', '강의력', '학점 비율', '과제량', '선수지식', '전공 심화도']
            : ['시험 난도', '시간 투자', '학점 비율', '과제량', '출석체크', '족보 유효도'];

        return {
            overallRating,
            statsData,
            statsLabels,
            isMajor
        };
    }, [course, reviews]);
}
