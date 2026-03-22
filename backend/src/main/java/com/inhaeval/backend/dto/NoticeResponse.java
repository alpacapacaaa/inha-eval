package com.inhaeval.backend.dto;

import com.inhaeval.backend.domain.Notice;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class NoticeResponse {

    private Long id;
    private String title;
    private String content;
    private boolean isImportant;
    private LocalDateTime createdAt;

    public static NoticeResponse from(Notice notice) {
        return NoticeResponse.builder()
                .id(notice.getId())
                .title(notice.getTitle())
                .content(notice.getContent())
                .isImportant(notice.isImportant())
                .createdAt(notice.getCreatedAt())
                .build();
    }
}
