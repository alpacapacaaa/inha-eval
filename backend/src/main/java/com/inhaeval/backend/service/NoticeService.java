package com.inhaeval.backend.service;

import com.inhaeval.backend.dto.NoticeResponse;
import com.inhaeval.backend.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NoticeService {

    private final NoticeRepository noticeRepository;

    public List<NoticeResponse> getNotices() {
        return noticeRepository.findAllByOrderByIsImportantDescCreatedAtDesc()
                .stream()
                .map(NoticeResponse::from)
                .collect(Collectors.toList());
    }
}
