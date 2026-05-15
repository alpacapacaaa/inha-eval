package com.inhaeval.backend.controller;

import com.inhaeval.backend.dto.ReviewRequest;
import com.inhaeval.backend.dto.ReviewResponse;
import com.inhaeval.backend.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // 1. 리뷰 작성 (로그인 필요)
    @PostMapping
    public ResponseEntity<Long> createReview(
            @Valid @RequestBody ReviewRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        Long reviewId = reviewService.createReview(request, email);
        return ResponseEntity.ok(reviewId);
    }

    // 2. 특정 강의 리뷰 목록 조회 (비로그인 가능)
    // Authentication을 추가한 이유: 로그인 유저에게는 각 리뷰의 likedByMe(내가 좋아요 눌렀는지) 여부를
    // 함께 반환해야 하기 때문. 비로그인 상태면 null을 넘겨 likedByMe=false로 처리.
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByCourse(
            @PathVariable Long courseId,
            @RequestParam(defaultValue = "latest") String sort,
            Authentication authentication) {
        return ResponseEntity.ok(reviewService.getReviewsByCourseId(courseId, sort, resolveAuthenticatedEmail(authentication)));
    }

    // 3. 내가 쓴 리뷰 목록 조회 (마이페이지, 로그인 필요)
    @GetMapping("/my")
    public ResponseEntity<List<ReviewResponse>> getMyReviews(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(reviewService.getMyReviews(email));
    }

    // 4. 리뷰 삭제 (로그인 필요, 본인만)
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long reviewId,
            Authentication authentication) {
        String email = authentication.getName();
        reviewService.deleteReview(reviewId, email);
        return ResponseEntity.noContent().build();
    }

    // 5. 좋아요 토글 (로그인 필요)
    @PostMapping("/{reviewId}/like")
    public ResponseEntity<Void> toggleLike(
            @PathVariable Long reviewId,
            Authentication authentication) {
        String email = authentication.getName();
        reviewService.toggleLike(reviewId, email);
        return ResponseEntity.ok().build();
    }

    // Spring Security는 비로그인 요청의 authentication.getName()으로 "anonymousUser"를 반환한다.
    // 이를 null로 정규화해서 서비스 레이어가 단순히 null 체크만 하면 되도록 처리.
    private String resolveAuthenticatedEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            return null;
        }

        return authentication.getName();
    }
}
