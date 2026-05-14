package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.Member;
import com.inhaeval.backend.dto.PointHistoryResponse;
import com.inhaeval.backend.repository.MemberRepository;
import com.inhaeval.backend.repository.PointHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PointHistoryService {

    private final PointHistoryRepository pointHistoryRepository;
    private final MemberRepository memberRepository;

    @Transactional(readOnly = true)
    public List<PointHistoryResponse> getMyPointHistory(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        List<PointHistoryResponse> regularHistory = new ArrayList<>();
        Map<String, PointHistoryResponse> aggregatedLikeHistory = new LinkedHashMap<>();

        pointHistoryRepository.findByMemberIdOrderByCreatedAtDesc(member.getId())
                .forEach(pointHistory -> {
                    PointHistoryResponse response = PointHistoryResponse.from(pointHistory);
                    if (!isReviewLikeHistory(response.getDescription())) {
                        regularHistory.add(response);
                        return;
                    }

                    aggregatedLikeHistory.merge(
                            response.getDescription(),
                            response,
                            (latest, current) -> PointHistoryResponse.builder()
                                    .id(latest.getId())
                                    .date(latest.getDate())
                                    .description(latest.getDescription())
                                    .points(latest.getPoints() + current.getPoints())
                                    .build()
                    );
                });

        aggregatedLikeHistory.values().stream()
                .filter(response -> response.getPoints() != 0)
                .forEach(regularHistory::add);

        regularHistory.sort(Comparator.comparing(PointHistoryResponse::getDate).reversed());
        return regularHistory;
    }

    private boolean isReviewLikeHistory(String description) {
        return description != null && description.startsWith("강의평 좋아요 (");
    }
}
