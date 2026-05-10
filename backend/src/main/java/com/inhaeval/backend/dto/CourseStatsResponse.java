package com.inhaeval.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CourseStatsResponse {

    private Double diffScore;
    private Integer diffScoreCount;

    private Double gradScore;
    private Integer gradScoreCount;

    private Double workScore;
    private Integer workScoreCount;

    private Double prerequisiteScore;
    private Integer prerequisiteScoreCount;

    private Double depthScore;
    private Integer depthScoreCount;

    private Double pastExamScore;
    private Integer pastExamScoreCount;
}
