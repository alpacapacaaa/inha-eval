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

    // 포인트 내역 조회.
    // 좋아요/취소를 반복하면 같은 강의에 대한 "+1, -1, +1 ..." 내역이 쌓여 목록이 지저분해진다.
    // 이를 방지하기 위해 "강의평 좋아요 (과목명)" 항목은 같은 설명 키로 합산해서 하나의 항목으로 보여준다.
    // 합산 결과가 0이면 (좋아요 후 취소) 목록에서 제거한다.
    @Transactional(readOnly = true)
    public List<PointHistoryResponse> getMyPointHistory(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        List<PointHistoryResponse> regularHistory = new ArrayList<>();
        // LinkedHashMap: 삽입 순서(최신순)를 유지하면서 동일 키를 merge로 합산
        Map<String, PointHistoryResponse> aggregatedLikeHistory = new LinkedHashMap<>();

        pointHistoryRepository.findByMemberIdOrderByCreatedAtDesc(member.getId())
                .forEach(pointHistory -> {
                    PointHistoryResponse response = PointHistoryResponse.from(pointHistory);
                    if (!isReviewLikeHistory(response.getDescription())) {
                        regularHistory.add(response);
                        return;
                    }

                    // 좋아요 내역은 설명 문자열(= 과목명)을 키로 합산
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

        // 합산 후 순 포인트가 0인 항목(좋아요 후 전부 취소)은 노출 불필요
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
