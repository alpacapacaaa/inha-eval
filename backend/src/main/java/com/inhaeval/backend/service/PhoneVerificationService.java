package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.PhoneVerification;
import com.inhaeval.backend.exception.CustomException;
import com.inhaeval.backend.repository.MemberRepository;
import com.inhaeval.backend.repository.PhoneVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class PhoneVerificationService {

    private final PhoneVerificationRepository phoneVerificationRepository;
    private final SmsService smsService;
    private final MemberRepository memberRepository;

    @Value("${app.sms.test-mode:false}")
    private boolean testMode;

    // 회원가입용 - 중복 체크 포함
    @Transactional
    public void sendCodeForSignup(String phoneNumber) {
        if (memberRepository.existsByPhoneNumberAndIsActiveTrue(phoneNumber)) {
            throw new CustomException(HttpStatus.CONFLICT, "이미 사용 중인 전화번호입니다.");
        }
        sendCode(phoneNumber);
    }

    @Transactional
    public void sendCode(String phoneNumber) {
        String code = testMode ? "123456" : generateCode();   // 6자리 랜덤 인증번호 생성

        phoneVerificationRepository.findTopByPhoneNumberOrderByCreatedAtDesc(phoneNumber)
                .ifPresent(v -> {
                    if (v.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(1))) {
                        throw new CustomException(HttpStatus.TOO_MANY_REQUESTS, "1분 후 다시 시도해주세요.");
                    }
                });

        phoneVerificationRepository.deleteByPhoneNumber(phoneNumber);

        PhoneVerification verification = PhoneVerification.builder()
                .phoneNumber(phoneNumber)
                .code(code)
                .isUsed(false)
                .expiresAt(LocalDateTime.now().plusMinutes(5))      // 5분 후 만료
                .build();

        phoneVerificationRepository.save(verification);     // DB 저장
        if (!testMode) {
            smsService.sendSms(phoneNumber, code);
        }          // 문자 발송
    }

    @Transactional
    public void verifyCode(String phoneNumber, String code) {
        PhoneVerification verification = phoneVerificationRepository.findTopByPhoneNumberOrderByCreatedAtDesc(phoneNumber)
                .orElseThrow(() -> new CustomException(HttpStatus.BAD_REQUEST, "인증번호가 일치하지 않습니다."));

        if (verification.getFailCount() >= 5) {
            throw new CustomException(HttpStatus.TOO_MANY_REQUESTS, "인증 시도 횟수를 초과했습니다. 재발송해주세요.");
        }

        if (!verification.getCode().equals(code)) {
            verification.increaseFailCount();
            throw new CustomException(HttpStatus.BAD_REQUEST, "인증번호가 일치하지 않습니다.");
        }

        if (verification.isUsed()) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "이미 사용된 인증번호입니다.");
        }

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new CustomException(HttpStatus.BAD_REQUEST, "만료된 인증번호입니다.");
        }

        verification.use();
    }

    private String generateCode() {
        return String.format("%06d", new Random().nextInt(1000000));
    }
}
