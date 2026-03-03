package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.EmailVerification;
import com.inhaeval.backend.domain.Member;
import com.inhaeval.backend.repository.EmailVerificationRepository;
import com.inhaeval.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EmailVerifcationService {

    private final EmailVerificationRepository emailVerificationRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public void verifyToken(String token){
        EmailVerification verification = emailVerificationRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 토큰입니다."));

        if (verification.isUsed()){
            throw new IllegalArgumentException("이미 사용된 토큰입니다.");
        }

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())){
            throw new IllegalArgumentException("만료된 토큰입니다.");
        }

        Member member = memberRepository.findByEmail(verification.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        member.verify();
        member.addPoints(50);
        verification.use();
    }
}
