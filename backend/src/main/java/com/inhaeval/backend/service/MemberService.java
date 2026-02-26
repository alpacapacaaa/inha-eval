package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.EmailVerification;
import com.inhaeval.backend.domain.Member;
import com.inhaeval.backend.dto.SignupRequest;
import com.inhaeval.backend.dto.SignupResponse;
import com.inhaeval.backend.repository.EmailVerificationRepository;
import com.inhaeval.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Transactional
    public SignupResponse signup(SignupRequest request){

        if(memberRepository.existsByEmail(request.getEmail())){
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        if(memberRepository.existsByStudentId(request.getStudentId()))
            throw new IllegalArgumentException("이미 사용 중인 학번입니다.");

        Member member = Member.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .studentId(request.getStudentId())
                .department(request.getDepartment())
                .build();
        memberRepository.save(member);

        String token = UUID.randomUUID().toString();    // 랜덤 토큰 생성

        EmailVerification verification = EmailVerification.builder()
                .email(request.getEmail())
                .token(token)   // 메일 인증 시 URL에 포함될 토큰
                .build();
        emailVerificationRepository.save(verification);

        mailService.sendVerificationEmail(request.getEmail(), token);

        return SignupResponse.builder()
                .email(member.getEmail())
                .nickname(member.getNickname())
                .build();

    }
}
