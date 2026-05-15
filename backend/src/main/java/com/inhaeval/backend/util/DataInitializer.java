package com.inhaeval.backend.util;

import com.inhaeval.backend.domain.Course;
import com.inhaeval.backend.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.seed.test-courses", havingValue = "true")
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final CourseRepository courseRepository;

    @Override
    public void run(String... args) throws Exception {
        // 1. 객체지향프로그래밍 1 (전공, 평점 4.5)
        courseRepository.save(Course.builder()
                .name("객체지향프로그래밍 1")
                .professor("이강의")
                .department("컴퓨터공학과")
                .category("전공")
                .type("전공필수")
                .credits(3)
                .section("001")
                .semester("26-1")
                .rating(4.5f)
                .reviewCount(50)
                .build());

        // 2. 알고리즘설계 (전공, 평점 4.2)
        courseRepository.save(Course.builder()
                .name("알고리즘설계")
                .professor("홍길동")
                .department("컴퓨터공학과")
                .category("전공")
                .type("전공필수")
                .credits(3)
                .section("001")
                .semester("25-2")
                .rating(4.2f)
                .reviewCount(23)
                .build());

        // 3. 인문학적 사고와 글쓰기 (교양, 평점 4.0 - 꿀교양!)
        courseRepository.save(Course.builder()
                .name("인문학적 사고와 글쓰기")
                .professor("문학광")
                .department("교양학부")
                .category("교양")
                .type("핵심교양-1")
                .credits(2)
                .section("001")
                .semester("26-1")
                .rating(4.0f)
                .reviewCount(120)
                .build());

        log.info("테스트용 강의 데이터 3개가 생성되었습니다.");
    }
}
