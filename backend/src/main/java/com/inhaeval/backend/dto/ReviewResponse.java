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
    // 모바일 앱의 좋아요 버튼 상태(활성/비활성)를 서버에서 내려주기 위해 추가.
    // 클라이언트가 별도 API를 호출하지 않아도 리뷰 목록 응답만으로 좋아요 여부를 알 수 있다.
    private boolean likedByMe;

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
    // 기존 from(review) 시그니처를 유지해서 마이페이지 등 뷰어 정보가 없는 곳에서 깨지지 않도록 오버로드.
    public static ReviewResponse from(Review review) {
        return from(review, false);
    }

    // viewerEmail이 있는 강의 상세 조회용. likedByMe를 직접 주입받아 DB 조회 결과를 그대로 반영.
    public static ReviewResponse from(Review review, boolean likedByMe) {
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
                .likedByMe(likedByMe)
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
