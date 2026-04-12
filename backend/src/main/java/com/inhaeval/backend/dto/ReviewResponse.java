package com.inhaeval.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.inhaeval.backend.domain.Review;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class ReviewResponse {

    private Long id;
    private Long courseId;
    private String courseName;
    private String professorName;
    private String semester;
    private float rating;
    private String difficulty;
    private String workload;
    private String attendance;
    private String grading;
    private String content;
    private int likes;
    private LocalDateTime createdAt;

    @JsonProperty("isAnonymous")    // review.isAnonymous가 항상 undefined 상태를 방지
    private boolean isAnonymous;

    // 선택 필드
    private List<String> examTypes;
    private String assignmentType;
    private String textbook;
    private String oneLineTip;
    private String examInfo;
    private List<String> examKeywords;
    private List<String> recommendFor;
    private List<String> notRecommendFor;

    private List<String> badges;
    private String examMidtermInfo;
    private String examFinalInfo;
    private String examAssignmentInfo;
    private String examQuizInfo;
    private String pastExamHelpfulness;
    private String scopePredictability;
    private List<String> studyResources;
    private List<String> problemStyles;
    private String examPrepTip;

    // 슬라이더 스탯
    private Integer diffScore;
    private Integer gradScore;
    private Integer workScore;
    private Integer prerequisiteScore;
    private Integer depthScore;
    private Integer pastExamScore;

    // Review 엔티티 → ReviewResponse 변환 메서드
    public static ReviewResponse from(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .courseId(review.getCourse().getId())
                .courseName(review.getCourse().getName())
                .professorName(review.getCourse().getProfessor())
                .semester(review.getSemester())
                .rating(review.getRating())
                .difficulty(review.getDifficulty())
                .workload(review.getWorkload())
                .attendance(review.getAttendance())
                .grading(review.getGrading())
                .content(review.getContent())
                .likes(review.getLikesCount())
                .createdAt(review.getCreatedAt())
                .isAnonymous(review.isAnonymous())
                .examTypes(review.getExamTypes())
                .assignmentType(review.getAssignmentType())
                .textbook(review.getTextbook())
                .oneLineTip(review.getOneLineTip())
                .examInfo(review.getExamInfo())
                .examKeywords(review.getExamKeywords())
                .recommendFor(review.getRecommendFor())
                .notRecommendFor(review.getNotRecommendFor())
                .badges(review.getBadges())
                .examMidtermInfo(review.getExamMidtermInfo())
                .examFinalInfo(review.getExamFinalInfo())
                .examAssignmentInfo(review.getExamAssignmentInfo())
                .examQuizInfo(review.getExamQuizInfo())
                .pastExamHelpfulness(review.getPastExamHelpfulness())
                .scopePredictability(review.getScopePredictability())
                .studyResources(review.getStudyResources())
                .problemStyles(review.getProblemStyles())
                .examPrepTip(review.getExamPrepTip())
                .diffScore(review.getDiffScore())
                .gradScore(review.getGradScore())
                .workScore(review.getWorkScore())
                .prerequisiteScore(review.getPrerequisiteScore())
                .depthScore(review.getDepthScore())
                .pastExamScore(review.getPastExamScore())
                .build();
    }
}