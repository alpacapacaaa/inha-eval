package com.inhaeval.backend.repository;

import com.inhaeval.backend.domain.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {

    // 1. 검색어(강의명 또는 교수명)와 학과로 검색
    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.slots WHERE " +
           "(LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(c.professor) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND (:department IS NULL OR :department = '전체' OR c.department = :department)")
    List<Course> searchCourses(@Param("query") String query, @Param("department") String department);

    // 2. 명강의 (평점 순 상위)
    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.slots ORDER BY c.rating DESC")
    List<Course> findTopRatedCourses();

    // 3. 꿀교양 (평점 4.0 이상 인기 교양)
    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.slots WHERE c.category = '교양' AND c.rating >= 4.0 ORDER BY c.rating DESC")
    List<Course> findHoneyGeCourses();

    // 4. 검증된 강의 (리뷰 많은 순 상위)
    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.slots ORDER BY c.reviewCount DESC")
    List<Course> findMostReviewedCourses();

    // 5. 성장형 강의 (전공 과목 중 평점 순)
    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.slots WHERE c.category = '전공' ORDER BY c.rating DESC")
    List<Course> findGrowthCourses();

    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.slots")
    List<Course> findAllWithSlots();

    @Query("SELECT c FROM Course c LEFT JOIN FETCH c.slots WHERE c.id = :id")
    Optional<Course> findByIdWithSlots(@Param("id") Long id);

    @Query("SELECT DISTINCT c FROM Course c LEFT JOIN FETCH c.slots WHERE " +
           "(:generalArea IS NULL OR c.generalArea = :generalArea) " +
           "AND (:evaluationType IS NULL OR c.evaluationType = :evaluationType)")
    List<Course> findByGeneralAreaFilter(@Param("generalArea") String generalArea,
                                         @Param("evaluationType") String evaluationType);

    // 과목별 스탯 평균 + 응답자 수 (null 제외하고 집계)
    @Query("SELECT AVG(r.diffScore), COUNT(r.diffScore), " +
           "AVG(r.gradScore), COUNT(r.gradScore), " +
           "AVG(r.workScore), COUNT(r.workScore), " +
           "AVG(r.prerequisiteScore), COUNT(r.prerequisiteScore), " +
           "AVG(r.depthScore), COUNT(r.depthScore), " +
           "AVG(r.pastExamScore), COUNT(r.pastExamScore) " +
           "FROM Review r WHERE r.course.id = :courseId")
    Object[] findStatsByCourseId(@Param("courseId") Long courseId);
}
