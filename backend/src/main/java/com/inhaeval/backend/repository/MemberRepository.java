package com.inhaeval.backend.repository;

import com.inhaeval.backend.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long>{
    boolean existsByEmail(String email);          // 회원가입 시 이메일 중복 확인
    boolean existsByStudentId(String studentId);  // 회원가입 시 학번 중복 확인
    Optional<Member> findByEmail(String email);   // 로그인 시 회원 조회
}
