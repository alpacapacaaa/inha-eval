# API 명세서

🔓 = 로그인 불필요 / 🔐 = JWT 필요 (Authorization: Bearer {accessToken})

---

## 인증 `/api/auth`

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| POST | `/api/auth/signup` | 회원가입 | 🔓 |
| POST | `/api/auth/login` | 로그인 (accessToken + refreshToken 반환) | 🔓 |
| POST | `/api/auth/refresh` | Access Token 갱신 | 🔓 |
| POST | `/api/auth/email/send` | 이메일 인증 메일 발송 | 🔓 |
| GET | `/api/auth/email/verify?token=` | 이메일 인증 확인 | 🔓 |
| POST | `/api/auth/phone/send` | SMS 인증 발송 | 🔓 |
| POST | `/api/auth/phone/verify` | SMS 인증 확인 | 🔓 |
| POST | `/api/auth/password/send` | 비밀번호 재설정용 SMS 발송 | 🔓 |
| POST | `/api/auth/password/verify` | 비밀번호 재설정 인증번호 확인 | 🔓 |
| POST | `/api/auth/password/reset` | 비밀번호 재설정 | 🔓 |

---

## 내 정보 `/api/users/me`

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| GET | `/api/users/me` | 내 정보 조회 | 🔐 |
| PATCH | `/api/users/me/nickname` | 닉네임 변경 | 🔐 |
| PATCH | `/api/users/me/department` | 학과 변경 | 🔐 |
| PATCH | `/api/users/me/password` | 비밀번호 변경 (로그인 상태) | 🔐 |
| PATCH | `/api/users/me/phone` | 전화번호 변경 | 🔐 |
| POST | `/api/users/me/pass` | 열람권 구매 (-50P) | 🔐 |
| DELETE | `/api/users/me` | 회원탈퇴 | 🔐 |

---

## 강의 `/api/courses`

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| GET | `/api/courses` | 전체 강의 목록 | 🔓 |
| GET | `/api/courses/{id}` | 강의 상세 조회 | 🔓 |
| GET | `/api/courses/search?query=&department=` | 강의 검색 | 🔓 |
| GET | `/api/courses/{id}/stats` | 강의 스탯 평균 조회 | 🔓 |
| GET | `/api/courses/famous` | 명강의 (평점 상위 5개) | 🔓 |
| GET | `/api/courses/honey-ge` | 꿀교양 (교양 평점 상위 3개) | 🔓 |
| GET | `/api/courses/verified` | 검증된 강의 (리뷰 많은 순 5개) | 🔓 |
| GET | `/api/courses/growth` | 성장형 강의 (전공 평점 상위 5개) | 🔓 |
| GET | `/api/courses/filter?generalArea=&evaluationType=` | 교양 영역/평가방식 필터 | 🔓 |

---

## 강의평가 `/api/reviews`

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| POST | `/api/reviews` | 강의평가 작성 (+30P) | 🔐 |
| GET | `/api/reviews/course/{courseId}?sort=` | 특정 강의 평가 목록 | 🔓 |
| GET | `/api/reviews/my` | 내가 쓴 평가 목록 | 🔐 |
| DELETE | `/api/reviews/{reviewId}` | 평가 삭제 (본인만) | 🔐 |
| POST | `/api/reviews/{reviewId}/like` | 좋아요 토글 | 🔐 |

> `sort` 파라미터: `latest`(기본) / `highest` / `lowest` / `likes`

---

## 시간표 `/api/timetable`

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| GET | `/api/timetable` | 내 시간표 전체 조회 | 🔐 |
| PUT | `/api/timetable/{planKey}` | 특정 플랜 저장 (cart/A/B/C) | 🔐 |

---

## 포인트 `/api/points`

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| GET | `/api/points/history` | 포인트 내역 조회 | 🔐 |

---

## 공지사항 `/api/notices`

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| GET | `/api/notices` | 공지사항 목록 | 🔓 |

---

## 문의 `/api/inquiries`

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| POST | `/api/inquiries` | 문의 제출 | 🔐 |
| GET | `/api/inquiries/my` | 내 문의 목록 | 🔐 |
