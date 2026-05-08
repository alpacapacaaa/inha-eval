package com.inhaeval.backend.controller;

import com.inhaeval.backend.dto.*;
import com.inhaeval.backend.service.EmailVerificationService;
import com.inhaeval.backend.service.PhoneVerificationService;
import com.inhaeval.backend.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final MemberService memberService;
    private final EmailVerificationService emailVerificationService;
    private final PhoneVerificationService phoneVerificationService;

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request){
        SignupResponse response = memberService.signup(request);
        return ResponseEntity.ok(response);
    }
    // 로그인
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request){
        LoginResponse response = memberService.login(request);
        return ResponseEntity.ok(response);
    }

    // 이메일 인증 메일 발송
    @PostMapping("/email/send")
    public ResponseEntity<Void> sendEmail(@RequestBody @Valid EmailSendRequest request) {
        memberService.sendVerificationEmail(request.getEmail());
        return ResponseEntity.ok().build();
    }

    // 이메일 인증 확인
    @GetMapping("/email/verify")
    public ResponseEntity<Void> verifyEmail(@RequestParam String token) {
        emailVerificationService.verifyToken(token);
        return ResponseEntity.ok().build();
    }

    // SMS 인증 발송
    @PostMapping("/phone/send")
    public ResponseEntity<Void> sendSms(@RequestBody @Valid PhoneSendRequest request) {
        phoneVerificationService.sendCodeForSignup(request.getPhoneNumber());
        return ResponseEntity.ok().build();
    }

    // SMS 인증 확인
    @PostMapping("/phone/verify")
    public ResponseEntity<Void> verifySms(@RequestBody @Valid PhoneVerifyRequest request) {
        phoneVerificationService.verifyCode(request.getPhoneNumber(), request.getCode());
        return ResponseEntity.ok().build();
    }

    // 이메일+번호 확인 후 SMS 발송
    @PostMapping("/password/send")
    public ResponseEntity<Void> sendPasswordResetSms(@RequestBody @Valid PasswordSendRequest request) {
        memberService.sendPasswordResetSms(request.getEmail(), request.getPhoneNumber());
        return ResponseEntity.ok().build();
    }

    // 인증번호 검증
    @PostMapping("/password/verify")
    public ResponseEntity<Void> verifyPasswordReset(@RequestBody @Valid PasswordVerifyRequest request) {
        phoneVerificationService.verifyCode(request.getPhoneNumber(), request.getCode());
        return ResponseEntity.ok().build();
    }

    // 비밀번호 변경
    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@RequestBody @Valid PasswordResetRequest request) {
        memberService.resetPassword(request);
        return ResponseEntity.ok().build();
    }

    // Access Token 갱신
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(memberService.refreshAccessToken(request.getRefreshToken()));
    }
}
