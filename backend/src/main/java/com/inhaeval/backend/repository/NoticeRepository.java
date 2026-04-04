package com.inhaeval.backend.repository;

import com.inhaeval.backend.domain.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    List<Notice> findAllByOrderByIsImportantDescCreatedAtDesc();
}
