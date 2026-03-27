package com.inhaeval.backend.repository;

import com.inhaeval.backend.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long>{

    Optional<Member> findByEmail(String email);   // 로그인 시 회원 조회
    Optional<Member> findByEmailAndPhoneNumber(String email, String phoneNumber);
    Optional<Member> findByPhoneNumber(String phoneNumber);
    boolean existsByEmailAndIsActiveTrue(String email);      // 활성화 + 중복 이메일 확인
    boolean existsByPhoneNumberAndIsActiveTrue(String phoneNumber);     // 활성화 + 중복 번호 확인
}
