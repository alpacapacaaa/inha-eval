package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.Course;
import com.inhaeval.backend.dto.CourseResponse;
import com.inhaeval.backend.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseService {

    private final CourseRepository courseRepository;

    // 전체 강의 목록 조회
    public List<CourseResponse> getAllCourses() {
        return courseRepository.findAllWithSlots().stream()
                .map(CourseResponse::from)
                .collect(Collectors.toList());
    }

    // 강의 상세 상세 조회
    public CourseResponse getCourseById(Long id) {
        Course course = courseRepository.findByIdWithSlots(id)
                .orElseThrow(() -> new IllegalArgumentException("요청하신 강의를 찾을 수 없습니다."));
        return CourseResponse.from(course);
    }

    // 검색어 및 학과 조건 검색
    public List<CourseResponse> searchCourses(String query, String department) {
        if (query == null) query = "";
        return courseRepository.searchCourses(query, department).stream()
                .map(CourseResponse::from)
                .collect(Collectors.toList());
    }

    // 2. 명강의 추천 (평점 상위)
    public List<CourseResponse> getFamousCourses() {
        return courseRepository.findTopRatedCourses().stream()
                .limit(5)
                .map(CourseResponse::from)
                .collect(Collectors.toList());
    }
    
    // 3. 널널한 꿀강 (상위 3개)
    public List<CourseResponse> getHoneyGeCourses() {
        return courseRepository.findHoneyGeCourses().stream()
                .limit(3)
                .map(CourseResponse::from)
                .collect(Collectors.toList());
    }

    // 4. 검증된 강의 (리뷰 많은 순)
    public List<CourseResponse> getVerifiedCourses() {
        return courseRepository.findMostReviewedCourses().stream()
                .limit(5)
                .map(CourseResponse::from)
                .collect(Collectors.toList());
    }
    // 5. 성장형 강의 (전공 과목 상위)
    public List<CourseResponse> getGrowthCourses() {
        return courseRepository.findGrowthCourses().stream()
                .limit(5)
                .map(CourseResponse::from)
                .collect(Collectors.toList());
    }
}
