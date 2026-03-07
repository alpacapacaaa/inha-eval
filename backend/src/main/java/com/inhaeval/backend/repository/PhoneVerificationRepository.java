package com.inhaeval.backend.repository;

import com.inhaeval.backend.domain.PhoneVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PhoneVerificationRepository extends JpaRepository<PhoneVerification, Long> {
    Optional<PhoneVerification> findByPhoneNumberAndCode(String phoneNumber, String code);
}