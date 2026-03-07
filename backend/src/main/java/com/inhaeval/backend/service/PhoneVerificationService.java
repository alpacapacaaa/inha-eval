package com.inhaeval.backend.service;

import com.inhaeval.backend.domain.PhoneVerification;
import com.inhaeval.backend.exception.CustomException;
import com.inhaeval.backend.repository.PhoneVerificationRepository;
import lombok.RequiredArgsConstructor;
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

    @Transactional
    public void sendCode(String phoneNumber) {
        String code = generateCode();       // 6자리 랜덤 인증번호 생성

        PhoneVerification verification = PhoneVerification.builder()
                .phoneNumber(phoneNumber)
                .code(code)
                .isUsed(false)
                .expiresAt(LocalDateTime.now().plusMinutes(5))      // 5분 후 만료
                .build();

        phoneVerificationRepository.save(verification);     // DB 저장
        smsService.sendSms(phoneNumber, code);              // 문자 발송
    }

    @Transactional
    public void verifyCode(String phoneNumber, String code) {
        PhoneVerification verification = phoneVerificationRepository.findByPhoneNumberAndCode(phoneNumber, code)
                .orElseThrow(() -> new CustomException(HttpStatus.BAD_REQUEST, "인증번호가 일치하지 않습니다."));

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
