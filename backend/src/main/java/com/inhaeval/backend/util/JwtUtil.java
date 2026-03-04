package com.inhaeval.backend.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expiration;

    public JwtUtil(@Value("${jwt.secret}") String secret,
                   @Value("${jwt.expiration}") long expiration) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());   // secret 문자열 -> byte[] 변환
        this.expiration = expiration;
    }

    // 토큰 생성
    public String generateToken(String email) {
        return Jwts.builder()
                .subject(email)         // 페이로드에 이메일 저장 -> 나중에 getEmail로 꺼낼 수 있음
                .issuedAt(new Date())   // 토큰 발급 시간 저장 (현재 시간)
                .expiration(new Date(System.currentTimeMillis() + expiration))  // 시간을 숫자로 다룸 LocalDateTime.now()랑 다름
                .signWith(key)  // SecretKey로 서명 -> 토큰 변조 방지
                .compact();     // JWT 문자열로 변환
    }

    // 토큰에서 이메일 추출
    public String getEmail(String token) {
        return getClaims(token).getSubject();
    }

    // 토큰 유효성 검증
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()    // JWT 파서 객체 생성
                .verifyWith(key)    // 검증에 쓸 key 등록 (준비)
                .build()    // 파서 완성
                .parseSignedClaims(token)   // 실제 서명 검증 + 파싱 (실행)
                .getPayload();              // 페이로드 부분만 꺼냄 subject / issuedAt / expiration 담겨있음
    }


}