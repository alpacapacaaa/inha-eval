package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.EmailVerification;
import com.inhaeval.backend.domain.Member;
import com.inhaeval.backend.exception.CustomException;
import com.inhaeval.backend.repository.EmailVerificationRepository;
import com.inhaeval.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private final EmailVerificationRepository emailVerificationRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public void verifyToken(String token) {
        EmailVerification verification = emailVerificationRepository.findByToken(token)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "유효하지 않은 토큰입니다."));

        if (verification.isUsed()) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "이미 사용된 토큰입니다.");
        }

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "만료된 토큰입니다.");
        }

        Member member = memberRepository.findByEmail(verification.getEmail())
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));

        member.verify();
        member.addPoints(50);
        verification.use();
    }
}