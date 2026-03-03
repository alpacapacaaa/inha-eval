# 인하대 강의평가 사이트 백엔드

## 기술 스택
- Spring Boot 4.0.3 / Java 21 / MySQL / JPA / Lombok
- Spring Security + JWT (예정)

## 패키지 구조
com.inhaeval.backend
├── domain/        (Member, EmailVerification)
├── repository/    (MemberRepository, EmailVerificationRepository)
├── dto/           (SignupRequest, SignupResponse, LoginRequest, LoginResponse)
├── service/       (MemberService, MailService)
└── controller/    (AuthController - 작성 예정)

## 완료된 것
- Member 엔티티, MemberRepository
- EmailVerification 엔티티, EmailVerificationRepository
- SignupRequest / SignupResponse / LoginRequest / LoginResponse DTO
- MemberService (회원가입 로직 - 중복검증, BCrypt 암호화, DB저장, 토큰생성)
- MailService (Gmail SMTP, HTML 인증 메일 발송)

## 설계 결정사항
- 회원가입 플로우:
  POST /api/auth/signup
  → 이메일/학번 중복 검증
  → Member 저장 (isActive = false)
  → UUID 토큰 생성 → EmailVerification 저장
  → 인증 메일 발송
  → GET /api/auth/verify?token=
  → 토큰 유효성 검증 (만료 30분 체크)
  → Member isActive = true 활성화

- 비밀번호: BCrypt 암호화
- 포인트: 가입 시 0점, 인증 완료 시 +50P
- 토큰: EmailVerification 별도 테이블 관리
- 닉네임: 2~6자 / 학번: 8자리 숫자

## 지금 작성할 것 (순서대로)
1. EmailVerificationService - 토큰 검증 및 Member 활성화
2. AuthController - POST /api/auth/signup, GET /api/auth/verify?token=

## 이후 Phase 3
3. JwtUtil - JWT 토큰 생성/검증
4. SecurityConfig - Spring Security 설정
5. JwtFilter - OncePerRequestFilter 상속
6. MemberService - 로그인 로직 추가
7. AuthController - POST /api/auth/login 추가

## 예외처리 (별도)
8. CustomException
9. GlobalExceptionHandler

## 시작 전 요청
기존 파일들 (Member.java, EmailVerification.java, MemberService.java 등)
먼저 읽고 구조 파악 후 작성 시작해줘