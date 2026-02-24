package com.inhaeval.backend.repository;

import com.inhaeval.backend.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long>{
    boolean existsByEmail(String email);
    boolean existsByStudentId(String studentId);
    Optional<Member> findByEmail(String email);

}
