package com.inhaeval.backend.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 평가 작성자 (회원 연관관계) - 외래키
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 평가 대상 (강의 연관관계) - 외래키
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(nullable = false)
    private String semester; // 수강학기 (ex. 2026-1)

    @Column(nullable = false)
    private float rating;    // 1.0 ~ 5.0 (본문 평가 총 별점)

    @Column(nullable = false)
    private String difficulty; // EASY, MEDIUM, HARD 등 (원한다면 Enum으로 빼도 됩니다)

    @Column(nullable = false)
    private String workload; // LIGHT, MEDIUM, HEAVY 등

    @Column(nullable = false)
    private String attendance; // STRICT, MEDIUM, FLEXIBLE 등

    @Column(nullable = false)
    private String grading; // GENEROUS, MEDIUM, STRICT 등

    @Lob // 아주 긴 글일 수 있으므로
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    @Builder.Default
    private int likesCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean isAnonymous = false; // 기본은 실명 (에타처럼 익명 토글 가능)

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

        // --- Premium / Extended fields (프론트엔드의 추가 정보) ---
    @ElementCollection
    @CollectionTable(name = "review_exam_types", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "exam_type")
    private java.util.List<String> examTypes;

    private String assignmentType;
    private String textbook;
    private String oneLineTip;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String examInfo;

    @ElementCollection
    @CollectionTable(name = "review_exam_keywords", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "keyword")
    private java.util.List<String> examKeywords;

    @ElementCollection
    @CollectionTable(name = "review_recommend_for", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "recommend")
    private java.util.List<String> recommendFor;

    @ElementCollection
    @CollectionTable(name = "review_not_recommend_for", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "not_recommend")
    private java.util.List<String> notRecommendFor;

    // --- Slider bar stats (1-5점 슬라이더 스탯) ---
    private Integer diffScore;
    private Integer gradScore;
    private Integer workScore;
    private Integer prerequisiteScore;
    private Integer depthScore;
    private Integer pastExamScore;

    @ElementCollection
    @CollectionTable(name = "review_badges", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "badge")
    private java.util.List<String> badges;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String examMidtermInfo;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String examFinalInfo;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String examAssignmentInfo;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String examQuizInfo;

    private String pastExamHelpfulness;
    private String scopePredictability;

    @ElementCollection
    @CollectionTable(name = "review_study_resources", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "resource")
    private java.util.List<String> studyResources;

    @ElementCollection
    @CollectionTable(name = "review_problem_styles", joinColumns = @JoinColumn(name = "review_id"))
    @Column(name = "style")
    private java.util.List<String> problemStyles;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String examPrepTip;

    @PrePersist
    public void prePersist() { this.createdAt = LocalDateTime.now(); }
    
    @PreUpdate
    public void preUpdate() { this.updatedAt = LocalDateTime.now(); }

    public void addLike() { this.likesCount++; }
    public void removeLike() { if (this.likesCount > 0) this.likesCount--; }
}
