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
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByCourse(
            @PathVariable Long courseId,
            @RequestParam(defaultValue = "latest") String sort) {
        return ResponseEntity.ok(reviewService.getReviewsByCourseId(courseId, sort));
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
}