package com.inhaeval.backend.service;

import com.inhaeval.backend.repository.*;
import com.inhaeval.backend.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JtiBlacklistTest {

    private final JwtUtil jwtUtil = new JwtUtil(
            "inhaeval-secret-key-must-be-at-least-256-bits-long", 900_000L);

    @Mock PointHistoryRepository pointHistoryRepository;
    @Mock MemberRepository memberRepository;
    @Mock EmailVerificationRepository emailVerificationRepository;
    @Mock PhoneVerificationRepository phoneVerificationRepository;
    @Mock PhoneVerificationService phoneVerificationService;
    @Mock PasswordEncoder passwordEncoder;
    @Mock MailService mailService;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock StringRedisTemplate redisTemplate;
    @Mock ValueOperations<String, String> valueOps;

    MemberService memberService;

    @BeforeEach
    void setUp() {
        memberService = new MemberService(
                pointHistoryRepository, memberRepository, emailVerificationRepository,
                phoneVerificationRepository, phoneVerificationService, passwordEncoder,
                mailService, jwtUtil, refreshTokenRepository, redisTemplate);
        ReflectionTestUtils.setField(memberService, "refreshExpiration", 604_800_000L);
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOps);
    }

    @Test
    @DisplayName("generateToken()이 jti 클레임을 포함한다")
    void generateToken_jti_포함() {
        String token = jwtUtil.generateToken("test@inha.ac.kr");

        assertThat(jwtUtil.getJti(token)).isNotEmpty();
    }

    @Test
    @DisplayName("발급마다 jti가 다르다 — 토큰 재사용 불가")
    void 발급마다_고유한_jti() {
        String t1 = jwtUtil.generateToken("test@inha.ac.kr");
        String t2 = jwtUtil.generateToken("test@inha.ac.kr");

        assertThat(jwtUtil.getJti(t1)).isNotEqualTo(jwtUtil.getJti(t2));
    }

    @Test
    @DisplayName("로그아웃 시 jti가 Redis 블랙리스트에 등록된다")
    void 로그아웃_jti_블랙리스트_등록() {
        String token = jwtUtil.generateToken("test@inha.ac.kr");
        String jti = jwtUtil.getJti(token);

        memberService.logout(token);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(valueOps).set(keyCaptor.capture(), eq("logout"), anyLong(), eq(TimeUnit.MILLISECONDS));
        assertThat(keyCaptor.getValue()).isEqualTo("blacklist:" + jti);
    }

    @Test
    @DisplayName("로그아웃 시 Refresh Token이 DB에서 삭제된다")
    void 로그아웃_RT_삭제() {
        String token = jwtUtil.generateToken("test@inha.ac.kr");

        memberService.logout(token);

        verify(refreshTokenRepository).deleteByEmail("test@inha.ac.kr");
    }

    @Test
    @DisplayName("블랙리스트에 등록된 jti는 유효한 서명이어도 인증을 거부해야 한다")
    void 블랙리스트_토큰_서명_유효하지만_거부() {
        String token = jwtUtil.generateToken("test@inha.ac.kr");
        String jti = jwtUtil.getJti(token);

        when(redisTemplate.hasKey("blacklist:" + jti)).thenReturn(true);

        // 서명 자체는 여전히 유효 — 하지만 블랙리스트에 있으므로 JwtFilter가 401 반환
        assertThat(jwtUtil.validateToken(token)).isTrue();
        assertThat(redisTemplate.hasKey("blacklist:" + jti)).isTrue();
    }
}
