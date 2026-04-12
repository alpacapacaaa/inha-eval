package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.*;
import com.inhaeval.backend.dto.ReviewRequest;
import com.inhaeval.backend.dto.ReviewResponse;
import com.inhaeval.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final MemberRepository memberRepository;
    private final PointHistoryRepository pointHistoryRepository;
    private final ReviewLikeRepository reviewLikeRepository;

    // 1. 리뷰 작성 (포인트 지급 및 강의 평점 갱신 포함)
    @Transactional
    public Long createReview(ReviewRequest request, String email) {
        
        // 1-1. 회원 및 강의 정보 확인
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 강의입니다."));

        // 1-2. 리뷰 엔티티 생성 및 디테일 정보 매핑
        Review review = Review.builder()
                .member(member)
                .course(course)
                .semester(request.getSemester())
                .rating(request.getRating())
                .difficulty(request.getDifficulty())
                .workload(request.getWorkload())
                .attendance(request.getAttendance())
                .grading(request.getGrading())
                .content(request.getContent())
                .isAnonymous(request.isAnonymous())
                // --- 프리미엄 & 디테일 필드 매핑 ---
                .examTypes(request.getExamTypes())
                .assignmentType(request.getAssignmentType())
                .textbook(request.getTextbook())
                .oneLineTip(request.getOneLineTip())
                .examInfo(request.getExamInfo())
                .examKeywords(request.getExamKeywords())
                .recommendFor(request.getRecommendFor())
                .notRecommendFor(request.getNotRecommendFor())
                .badges(request.getBadges())
                .examMidtermInfo(request.getExamMidtermInfo())
                .examFinalInfo(request.getExamFinalInfo())
                .examAssignmentInfo(request.getExamAssignmentInfo())
                .examQuizInfo(request.getExamQuizInfo())
                .pastExamHelpfulness(request.getPastExamHelpfulness())
                .scopePredictability(request.getScopePredictability())
                .studyResources(request.getStudyResources())
                .problemStyles(request.getProblemStyles())
                .examPrepTip(request.getExamPrepTip())
                // --- 슬라이더 스탯 정보 매핑 ---
                .diffScore(request.getDiffScore())
                .gradScore(request.getGradScore())
                .workScore(request.getWorkScore())
                .prerequisiteScore(request.getPrerequisiteScore())
                .depthScore(request.getDepthScore())
                .pastExamScore(request.getPastExamScore())
                .build();

        // 1-3. 리뷰 저장
        reviewRepository.save(review);

        // 1-4. 포인트 지급 (리뷰 작성 시 30P 지급 - 프론트 UI 사진 기준)
        member.addPoints(30); 
        pointHistoryRepository.save(PointHistory.builder()
                .member(member)
                .review(review) // 어떤 리뷰 때문에 받았는지 기록
                .description("강의평 작성 (" + course.getName() + ")")
                .points(30)
                .build());

        // 1-5. 강의 평점 및 리뷰 개수 갱신
        course.addReviewRating(review.getRating());

        return review.getId(); // 새로 만들어진 리뷰의 ID 반환
    }

    // 2. 특정 강의의 리뷰 목록 조회 (정렬 기능 지원!)
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByCourseId(Long courseId, String sortBy) {
        List<Review> reviews;
        
        // 프론트에서 넘어온 "sortBy" 글자에 따라 우리가 아까 Repository에 심어둔 필살기 쿼리 중 하나를 고릅니다.
        if ("highest".equalsIgnoreCase(sortBy)) {
            reviews = reviewRepository.findByCourseIdOrderByRatingDesc(courseId);// 별점 높은 순
        } else if ("lowest".equalsIgnoreCase(sortBy)) {
            reviews = reviewRepository.findByCourseIdOrderByRatingAsc(courseId);  // 별점 낮은 순
        } else if ("likes".equalsIgnoreCase(sortBy)) {
            reviews = reviewRepository.findByCourseIdOrderByLikesCountDesc(courseId); // 추천 많은 순
        } else {
            reviews = reviewRepository.findByCourseIdOrderByCreatedAtDesc(courseId); // 기본값: 최신순
        }

        return reviews.stream()
                .map(ReviewResponse::from)
                .toList();
    }

    // 3. 내가 작성한 리뷰 목록 조회 (마이페이지용)
    @Transactional(readOnly = true)
    public List<ReviewResponse> getMyReviews(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        return reviewRepository.findByMemberIdOrderByCreatedAtDesc(member.getId())
                .stream()
                .map(ReviewResponse::from)
                .toList();
    }

    // 4. 리뷰 삭제 (본인 리뷰만 삭제 가능, 강의 평점 갱신 포함)
    @Transactional
    public void deleteReview(Long reviewId, String email) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 리뷰입니다."));

        // 본인 리뷰인지 검증
        if (!review.getMember().getEmail().equals(email)) {
            throw new IllegalArgumentException("본인이 작성한 리뷰만 삭제할 수 있습니다.");
        }

        // 강의 평점 갱신
        review.getCourse().removeReviewRating(review.getRating());

        reviewRepository.delete(review);
    }

    // 5. 좋아요 토글 (누르면 추가, 이미 눌렀으면 취소)
    @Transactional
    public void toggleLike(Long reviewId, String email) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 리뷰입니다."));
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        reviewLikeRepository.findByMemberAndReview(member, review)
                .ifPresentOrElse(
                        like -> {
                            // 이미 좋아요 누른 상태 → 취소
                            reviewLikeRepository.delete(like);
                            review.removeLike();
                        },
                        () -> {
                            // 좋아요 누르지 않은 상태 → 추가
                            reviewLikeRepository.save(ReviewLike.builder()
                                    .member(member)
                                    .review(review)
                                    .build());
                            review.addLike();
                        }
                );
    }
}
