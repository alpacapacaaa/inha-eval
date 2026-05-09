package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.EmailVerification;
import com.inhaeval.backend.domain.Member;
import com.inhaeval.backend.domain.PhoneVerification;
import com.inhaeval.backend.domain.RefreshToken;
import com.inhaeval.backend.dto.*;
import com.inhaeval.backend.exception.CustomException;
import com.inhaeval.backend.repository.EmailVerificationRepository;
import com.inhaeval.backend.repository.MemberRepository;
import com.inhaeval.backend.repository.PhoneVerificationRepository;
import com.inhaeval.backend.repository.RefreshTokenRepository;
import com.inhaeval.backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.inhaeval.backend.domain.PointHistory;
import com.inhaeval.backend.repository.PointHistoryRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final PointHistoryRepository pointHistoryRepository;
    private final MemberRepository memberRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PhoneVerificationRepository phoneVerificationRepository;
    private final PhoneVerificationService phoneVerificationService;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final JwtUtil jwtUtil;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    // 이메일 인증 메일 발송
    @Transactional
    public void sendVerificationEmail(String email) {

        if (memberRepository.existsByEmailAndIsActiveTrue(email)) {
            throw new CustomException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }

        // 1분 이내 재요청 방지
        emailVerificationRepository.findTopByEmailOrderByCreatedAtDesc(email)
                .ifPresent(v -> {
                    if (v.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(1))) {
                        throw new CustomException(HttpStatus.TOO_MANY_REQUESTS, "1분 후 다시 시도해주세요.");
                    }
                });

        emailVerificationRepository.deleteByEmail(email);

        String token = UUID.randomUUID().toString();

        EmailVerification verification = EmailVerification.builder()
                .email(email)
                .token(token)
                .build();
        emailVerificationRepository.save(verification);

        mailService.sendVerificationEmail(email, token);
    }

    @Transactional
    public SignupResponse signup(SignupRequest request){

        if(memberRepository.existsByEmailAndIsActiveTrue(request.getEmail())){
            throw new CustomException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }

        if (memberRepository.existsByPhoneNumberAndIsActiveTrue(request.getPhoneNumber())) {
            throw new CustomException(HttpStatus.CONFLICT, "이미 사용 중인 전화번호입니다.");
        }

        emailVerificationRepository
                .findTopByEmailAndIsUsedTrueOrderByCreatedAtDesc(request.getEmail())
                .orElseThrow(() -> new CustomException(HttpStatus.FORBIDDEN, "이메일 인증이 필요합니다"));

        phoneVerificationRepository
                .findTopByPhoneNumberAndIsUsedTrueOrderByCreatedAtDesc(request.getPhoneNumber())
                .orElseThrow(() -> new CustomException(HttpStatus.BAD_REQUEST, "전화번호 인증이 필요합니다."));

        Member member = memberRepository.findByEmail(request.getEmail())
                .map(existing -> {                    // 과거 가입 이력이 존재할 때
                    existing.reactivate(
                            passwordEncoder.encode(request.getPassword()),
                            request.getNickname(),
                            request.getDepartment(),
                            request.getPhoneNumber()
                    );
                    return existing;
                })
                .orElseGet(() -> {
                    Member newMember = memberRepository.save(Member.builder()
                            .email(request.getEmail())          // 신규 가입일 때
                            .password(passwordEncoder.encode(request.getPassword()))
                            .nickname(request.getNickname())
                            .department(request.getDepartment())
                            .phoneNumber(request.getPhoneNumber())
                            .build());
                    newMember.verify();
                    newMember.addPoints(50);
                    return newMember;
                });

        return SignupResponse.builder()
                .accessToken(jwtUtil.generateToken(member.getEmail()))
                .nickname(member.getNickname())
                .points(member.getPoints())
                .build();

    }

    @Transactional
    public LoginResponse login(LoginRequest request) {

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 이메일입니다."));

        if (!member.isVerified()){
            throw new CustomException(HttpStatus.FORBIDDEN, "이메일 인증이 필요합니다.");
        }

        if(!member.isActive()) {
            throw new CustomException(HttpStatus.FORBIDDEN, "탈퇴한 회원입니다.");
        }

        if(!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new CustomException(HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다.");
        }

        String accessToken = jwtUtil.generateToken(member.getEmail());
        String refreshTokenValue = UUID.randomUUID().toString();

        refreshTokenRepository.deleteByEmail(member.getEmail());
        refreshTokenRepository.save(RefreshToken.builder()
                .email(member.getEmail())
                .token(refreshTokenValue)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshExpiration / 1000))
                .build());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenValue)
                .nickname(member.getNickname())
                .points(member.getPoints())
                .build();
    }

    @Transactional
    public LoginResponse refreshAccessToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new CustomException(HttpStatus.UNAUTHORIZED, "유효하지 않은 Refresh Token입니다."));

        if (refreshToken.isExpired()) {
            refreshTokenRepository.delete(refreshToken);
            throw new CustomException(HttpStatus.UNAUTHORIZED, "만료된 Refresh Token입니다. 다시 로그인해주세요.");
        }

        Member member = memberRepository.findByEmail(refreshToken.getEmail())
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));

        if (!member.isActive()) {
            throw new CustomException(HttpStatus.FORBIDDEN, "탈퇴한 회원입니다.");
        }

        String newAccessToken = jwtUtil.generateToken(member.getEmail());
        String newRefreshToken = UUID.randomUUID().toString();

        // 보안을 위해 기존 토큰 폐기 후 새 토큰 발급 (Refresh Token Rotation)
        refreshTokenRepository.delete(refreshToken);
        refreshTokenRepository.save(RefreshToken.builder()
                .email(member.getEmail())
                .token(newRefreshToken)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshExpiration / 1000))
                .build());

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .nickname(member.getNickname())
                .points(member.getPoints())
                .build();
    }

    // 이메일 + 번호 일치 확인 후 SMS 발송
    @Transactional
    public void sendPasswordResetSms(String email, String phoneNumber) {
        memberRepository.findByEmailAndPhoneNumber(email, phoneNumber)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "이메일 또는 전화번호가 일치하지 않습니다."));

        phoneVerificationService.sendCode(phoneNumber);
    }

    // 비밀번호 일치 확인 + 본인 확인 + 비밀번호 변겅
    @Transactional
    public void resetPassword(PasswordResetRequest request) {
        if (!request.getNewPassword().equals(request.getNewPasswordConfirm())) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "비밀번호가 일치하지 않습니다.");
        }

        PhoneVerification verification = phoneVerificationRepository.findTopByPhoneNumberAndIsUsedTrueOrderByIdDesc(request.getPhoneNumber())
                .orElseThrow(() -> new CustomException(HttpStatus.FORBIDDEN, "휴대폰 인증이 필요합니다."));

        // 인증 후 5분 이내에만 변경 가능
        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new CustomException(HttpStatus.FORBIDDEN, "인증이 만료되었습니다. 다시 인증해주세요.");
        }

        Member member = memberRepository.findByPhoneNumber(request.getPhoneNumber())
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));

        if (passwordEncoder.matches(request.getNewPassword(), member.getPassword())) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "이전 비밀번호와 동일합니다.");
        }

        member.updatePassword(passwordEncoder.encode(request.getNewPassword()));
        phoneVerificationRepository.deleteByPhoneNumber(request.getPhoneNumber());
    }

    // 1. 내 정보 조회
    @Transactional(readOnly = true)
    public UserResponse getMe(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));
        return UserResponse.from(member);
    }

    // 2. 닉네임 변경
    @Transactional
    public UserResponse updateNickname(String email, UpdateNicknameRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));
        member.updateNickname(request.getNickname());
        return UserResponse.from(member);
    }

    // 3. 학과 변경
    @Transactional
    public UserResponse updateDepartment(String email, UpdateDepartmentRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));
        member.updateDepartment(request.getDepartment());
        return UserResponse.from(member);
    }

    // 4. 비밀번호 변경 (로그인 상태에서)
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));

        if (!passwordEncoder.matches(request.getCurrentPassword(), member.getPassword())) {
            throw new CustomException(HttpStatus.UNAUTHORIZED, "현재 비밀번호가 일치하지 않습니다.");
        }
        if (passwordEncoder.matches(request.getNewPassword(), member.getPassword())) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "이전 비밀번호와 동일합니다.");
        }

        member.updatePassword(passwordEncoder.encode(request.getNewPassword()));
    }

    // 5. 전화번호 변경 (인증코드 확인 후)
    @Transactional
    public UserResponse changePhone(String email, ChangePhoneRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));

        // 인증코드 확인 (기존 PhoneVerificationService 재활용)
        phoneVerificationService.verifyCode(request.getPhoneNumber(), request.getVerificationCode());

        if (memberRepository.existsByPhoneNumberAndIsActiveTrue(request.getPhoneNumber())) {
            throw new CustomException(HttpStatus.CONFLICT, "이미 사용 중인 전화번호입니다.");
        }

        member.updatePhoneNumber(request.getPhoneNumber());
        return UserResponse.from(member);
    }

    // 6. 열람권 구매 (-50P, PointHistory 기록)
    @Transactional
    public UserResponse purchasePass(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));

        if (member.getPoints() < 50) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "포인트가 부족합니다.");
        }

        member.deductPoints(50);
        member.extendPass(30);

        pointHistoryRepository.save(PointHistory.builder()
                .member(member)
                .description("열람권 구매")
                .points(-50)
                .build());

        return UserResponse.from(member);
    }

    // 7. 회원탈퇴 (소프트 딜리트)
    @Transactional
    public void deleteAccount(String email, DeleteAccountRequest request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."));

        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new CustomException(HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다.");
        }

        member.deactivate();
    }
}
