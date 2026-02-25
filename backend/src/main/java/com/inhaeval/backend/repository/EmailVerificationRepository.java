package com.inhaeval.backend.repository;

import com.inhaeval.backend.domain.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {
    // 토큰 비교로 진짜 이메일 주인인지 판별
    Optional<EmailVerification> findByToken(String token);
    // 이 이메일의 토큰이 아직 유효한지 확인
    Optional<EmailVerification> findTopByEmailOrderByCreatedAtDesc(String email);

}
