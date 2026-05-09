package com.inhaeval.backend.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "courses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CourseSlot> slots = new ArrayList<>();

    @Column(nullable = false)
    private String name;        // 강의명

    @Column(nullable = false)
    private String professor;   // 교수명

    @Column(nullable = false)
    private String department;  // 개설학과

    @Column(nullable = false)
    private String category;    // 전공/교양 구분

    private String type;        // 전공필수, 기초교양 등 세부구분 (null 허용)

    private Integer credits;    // 과목 학점 (예: 3학점, 2학점 등)

    private String section;     // 분반 (예: 001, 002)

    private String semester;    // 개설 학기 "26-1", "26-2"

    private String generalArea;    // 교양 영역 (예: "핵심교양-1.인간, 가치, 공존"), 교양 과목에만 값 존재
    private String evaluationType; // 평가 방식 (예: "Pass/Fail", "절대평가", "상대평가")

    // 반정규화 필드 (DB가 무거워지지 않게 평점과 개수를 미리 저장해둠)
    @Column(nullable = false)
    @Builder.Default
    private float rating = 0.0f;     // 평균 평점 (1.0~5.0)

    @Column(nullable = false)
    @Builder.Default
    private int reviewCount = 0;     // 해당 강의에 달린 총 리뷰 개수

    // === 비즈니스 논리 (리뷰 작성/삭제 시 강제적으로 Course도 업데이트되도록) ===
    public void addReviewRating(float newRating) {
        float totalScore = this.rating * this.reviewCount; // 기존에 쌓여있던 옛날 총점 복산
        this.reviewCount++;
        this.rating = (totalScore + newRating) / this.reviewCount; // 새로운 평균 산출
    }

    public void removeReviewRating(float oldRating) {
        // 방어적 제어: 지우는데 리뷰개수가 1개(마지막 리뷰) 이하라면 0으로 초기화
        if (this.reviewCount <= 1) {
            this.rating = 0.0f;
            this.reviewCount = 0;
            return;
        }
        float totalScore = this.rating * this.reviewCount;
        this.reviewCount--;
        this.rating = (totalScore - oldRating) / this.reviewCount;
    }
}
