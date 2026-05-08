package com.inhaeval.backend.dto;

import com.inhaeval.backend.domain.Course;
import com.inhaeval.backend.domain.CourseSlot;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CourseResponse {

    private List<CourseSlotResponse> slots;

    private Long id;
    private String name;
    private String professor;
    private String department;
    private Integer credits;    // 3학점, 2학점
    private String section;
    private String semester;
    private float rating;       // 평균 평점
    private int reviewCount;
    private String category;
    private String type;
    private String generalArea;
    private String evaluationType;

    // 프론트엔드 UI 깨짐 방지용 기본값
    @Builder.Default private String difficulty = "medium";
    @Builder.Default private String workload = "medium";
    @Builder.Default private String attendance = "medium";
    @Builder.Default private String grading = "medium";

    public static CourseResponse from(Course course) {
        return CourseResponse.builder()
                .id(course.getId())
                .name(course.getName())
                .professor(course.getProfessor())
                .department(course.getDepartment())
                .credits(course.getCredits())
                .section(course.getSection())
                .semester(course.getSemester())
                .rating(course.getRating())
                .reviewCount(course.getReviewCount())
                .category(course.getCategory())
                .type(course.getType())
                .generalArea(course.getGeneralArea())
                .evaluationType(course.getEvaluationType())
                .slots(course.getSlots().stream()
                        .map(CourseSlotResponse::from)
                        .collect(Collectors.toList()))
                .build();
    }
}
