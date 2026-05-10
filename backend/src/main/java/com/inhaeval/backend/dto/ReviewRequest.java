package com.inhaeval.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;

@Getter
@NoArgsConstructor
public class ReviewRequest {

    // 필수 정보
    private Long courseId;
    private String semester;
    private float rating;
    private String difficulty;
    private String workload;
    private String attendance;
    private String grading;
    private String content;
    private boolean isAnonymous;

    // 디테일 정보 (선택)
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

    // 슬라이더 스탯 정보 (선택, 응답 시 1~10 범위)
    @Min(1) @Max(10) private Integer diffScore;
    @Min(1) @Max(10) private Integer gradScore;
    @Min(1) @Max(10) private Integer workScore;
    @Min(1) @Max(10) private Integer prerequisiteScore;
    @Min(1) @Max(10) private Integer depthScore;
    @Min(1) @Max(10) private Integer pastExamScore;
}
