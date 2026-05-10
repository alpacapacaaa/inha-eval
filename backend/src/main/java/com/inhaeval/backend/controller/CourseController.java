package com.inhaeval.backend.controller;

import com.inhaeval.backend.dto.CourseResponse;
import com.inhaeval.backend.dto.CourseStatsResponse;
import com.inhaeval.backend.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @GetMapping
    public ResponseEntity<List<CourseResponse>> getAllCourses() {
        return ResponseEntity.ok(courseService.getAllCourses());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseResponse> getCourseById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(courseService.getCourseById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<CourseResponse>> searchCourses(
            @RequestParam(name = "query", defaultValue = "") String query,
            @RequestParam(name = "department", required = false) String department) {
        return ResponseEntity.ok(courseService.searchCourses(query, department));
    }

    @GetMapping("/famous") // 명강의
    public ResponseEntity<List<CourseResponse>> getFamousCourses() {
        return ResponseEntity.ok(courseService.getFamousCourses());
    }
    @GetMapping("/honey-ge") // 널널한 꿀강
    public ResponseEntity<List<CourseResponse>> getHoneyGeCourses() {
        return ResponseEntity.ok(courseService.getHoneyGeCourses());
    }

    @GetMapping("/verified") // 검증된 강의
    public ResponseEntity<List<CourseResponse>> getVerifiedCourses() {
        return ResponseEntity.ok(courseService.getVerifiedCourses());
    }
    @GetMapping("/growth") // 성장형 강의
    public ResponseEntity<List<CourseResponse>> getGrowthCourses() {
        return ResponseEntity.ok(courseService.getGrowthCourses());
    }

    @GetMapping("/{courseId}/stats")
    public ResponseEntity<CourseStatsResponse> getCourseStats(@PathVariable Long courseId) {
        return ResponseEntity.ok(courseService.getCourseStats(courseId));
    }

    @GetMapping("/filter")
    public ResponseEntity<List<CourseResponse>> filterCourses(
            @RequestParam(name = "generalArea", required = false) String generalArea,
            @RequestParam(name = "evaluationType", required = false) String evaluationType) {
        return ResponseEntity.ok(courseService.getCoursesByGeneralAreaFilter(generalArea, evaluationType));
    }
}
