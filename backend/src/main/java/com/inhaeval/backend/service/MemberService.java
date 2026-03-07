package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.EmailVerification;
import com.inhaeval.backend.domain.Member;
import com.inhaeval.backend.dto.LoginRequest;
import com.inhaeval.backend.dto.LoginResponse;
import com.inhaeval.backend.dto.SignupRequest;
import com.inhaeval.backend.dto.SignupResponse;
import com.inhaeval.backend.repository.EmailVerificationRepository;
import com.inhaeval.backend.repository.MemberRepository;
import com.inhaeval.backend.util.JwtUtil;
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
    private final JwtUtil jwtUtil;

    @Transactional
    public SignupResponse signup(SignupRequest request){

        if(memberRepository.existsByEmail(request.getEmail())){
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        Member member = Member.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
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

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이메일입니다."));

        if (!member.isVerified()){
            throw new IllegalArgumentException("이메일 인증이 필요합니다.");
        }

        if(!member.isActive()) {
            throw new IllegalArgumentException("탈퇴한 회원입니다.");
        }

        if(!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        String token = jwtUtil.generateToken(member.getEmail());

        return LoginResponse.builder()
                .points(member.getPoints())
                .nickname(member.getNickname())
                .accessToken(token)
                .build();
    }
}
